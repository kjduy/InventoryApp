namespace TransactionsService.Dtos;

public class TransactionCreateDto
{
    public string TransactionType { get; set; } = null!;
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Details { get; set; }
}
