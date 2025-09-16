namespace ProductsService.Dtos
{
    public class UpdateStockDto
    {
        public string Operation { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }
}
