namespace TransactionsService.Dtos;

public class TransactionDto
{
    public int Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public string TransactionType { get; set; } = null!;
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}
