import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AlertsComponent } from './shared/alerts/alerts.component';

@Component({
  selector: 'app-root',
  imports: [RouterModule, AlertsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
