import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmación';
  @Input() confirmText = 'Aceptar';
  @Input() cancelText = 'Cancelar';

  visible = false;
  message = '¿Estás seguro?';

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  open(message: string, title?: string) {
    this.message = message;
    if (title) this.title = title;
    this.visible = true;
  }

  confirm() {
    this.visible = false;
    this.onConfirm.emit();
  }

  cancel() {
    this.visible = false;
    this.onCancel.emit();
  }
}
