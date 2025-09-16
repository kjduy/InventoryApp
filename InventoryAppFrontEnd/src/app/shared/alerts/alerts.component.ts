import { CommonModule } from '@angular/common';
import { Component, Injectable } from '@angular/core';

export type AlertType = 'success' | 'error' | 'info';

export interface AlertMessage {
  id: number;
  type: AlertType;
  text: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  public alerts: AlertMessage[] = [];
  private nextId = 0;

  private removeAlert(id: number) {
    this.alerts = this.alerts.filter(a => a.id !== id);
  }

  private addAlert(text: string, type: AlertType = 'info', duration = 3000) {
    const id = this.nextId++;
    const alert: AlertMessage = { id, text, type, duration };
    this.alerts.push(alert);

    if (duration > 0) {
      setTimeout(() => this.removeAlert(id), duration);
    }
  }

  success(message: string, duration?: number) {
    this.addAlert(message, 'success', duration ?? 3000);
  }

  error(message: string, duration?: number) {
    this.addAlert(message, 'error', duration ?? 3000);
  }

  info(message: string, duration?: number) {
    this.addAlert(message, 'info', duration ?? 3000);
  }

  clearAll() {
    this.alerts = [];
  }
}

@Component({
  selector: 'app-alert',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class AlertsComponent {
  constructor(public alertService: AlertService) {}
}
