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
  Course, ProductOrderStatus,
  PRODUCT_NEXT_STATUS, PRODUCT_NEXT_LABEL, PRODUCT_STATUS_LABEL,
} from '../../core/models/course.model';
import { CourseService } from '../../core/services/course.service';

function toDateInput(d: Date): string { return d.toISOString().slice(0, 10); }

@Component({
  selector: 'app-product-order-list',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule,
    MatTableModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <button mat-icon-button (click)="back()"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="page-title">Commandes produits</h1>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Du</mat-label>
          <input matInput type="date" [(ngModel)]="fromDate">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Au</mat-label>
          <input matInput type="date" [(ngModel)]="toDate">
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
          <mat-icon>inventory_2</mat-icon>
          <p>Aucune commande produit sur cette période</p>
        </div>
      } @else {
        <div class="table-scroll">
        <table mat-table [dataSource]="filtered()" class="mat-elevation-z2">

          <ng-container matColumnDef="produit">
            <th mat-header-cell *matHeaderCellDef>Produit</th>
            <td mat-cell *matCellDef="let c">
              <div class="prod-name">{{ c.productName }}</div>
              <div class="prod-qty">x{{ c.productQuantity }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="client">
            <th mat-header-cell *matHeaderCellDef>Client</th>
            <td mat-cell *matCellDef="let c">{{ c.clientPhone }}</td>
          </ng-container>

          <ng-container matColumnDef="prix">
            <th mat-header-cell *matHeaderCellDef>Prix</th>
            <td mat-cell *matCellDef="let c"><strong>{{ c.prix | number:'1.0-0' }} MRU</strong></td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let c">{{ c.date | date:'dd/MM/yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="statut">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let c">
              <span class="status-badge" [class]="'status-' + c.productStatus">
                {{ statusLabel(c.productStatus!) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c">
              @if (nextLabel(c.productStatus!); as label) {
                <button mat-stroked-button color="primary"
                        [disabled]="busy() === c.id"
                        (click)="advance(c)">
                  {{ label }}
                </button>
              } @else {
                <span class="done-chip"><mat-icon>check</mat-icon> Terminée</span>
              }
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
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0; }
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
      &.status-en_instance .value { color: #92400E; }
      &.status-recue .value { color: #1D4ED8; }
      &.status-envoyer .value { color: #7C3AED; }
      &.status-terminee .value { color: #059669; }
    }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
    table { width: 100%; min-width: 720px; border-radius: 12px; overflow: hidden; }
    .prod-name { font-weight: 700; color: #1A1A2E; font-size: 13px; }
    .prod-qty { font-size: 12px; color: #6B7280; }
    .status-badge {
      padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
      &.status-en_instance { background: #FEF3C7; color: #92400E; }
      &.status-recue       { background: #DBEAFE; color: #1D4ED8; }
      &.status-envoyer     { background: #EDE9FE; color: #7C3AED; }
      &.status-terminee    { background: #D1FAE5; color: #065F46; }
    }
    .done-chip {
      display: inline-flex; align-items: center; gap: 4px;
      color: #059669; font-weight: 700; font-size: 13px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
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
export class ProductOrderListComponent {
  private router = inject(Router);
  private svc    = inject(CourseService);
  private snack  = inject(MatSnackBar);

  cols = ['produit', 'client', 'prix', 'date', 'statut', 'actions'];
  statuses: ProductOrderStatus[] = ['en_instance', 'recue', 'envoyer', 'terminee'];
  busy = signal<string | null>(null);

  fromDate = toDateInput(new Date());
  toDate   = toDateInput(new Date());

  private courses = toSignal(this.svc.listAll(), { initialValue: [] as Course[] });

  private withProduct = computed(() => this.courses().filter(c => !!c.productId));

  filtered = computed(() => {
    const from = new Date(this.fromDate + 'T00:00:00');
    const to   = new Date(this.toDate + 'T23:59:59');
    return this.withProduct().filter(c => c.date >= from && c.date <= to);
  });

  counts = computed(() => {
    const result: Record<ProductOrderStatus, number> = { en_instance: 0, recue: 0, envoyer: 0, terminee: 0 };
    for (const c of this.filtered()) {
      if (c.productStatus) result[c.productStatus]++;
    }
    return result;
  });

  statusLabel(status: ProductOrderStatus): string { return PRODUCT_STATUS_LABEL[status]; }
  nextLabel(status: ProductOrderStatus): string | undefined { return PRODUCT_NEXT_LABEL[status]; }

  resetToday(): void {
    this.fromDate = toDateInput(new Date());
    this.toDate   = toDateInput(new Date());
  }

  async advance(course: Course): Promise<void> {
    const next = PRODUCT_NEXT_STATUS[course.productStatus!];
    if (!next) return;
    this.busy.set(course.id);
    try {
      await this.svc.updateProductStatus(course.id, next);
      this.snack.open(`Commande → ${this.statusLabel(next)}`, '', { duration: 3000 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la mise à jour';
      this.snack.open(msg, '', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  back(): void { this.router.navigate(['/dashboard']); }
}
