import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import {
  Demande, DEMANDE_STATUS_LABEL, DemandeStatus,
  DEMANDE_PAYMENT_METHOD_LABEL, DemandePaymentMethod,
} from '../../core/models/demande.model';
import { DemandeService } from '../../core/services/demande.service';

@Component({
  selector: 'app-my-demandes',
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, MatIconModule],
  template: `
    <div class="page">
      <h1 class="page-title">Mes demandes de livraison</h1>

      @if (demandes$ | async; as list) {
        @if (list.length === 0) {
          <div class="empty">
            <mat-icon>local_shipping</mat-icon>
            <p>Aucune demande — utilise le bouton camion sur un produit pour en créer une</p>
          </div>
        } @else {
          <div class="list">
            @for (d of list; track d.id) {
              <div class="card">
                <div class="info">
                  <div class="name">{{ d.productName }} <span class="qty">x{{ d.quantity }}</span></div>
                  <div class="trajet">
                    <mat-icon>trip_origin</mat-icon> {{ d.departure }}
                    <mat-icon>arrow_forward</mat-icon> {{ d.destination }}
                  </div>
                  <div class="meta">
                    <mat-icon>phone</mat-icon> {{ d.clientPhone }} — {{ d.createdAt | date:'dd/MM/yyyy HH:mm' }}
                  </div>
                  <div class="badges">
                    <span class="amount-badge">{{ d.amount | number:'1.0-0' }} MRU</span>
                    <span class="payment-badge">{{ paymentLabel(d.paymentMethod) }}</span>
                  </div>
                </div>
                <span class="status-badge" [class]="'status-' + d.status">
                  {{ statusLabel(d.status) }}
                </span>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 800px; }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0 0 24px; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .card {
      background: white; border-radius: 14px; padding: 16px 18px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .name { font-weight: 700; color: #1A1A2E; font-size: 14px; }
    .qty { font-weight: 600; color: #6B7280; }
    .trajet {
      display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
      font-size: 12px; color: #4B5563; margin-top: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .meta {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #6B7280; margin-top: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .badges { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
    .payment-badge {
      display: inline-block;
      background: #F0FDF4; color: #15803D;
      border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700;
    }
    .amount-badge {
      display: inline-block;
      background: #EFF6FF; color: #1D4ED8;
      border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700;
    }
    .status-badge {
      padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; flex-shrink: 0;
      &.status-en_cours { background: #E0E7FF; color: #4338CA; }
      &.status-en_route { background: #CFFAFE; color: #0E7490; }
      &.status-terminee { background: #D1FAE5; color: #065F46; }
      &.status-annulee  { background: #FEE2E2; color: #991B1B; }
    }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 64px; color: #9CA3AF;
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
      p { margin: 0; font-size: 15px; text-align: center; }
    }
    @media (max-width: 599px) {
      .page { padding: 16px; }
      .page-title { font-size: 20px; }
      .card { flex-direction: column; align-items: flex-start; gap: 8px; }
    }
  `],
})
export class MyDemandesComponent {
  private svc  = inject(DemandeService);
  private auth = inject(Auth);

  demandes$: Observable<Demande[]> = this.svc.listMine(this.auth.currentUser?.uid ?? '');

  statusLabel(status: DemandeStatus): string { return DEMANDE_STATUS_LABEL[status]; }
  paymentLabel(method: DemandePaymentMethod): string { return DEMANDE_PAYMENT_METHOD_LABEL[method]; }
}
