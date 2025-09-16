import { Routes } from '@angular/router';
import { ProductsComponent } from './pages/products/products.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'products', component: ProductsComponent },
  { path: 'transactions', component: TransactionsComponent },
  { path: '**', redirectTo: 'products' }
];
