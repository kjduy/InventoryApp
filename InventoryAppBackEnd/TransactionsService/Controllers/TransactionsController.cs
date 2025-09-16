using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using TransactionsService.Data;
using TransactionsService.Dtos;
using TransactionsService.Models;

namespace TransactionsService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly TransactionsDbContext _db;
    private readonly IHttpClientFactory _httpFactory;

    public TransactionsController(TransactionsDbContext db, IHttpClientFactory httpFactory, ILogger<TransactionsController> logger)
    {
        _db = db;
        _httpFactory = httpFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? productId, [FromQuery] string? type,
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 500) pageSize = 20;

        var query = _db.Transactions.AsQueryable();

        if (productId.HasValue) query = query.Where(t => t.ProductId == productId.Value);
        if (!string.IsNullOrEmpty(type)) query = query.Where(t => t.TransactionType == type.ToUpper());
        if (fromDate.HasValue) query = query.Where(t => t.TransactionDate >= fromDate.Value.ToUniversalTime());
        if (toDate.HasValue) query = query.Where(t => t.TransactionDate <= toDate.Value.ToUniversalTime());

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(t => t.TransactionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = new
        {
            Page = page,
            PageSize = pageSize,
            Total = total,
            Items = items.Select(t => new TransactionDto
            {
                Id = t.Id,
                TransactionDate = t.TransactionDate,
                TransactionType = t.TransactionType,
                ProductId = t.ProductId,
                Quantity = t.Quantity,
                UnitPrice = t.UnitPrice,
                TotalPrice = t.TotalPrice,
                Details = t.Details,
                CreatedAt = t.CreatedAt
            })
        };

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await _db.Transactions.FindAsync(id);
        if (t == null) return NotFound();
        return Ok(new TransactionDto
        {
            Id = t.Id,
            TransactionDate = t.TransactionDate,
            TransactionType = t.TransactionType,
            ProductId = t.ProductId,
            Quantity = t.Quantity,
            UnitPrice = t.UnitPrice,
            TotalPrice = t.TotalPrice,
            Details = t.Details,
            CreatedAt = t.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TransactionCreateDto dto)
    {
        if (dto.Quantity <= 0) return BadRequest("La cantidad debe ser mayor que cero.");
        var txType = dto.TransactionType?.Trim().ToUpper();
        if (txType != "PURCHASE" && txType != "SALE") return BadRequest("El tipo de transacción debe ser 'PURCHASE' o 'SALE'.");

        var client = _httpFactory.CreateClient("ProductsService");

        HttpResponseMessage productResp;
        try
        {
            productResp = await client.GetAsync($"{dto.ProductId}");
        }
        catch (Exception ex)
        {
            return StatusCode(503, "Servicio de productos no disponible.");
        }

        if (productResp.StatusCode == HttpStatusCode.NotFound) return BadRequest("Producto no encontrado.");
        if (!productResp.IsSuccessStatusCode) return StatusCode((int)productResp.StatusCode, "Error al recuperar el producto.");

        var product = await productResp.Content.ReadFromJsonAsync<ProductDto>();
        if (product == null) return StatusCode(500, "Datos del producto no válidos.");

        if (txType == "SALE" && dto.Quantity > product.Stock)
            return BadRequest("No hay suficiente stock disponible.");

        var unitPrice = dto.UnitPrice ?? product.Price;
        var transaction = new Transaction
        {
            TransactionDate = DateTime.UtcNow,
            TransactionType = txType,
            ProductId = dto.ProductId,
            Quantity = dto.Quantity,
            UnitPrice = unitPrice,
            TotalPrice = unitPrice * dto.Quantity,
            Details = dto.Details,
            CreatedAt = DateTime.UtcNow
        };

        using var dbTransaction = await _db.Database.BeginTransactionAsync();
        try
        {
            _db.Transactions.Add(transaction);
            await _db.SaveChangesAsync();

            var stockUpdateDto = new
            {
                Operation = txType == "SALE" ? "subtract" : "add",
                Quantity = dto.Quantity
            };

            var adjustResponse = await client.PatchAsJsonAsync($"{dto.ProductId}/stock", stockUpdateDto);

            if (!adjustResponse.IsSuccessStatusCode)
            {
                _db.Transactions.Remove(transaction);
                await _db.SaveChangesAsync();
                await dbTransaction.RollbackAsync();

                var body = await adjustResponse.Content.ReadAsStringAsync();
                return StatusCode((int)adjustResponse.StatusCode, "No se ha podido ajustar el stock en ProductsService.");
            }

            await dbTransaction.CommitAsync();

            var createdDto = new TransactionDto
            {
                Id = transaction.Id,
                TransactionDate = transaction.TransactionDate,
                TransactionType = transaction.TransactionType,
                ProductId = transaction.ProductId,
                Quantity = transaction.Quantity,
                UnitPrice = transaction.UnitPrice,
                TotalPrice = transaction.TotalPrice,
                Details = transaction.Details,
                CreatedAt = transaction.CreatedAt
            };

            return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, createdDto);
        }
        catch (Exception ex)
        {
            try { await dbTransaction.RollbackAsync(); } catch { }
            return StatusCode(500, "Error al guardar la transacción.");
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TransactionCreateDto dto)
    {
        var existing = await _db.Transactions.FindAsync(id);
        if (existing == null) return NotFound();

        var txType = dto.TransactionType?.Trim().ToUpper();
        if (txType != "PURCHASE" && txType != "SALE") return BadRequest("El tipo de transacción debe ser 'PURCHASE' o 'SALE'.");
        if (dto.Quantity <= 0) return BadRequest("La cantidad debe ser mayor que cero.");

        var client = _httpFactory.CreateClient("ProductsService");

        ProductDto oldProduct = null!;
        ProductDto newProduct = null!;

        try
        {
            var oldResp = await client.GetAsync($"{existing.ProductId}");
            if (!oldResp.IsSuccessStatusCode) return StatusCode((int)oldResp.StatusCode, "Error al recuperar el producto original.");
            oldProduct = await oldResp.Content.ReadFromJsonAsync<ProductDto>() ?? throw new Exception("Datos originales del producto no válidos.");

            var newResp = await client.GetAsync($"{dto.ProductId}");
            if (!newResp.IsSuccessStatusCode) return StatusCode((int)newResp.StatusCode, "Error al recuperar el nuevo producto.");
            newProduct = await newResp.Content.ReadFromJsonAsync<ProductDto>() ?? throw new Exception("Datos de nuevo producto no válidos.");
        }
        catch (Exception ex)
        {
            return StatusCode(503, "Servicio de productos no disponible.");
        }

        using var dbTransaction = await _db.Database.BeginTransactionAsync();
        try
        {
            if (existing.ProductId != dto.ProductId)
            {
                var revertOldDto = new
                {
                    Operation = existing.TransactionType == "SALE" ? "add" : "subtract",
                    Quantity = existing.Quantity
                };
                var revertResp = await client.PatchAsJsonAsync($"{existing.ProductId}/stock", revertOldDto);
                if (!revertResp.IsSuccessStatusCode)
                {
                    var body = await revertResp.Content.ReadAsStringAsync();
                    return StatusCode((int)revertResp.StatusCode, "No se ha podido ajustar el stock del producto antiguo.");
                }
            }

            int qtyDiff = dto.Quantity;
            if (existing.ProductId == dto.ProductId)
            {
                qtyDiff = dto.Quantity - existing.Quantity;
            }

            if (txType == "SALE" && qtyDiff > newProduct.Stock)
                return BadRequest("No hay suficiente stock disponible en el producto seleccionado.");

            var adjustNewDto = new
            {
                Operation = (txType == "SALE" ? -1 : 1) * qtyDiff >= 0 ? "add" : "subtract",
                Quantity = Math.Abs((txType == "SALE" ? -1 : 1) * qtyDiff)
            };
            var adjustResp = await client.PatchAsJsonAsync($"{dto.ProductId}/stock", adjustNewDto);
            if (!adjustResp.IsSuccessStatusCode)
            {
                var body = await adjustResp.Content.ReadAsStringAsync();
                return StatusCode((int)adjustResp.StatusCode, "No se ha podido ajustar el stock del nuevo producto.");
            }

            existing.TransactionType = txType;
            existing.ProductId = dto.ProductId;
            existing.Quantity = dto.Quantity;
            existing.UnitPrice = dto.UnitPrice ?? existing.UnitPrice;
            existing.TotalPrice = existing.UnitPrice * existing.Quantity;
            existing.Details = dto.Details;

            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            return Ok(new TransactionDto
            {
                Id = existing.Id,
                TransactionDate = existing.TransactionDate,
                TransactionType = existing.TransactionType,
                ProductId = existing.ProductId,
                Quantity = existing.Quantity,
                UnitPrice = existing.UnitPrice,
                TotalPrice = existing.TotalPrice,
                Details = existing.Details,
                CreatedAt = existing.CreatedAt
            });
        }
        catch (Exception ex)
        {
            try { await dbTransaction.RollbackAsync(); } catch { }
            return StatusCode(500, "Error al actualizar la transacción.");
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _db.Transactions.FindAsync(id);
        if (existing == null) return NotFound();

        var client = _httpFactory.CreateClient("ProductsService");

        var stockUpdateDto = new
        {
            Operation = existing.TransactionType == "SALE" ? "add" : "subtract",
            Quantity = existing.Quantity
        };

        using var dbTransaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var revertResp = await client.PatchAsJsonAsync($"{existing.ProductId}/stock", stockUpdateDto);
            if (!revertResp.IsSuccessStatusCode)
            {
                var body = await revertResp.Content.ReadAsStringAsync();
                return StatusCode((int)revertResp.StatusCode, "No se ha podido revertir el stock en ProductsService.");
            }

            _db.Transactions.Remove(existing);
            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            try { await dbTransaction.RollbackAsync(); } catch { }
            return StatusCode(500, "Error al eliminar la transacción.");
        }
    }
}
