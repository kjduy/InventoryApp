import { Component, OnInit, ViewChild } from '@angular/core';
import { Transaction } from '../../models/transaction.model';
import { Product } from '../../models/product.model';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transactions.service';
import { ProductService } from '../../services/products.service';
import { ConfirmDialogComponent } from '../../shared/alerts/confirm-dialog.component';
import { AlertService } from '../../shared/alerts/alerts.component';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent]
})
export class TransactionsComponent implements OnInit {
  @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];
  products: Product[] = [];
  productMap = new Map<number, Product>();

  form!: FormGroup;
  filterForm!: FormGroup;
  editingTransaction: Transaction | null = null;
  minToDate: string | null = null;

  transactionTypeMap: Record<string, string> = { SALE: 'Venta', PURCHASE: 'Compra' };

  page = 1;
  pageSize = 5;
  totalPages = 1;

  constructor(
    private txService: TransactionService,
    private productService: ProductService,
    private fb: FormBuilder,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadProducts();
    this.loadTransactions();
  }

  private initForms(): void {
    this.form = this.fb.group({
      transactionType: ['SALE', Validators.required],
      productId: [null, [Validators.required, Validators.min(1)]],
      quantity: [null, [Validators.required, Validators.min(1)]],
      unitPrice: [null, [Validators.required, Validators.min(0.1)]],
      details: ['']
    });

    this.filterForm = this.fb.group({
      fromDate: [''],
      toDate: [''],
      transactionType: ['']
    });
  }

  onFromDateChange(): void {
    const from = this.filterForm.get('fromDate')?.value;
    this.minToDate = from || null;
    const toControl = this.filterForm.get('toDate');
    if (toControl?.value && from && toControl.value < from) {
      toControl.setValue(null);
    }
  }

  private resetForm(): void {
    this.editingTransaction = null;
    this.form.reset({ transactionType: 'SALE', quantity: 0, unitPrice: 0, productId: 0, details: '' });
  }

  save(): void {
    if (this.form.invalid) {
      this.showValidationErrors();
      return;
    }

    const tx: Transaction = this.form.value;

    const request$ = this.editingTransaction
      ? this.txService.update(this.editingTransaction.id!, tx)
      : this.txService.create(tx);

    request$.subscribe({
      next: () => {
        this.alert.success(this.editingTransaction ? 'Transacción actualizada' : 'Transacción creada');
        this.loadTransactions();
        this.resetForm();
      },
      error: err => {
        const message = err?.error?.message || err?.error || 'Error desconocido';
        this.alert.error(message);
      }
    });
  }

  edit(tx: Transaction): void {
    this.editingTransaction = tx;
    this.form.patchValue(tx);
  }

  cancel(): void {
    this.resetForm();
  }

  delete(id: number): void {
    this.confirmDialog.open('¿Eliminar transacción?');
    this.confirmDialog.onConfirm.subscribe(() => {
      this.txService.delete(id).subscribe({
        next: () => {
          this.alert.success('Transacción eliminada');
          this.loadTransactions();
        },
        error: err => this.alert.error('Error al eliminar: ' + err.message)
      });
    });
  }

  applyFilters(): void {
    const { fromDate, toDate, transactionType } = this.filterForm.value;

    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    this.filteredTransactions = this.transactions.filter(tx => {
      if (!tx.transactionDate) return false;

      const txDate = new Date(tx.transactionDate);

      const matchesDate =
        (!from || txDate >= from) &&
        (!to || txDate <= to);

      const matchesType =
        !transactionType || tx.transactionType === transactionType;

      return matchesDate && matchesType;
    });

    this.page = 1;
    this.updatePagination();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.filteredTransactions = [...this.transactions];
    this.page = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
    const start = (this.page - 1) * this.pageSize;
    this.paginatedTransactions = this.filteredTransactions.slice(start, start + this.pageSize);
  }

  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.updatePagination(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.updatePagination(); } }

  private loadTransactions(): void {
    this.txService.getAll().subscribe({
      next: res => {
        this.transactions = res.items;
        this.filteredTransactions = [...res.items];
        this.page = 1;
        this.updatePagination();
      },
      error: err => this.alert.error('Error al cargar transacciones: ' + err.message)
    });
  }

  private loadProducts(): void {
    this.productService.getAll().subscribe({
      next: data => {
        this.products = data;
        this.productMap = new Map(data.map(p => [p.id!, p]));
      },
      error: err => this.alert.error('Error al cargar productos: ' + err.message)
    });
  }

  getProductName(productId: number): string {
    return this.productMap.get(productId)?.name ?? 'Desconocido';
  }

  getProductStock(productId: number): number {
    return this.productMap.get(productId)?.stock ?? 0;
  }

  private showValidationErrors(): void {
    const controls = this.form.controls;
    const fieldNames: Record<string, string> = {
      transactionType: 'Tipo de transacción',
      productId: 'Producto',
      quantity: 'Cantidad',
      unitPrice: 'Precio unitario',
      details: 'Detalles'
    };

    for (const key in controls) {
      const control = controls[key];
      if (control.invalid) {
        const label = fieldNames[key] ?? key;
        if (control.errors?.['required']) this.alert.error(`El campo "${label}" es obligatorio.`);
        if (control.errors?.['min']) this.alert.error(`El campo "${label}" debe ser mayor o igual a ${control.errors['min'].min}.`);
      }
    }
  }
}
