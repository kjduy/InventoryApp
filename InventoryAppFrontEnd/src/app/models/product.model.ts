export interface Product {
  id?: number;
  name: string;
  description: string;
  category: string;
  imageUrl?: string;
  price: number;
  stock: number;
  createdAt?: string;
}
