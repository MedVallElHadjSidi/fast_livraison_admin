import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Demande, DemandeStatus, DemandePaymentMethod,
  DEMANDE_NEXT_STATUS, DEMANDE_NEXT_LABEL, DEMANDE_CANCELLABLE, DEMANDE_STATUS_LABEL,
  DEMANDE_PAYMENT_METHOD_LABEL,
} from '../../core/models/demande.model';
import { DemandeService } from '../../core/services/demande.service';

function toDateInput(d: Date): string { return d.toISOString().slice(0, 10); }

@Component({
  selector: 'app-demande-list',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule,
    MatTableModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <button mat-icon-button (click)="back()"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="page-title">Demandes de livraison</h1>
        <button mat-stroked-button [disabled]="backfilling()" (click)="backfillAmounts()"
                title="Calculer le montant des anciennes demandes qui n'en ont pas">
          <mat-icon>calculate</mat-icon>
          Recalculer les montants manquants
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Du</mat-label>
          <input matInput type="date" [ngModel]="fromDate()" (ngModelChange)="fromDate.set($event)">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Au</mat-label>
          <input matInput type="date" [ngModel]="toDate()" (ngModelChange)="toDate.set($event)">
        </mat-form-field>
        <button mat-stroked-button (click)="resetToday()">Aujourd'hui</button>
      </div>

      <div class="stats-grid">
        @for (status of statuses; track status) {
          <div class="stat-card" [class]="'status-' + status">
            <div class="value">{{ counts()[status] }}</div>
            <div class="label">{{ statusLabel(status) }}</div>
          </div>
        }
      </div>

      @if (filtered().length === 0) {
        <div class="empty">
          <mat-icon>local_shipping</mat-icon>
          <p>Aucune demande sur cette période</p>
        </div>
      } @else {
        <div class="table-scroll">
        <table mat-table [dataSource]="filtered()" class="mat-elevation-z2">

          <ng-container matColumnDef="produit">
            <th mat-header-cell *matHeaderCellDef>Produit</th>
            <td mat-cell *matCellDef="let d">
              <div class="prod-name">{{ d.productName }}</div>
              <div class="prod-qty">x{{ d.quantity }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="vendeur">
            <th mat-header-cell *matHeaderCellDef>Vendeur</th>
            <td mat-cell *matCellDef="let d">
              <div class="vendor-name">{{ d.vendorName }}</div>
              <div class="vendor-phone">{{ d.vendorPhone }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="trajet">
            <th mat-header-cell *matHeaderCellDef>Trajet</th>
            <td mat-cell *matCellDef="let d">
              <div class="trajet-dep">{{ d.departure }}</div>
              <div class="trajet-dest"><mat-icon>arrow_downward</mat-icon> {{ d.destination }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="client">
            <th mat-header-cell *matHeaderCellDef>Client</th>
            <td mat-cell *matCellDef="let d">
              <div class="client-phone"><mat-icon>phone</mat-icon> {{ d.clientPhone }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="montant">
            <th mat-header-cell *matHeaderCellDef>Montant</th>
            <td mat-cell *matCellDef="let d">
              <span class="amount-cell">{{ d.amount | number:'1.0-0' }} MRU</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="paiement">
            <th mat-header-cell *matHeaderCellDef>Paiement</th>
            <td mat-cell *matCellDef="let d">
              <span class="payment-badge">{{ paymentLabel(d.paymentMethod) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let d">{{ d.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
          </ng-container>

          <ng-container matColumnDef="statut">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let d">
              <span class="status-badge" [class]="'status-' + d.status">
                {{ statusLabel(d.status) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let d">
              <div class="action-btns">
                @if (nextLabel(d.status); as label) {
                  <button mat-stroked-button color="primary"
                          [disabled]="busy() === d.id"
                          (click)="advance(d)">
                    {{ label }}
                  </button>
                }
                @if (canCancel(d.status)) {
                  <button mat-stroked-button color="warn"
                          [disabled]="busy() === d.id"
                          (click)="cancel(d)">
                    Annuler
                  </button>
                }
                @if (d.status === 'terminee') {
                  <span class="done-chip"><mat-icon>check</mat-icon> Terminée</span>
                }
                @if (d.status === 'annulee') {
                  <span class="cancelled-chip"><mat-icon>block</mat-icon> Annulée</span>
                }
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1200px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0; flex: 1; }
    .filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 14px; margin-bottom: 24px;
    }
    .stat-card {
      background: white; border-radius: 14px; padding: 18px;
      text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      .value { font-size: 28px; font-weight: 900; }
      .label { font-size: 12px; color: #6B7280; margin-top: 4px; }
      &.status-en_cours .value { color: #4338CA; }
      &.status-en_route .value { color: #0E7490; }
      &.status-terminee .value { color: #059669; }
      &.status-annulee .value  { color: #991B1B; }
    }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
    table { width: 100%; min-width: 1180px; border-radius: 12px; overflow: hidden; }
    .prod-name { font-weight: 700; color: #1A1A2E; font-size: 13px; }
    .prod-qty { font-size: 12px; color: #6B7280; }
    .vendor-name { font-weight: 600; color: #1A1A2E; font-size: 13px; }
    .vendor-phone { font-size: 12px; color: #6B7280; }
    .trajet-dep { font-weight: 700; color: #1A1A2E; font-size: 13px; }
    .trajet-dest {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #6B7280;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .client-phone {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; color: #1A1A2E; font-weight: 600;
      mat-icon { font-size: 15px; width: 15px; height: 15px; color: #6B7280; }
    }
    .payment-badge {
      background: #F0FDF4; color: #15803D;
      border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 700;
    }
    .amount-cell { font-weight: 800; color: #1D4ED8; font-size: 13px; }
    .status-badge {
      padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
      &.status-en_cours { background: #E0E7FF; color: #4338CA; }
      &.status-en_route { background: #CFFAFE; color: #0E7490; }
      &.status-terminee { background: #D1FAE5; color: #065F46; }
      &.status-annulee  { background: #FEE2E2; color: #991B1B; }
    }
    .action-btns { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .done-chip, .cancelled-chip {
      display: inline-flex; align-items: center; gap: 4px;
      font-weight: 700; font-size: 13px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .done-chip { color: #059669; }
    .cancelled-chip { color: #991B1B; }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 64px; color: #9CA3AF;
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
      p { margin: 0; font-size: 16px; }
    }
    @media (max-width: 599px) {
      .page { padding: 16px; }
      .page-title { font-size: 20px; }
    }
  `],
})
export class DemandeListComponent {
  private router = inject(Router);
  private svc    = inject(DemandeService);
  private snack  = inject(MatSnackBar);

  cols = ['produit', 'vendeur', 'trajet', 'client', 'montant', 'paiement', 'date', 'statut', 'actions'];
  statuses: DemandeStatus[] = ['en_cours', 'en_route', 'terminee', 'annulee'];
  busy = signal<string | null>(null);
  backfilling = signal(false);

  fromDate = signal(toDateInput(new Date()));
  toDate   = signal(toDateInput(new Date()));

  private demandes = toSignal(this.svc.listAll(), { initialValue: [] as Demande[] });

  filtered = computed(() => {
    const from = new Date(this.fromDate() + 'T00:00:00');
    const to   = new Date(this.toDate() + 'T23:59:59');
    return this.demandes().filter(d => d.createdAt >= from && d.createdAt <= to);
  });

  counts = computed(() => {
    const result: Record<DemandeStatus, number> = { en_cours: 0, en_route: 0, terminee: 0, annulee: 0 };
    for (const d of this.filtered()) result[d.status]++;
    return result;
  });

  statusLabel(status: DemandeStatus): string { return DEMANDE_STATUS_LABEL[status]; }
  paymentLabel(method: DemandePaymentMethod): string { return DEMANDE_PAYMENT_METHOD_LABEL[method]; }
  nextLabel(status: DemandeStatus): string | undefined { return DEMANDE_NEXT_LABEL[status]; }
  canCancel(status: DemandeStatus): boolean { return DEMANDE_CANCELLABLE.has(status); }

  resetToday(): void {
    this.fromDate.set(toDateInput(new Date()));
    this.toDate.set(toDateInput(new Date()));
  }

  async advance(demande: Demande): Promise<void> {
    const next = DEMANDE_NEXT_STATUS[demande.status];
    if (!next) return;
    await this.runTransition(demande, next);
  }

  async cancel(demande: Demande): Promise<void> {
    await this.runTransition(demande, 'annulee');
  }

  private async runTransition(demande: Demande, status: DemandeStatus): Promise<void> {
    this.busy.set(demande.id);
    try {
      await this.svc.updateStatus(demande.id, status);
      this.snack.open(`Demande → ${this.statusLabel(status)}`, '', { duration: 3000 });
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '';
      this.snack.open(msg || 'Erreur lors de la mise à jour', '', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  async backfillAmounts(): Promise<void> {
    this.backfilling.set(true);
    try {
      const { updated, skipped } = await this.svc.backfillAmounts();
      this.snack.open(
        `${updated} demande(s) mise(s) à jour${skipped ? `, ${skipped} ignorée(s) (produit introuvable)` : ''}`,
        '', { duration: 5000 },
      );
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '';
      this.snack.open(msg || 'Erreur lors du recalcul', '', { duration: 4000 });
    } finally {
      this.backfilling.set(false);
    }
  }

  back(): void { this.router.navigate(['/dashboard']); }
}
