export interface Transaction {
  id?: number;
  transactionDate?: string;
  transactionType: 'SALE' | 'PURCHASE';
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  details?: string;
  productName?: string;
  createdAt?: string;
}
