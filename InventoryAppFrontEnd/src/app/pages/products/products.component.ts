import { Component, OnInit, ViewChild } from '@angular/core';
import { Product } from '../../models/product.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/products.service';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../shared/alerts/alerts.component';
import { ConfirmDialogComponent } from '../../shared/alerts/confirm-dialog.component';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent]
})
export class ProductsComponent implements OnInit {
  @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

  products: Product[] = [];
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];

  form!: FormGroup;
  filterForm!: FormGroup;
  editingProduct: Product | null = null;

  page = 1;
  pageSize = 5;
  totalPages = 1;

  constructor(
    private service: ProductService,
    private fb: FormBuilder,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadProducts();
  }

  private initForms(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(4)]],
      description: [''],
      category: ['', [Validators.required, Validators.minLength(2)]],
      imageUrl: [''],
      price: [null, [Validators.required, Validators.min(0.01)]],
      stock: [null, [Validators.required, Validators.min(1)]]
    });

    this.filterForm = this.fb.group({
      name: [''],
      category: ['']
    });
  }

  loadProducts(): void {
    this.service.getAll().subscribe({
      next: data => {
        this.products = data;
        this.applyFilters();
      },
      error: err => {
          const backendMessage = err?.error?.message || err?.error || 'Error desconocido';
          this.alert.error('Error al cargar productos: ' + backendMessage);
        }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationErrors();
      return;
    }

    const productData = this.form.value;

    const request$ = this.editingProduct
      ? this.service.update(this.editingProduct.id!, productData)
      : this.service.create(productData);

    request$.subscribe({
      next: () => {
        const message = this.editingProduct ? 'Producto actualizado' : 'Producto creado';
        this.alert.success(message);
        this.loadProducts();
        this.cancel();
      },
      error: err => {
          const backendMessage = err?.error?.message || err?.error || 'Error desconocido';
          this.alert.error('Error: ' + backendMessage);
        }
    });
  }

  edit(product: Product): void {
    this.editingProduct = product;
    this.form.patchValue(product);
  }

  cancel(): void {
    this.editingProduct = null;
    this.form.reset();
  }

  delete(id: number): void {
    this.confirmDialog.open('¿Eliminar producto?');
    this.confirmDialog.onConfirm.subscribe(() => {
      this.service.delete(id).subscribe({
        next: () => {
          this.alert.success('Producto eliminado');
          this.loadProducts();
        },
        error: err => {
          const backendMessage = err?.error?.message || err?.error || 'Error desconocido';
          this.alert.error('Error al eliminar: ' + backendMessage);
        }
      });
    });
  }

  applyFilters(): void {
    const { name, category } = this.filterForm.value;
    this.filteredProducts = this.products.filter(p =>
      (!name || p.name.toLowerCase().includes(name.toLowerCase())) &&
      (!category || p.category.toLowerCase().includes(category.toLowerCase()))
    );
    this.page = 1;
    this.updatePagination();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.applyFilters();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize) || 1;
    const start = (this.page - 1) * this.pageSize;
    this.paginatedProducts = this.filteredProducts.slice(start, start + this.pageSize);
  }

  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.updatePagination(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.updatePagination(); } }

  private showValidationErrors(): void {
    const controls = this.form.controls;

    const fieldNames: { [key: string]: string } = {
      name: 'Nombre',
      description: 'Descripción',
      category: 'Categoría',
      imageUrl: 'URL de Imagen',
      price: 'Precio',
      stock: 'Stock'
    };

    for (const key in controls) {
      if (controls[key].invalid) {
        const fieldLabel = fieldNames[key] || key;
        const errors = controls[key].errors;

        if (errors?.['required']) {
          this.alert.error(`El campo "${fieldLabel}" es obligatorio.`);
        } else if (errors?.['min']) {
          const minValue = errors['min'].min;
          this.alert.error(`El campo "${fieldLabel}" debe ser mayor o igual a ${minValue}.`);
        } else if (errors?.['minlength']) {
          this.alert.error(
            `El campo "${fieldLabel}" debe tener al menos ${errors['minlength'].requiredLength} caracteres.`
          );
        }
      }
    }
  }
}
