import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environmentTransaction } from '../../environments/environment';
import { Transaction } from '../models/transaction.model';

export interface TransactionFilters {
  productId?: number;
  transactionType?: 'SALE' | 'PURCHASE';
  fromDate?: string;
  toDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly apiUrl = `${environmentTransaction.apiUrl}/transactions`;

  constructor(private readonly http: HttpClient) {}

  getAll(
    filters?: TransactionFilters,
    page = 1,
    pageSize = 20
  ): Observable<{ items: Transaction[]; total: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<{ items: Transaction[]; total: number }>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/${id}`);
  }

  create(tx: Transaction): Observable<Transaction> {
    return this.http.post<Transaction>(this.apiUrl, tx);
  }

  update(id: number, tx: Transaction): Observable<Transaction> {
    return this.http.put<Transaction>(`${this.apiUrl}/${id}`, tx);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
