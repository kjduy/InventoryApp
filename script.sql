CREATE DATABASE InventoryDB;
GO

USE InventoryDB;
GO

CREATE TABLE Products (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000) NULL,
    Category NVARCHAR(100) NULL,
    ImageUrl NVARCHAR(500) NULL,
    Price DECIMAL(18,2) NOT NULL CHECK (Price >= 0),
    Stock INT NOT NULL CHECK (Stock >= 0),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL
);
GO

CREATE TABLE InventoryTransactions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TransactionDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    TransactionType NVARCHAR(20) NOT NULL CHECK (TransactionType IN ('PURCHASE','SALE')),
    ProductId INT NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(18,2) NOT NULL CHECK (UnitPrice >= 0),
    TotalPrice AS (Quantity * UnitPrice) PERSISTED,
    Details NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_InventoryTransactions_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);
GO

CREATE INDEX IX_Products_Name ON Products(Name);
CREATE INDEX IX_InventoryTransactions_ProductDate ON InventoryTransactions(ProductId, TransactionDate);
CREATE INDEX IX_InventoryTransactions_TypeDate ON InventoryTransactions(TransactionType, TransactionDate);
GO
