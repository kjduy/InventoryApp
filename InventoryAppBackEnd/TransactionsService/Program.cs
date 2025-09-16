using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using TransactionsService.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<TransactionsDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var productsBase = builder.Configuration.GetValue<string>("ProductsService:BaseUrl");
builder.Services.AddHttpClient("ProductsService", client =>
{
    client.BaseAddress = new Uri(productsBase);
    client.Timeout = TimeSpan.FromSeconds(10);
});
var frontEndBase = builder.Configuration.GetValue<string>("FrontEndBase:BaseUrl");
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular",
        policy =>
        {
            policy.WithOrigins(frontEndBase)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAngular");

app.UseAuthorization();

app.MapControllers();

app.Run();
