import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import { LedgerEntry } from '../../core/models/ledger-entry.model';
import { LedgerService } from '../../core/services/ledger.service';

const REASON_LABEL: Record<string, string> = {
  commission_livraison: 'Commission livraison',
  commission_course:    'Commission course',
};

const METHOD_LABEL: Record<string, string> = {
  bankily: 'Bankily',
  masrivi: 'Masrivi',
  sedad:   'Sedad',
};

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    AsyncPipe, DatePipe, DecimalPipe,
    MatTableModule, MatIconModule, MatButtonModule, MatTabsModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <button mat-icon-button (click)="back()"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="page-title">Transactions</h1>
      </div>

      <mat-tab-group>
        <mat-tab label="Débits">
          <ng-template matTabContent>
            @if (debits$ | async; as list) {
              @if (list.length === 0) {
                <div class="empty">
                  <mat-icon>remove_circle_outline</mat-icon>
                  <p>Aucun débit</p>
                </div>
              } @else {
                <div class="table-scroll">
                <table mat-table [dataSource]="list" class="mat-elevation-z2">

                  <ng-container matColumnDef="montant">
                    <th mat-header-cell *matHeaderCellDef>Montant</th>
                    <td mat-cell *matCellDef="let e"><strong class="debit-amount">-{{ e.amount | number:'1.0-0' }} MRU</strong></td>
                  </ng-container>

                  <ng-container matColumnDef="chauffeur">
                    <th mat-header-cell *matHeaderCellDef>Chauffeur</th>
                    <td mat-cell *matCellDef="let e">
                      <div class="driver-name">{{ e.driverName ?? 'Sans nom' }}</div>
                      <div class="driver-phone">{{ e.driverPhone ?? e.driverId ?? '—' }}</div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="raison">
                    <th mat-header-cell *matHeaderCellDef>Raison</th>
                    <td mat-cell *matCellDef="let e">{{ reasonLabel(e.reason) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let e">{{ e.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="debitCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: debitCols;"></tr>
                </table>
                </div>
              }
            }
          </ng-template>
        </mat-tab>

        <mat-tab label="Crédits">
          <ng-template matTabContent>
            @if (credits$ | async; as list) {
              @if (list.length === 0) {
                <div class="empty">
                  <mat-icon>add_circle_outline</mat-icon>
                  <p>Aucun crédit</p>
                </div>
              } @else {
                <div class="table-scroll">
                <table mat-table [dataSource]="list" class="mat-elevation-z2">

                  <ng-container matColumnDef="montant">
                    <th mat-header-cell *matHeaderCellDef>Montant</th>
                    <td mat-cell *matCellDef="let e"><strong class="credit-amount">+{{ e.amount | number:'1.0-0' }} MRU</strong></td>
                  </ng-container>

                  <ng-container matColumnDef="chauffeur">
                    <th mat-header-cell *matHeaderCellDef>Chauffeur</th>
                    <td mat-cell *matCellDef="let e">
                      <div class="driver-name">{{ e.driverName ?? 'Sans nom' }}</div>
                      <div class="driver-phone">{{ e.driverPhone ?? e.driverId ?? '—' }}</div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="methode">
                    <th mat-header-cell *matHeaderCellDef>Moyen de paiement</th>
                    <td mat-cell *matCellDef="let e">
                      @if (e.paymentMethod) {
                        <span class="method-badge">{{ methodLabel(e.paymentMethod) }}</span>
                      } @else {
                        —
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let e">{{ e.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="creditCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: creditCols;"></tr>
                </table>
                </div>
              }
            }
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1100px; }
    .page-header {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 24px;
    }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0; }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 0 0 12px 12px; }
    table { width: 100%; min-width: 620px; }
    .driver-name { font-weight: 700; color: #1A1A2E; font-size: 13px; }
    .driver-phone { font-size: 12px; color: #6B7280; }
    .debit-amount { color: #DC2626; }
    .credit-amount { color: #16A34A; }
    .method-badge {
      background: #EFF6FF; color: #1d4ed8;
      border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 700;
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
export class TransactionListComponent {
  private router = inject(Router);
  private svc    = inject(LedgerService);

  debitCols  = ['montant', 'chauffeur', 'raison', 'date'];
  creditCols = ['montant', 'chauffeur', 'methode', 'date'];

  debits$: Observable<LedgerEntry[]>  = this.svc.listDebits();
  credits$: Observable<LedgerEntry[]> = this.svc.listCredits();

  reasonLabel(reason: string | undefined): string {
    return reason ? (REASON_LABEL[reason] ?? reason) : '—';
  }

  methodLabel(method: string): string {
    return METHOD_LABEL[method] ?? method;
  }

  back(): void { this.router.navigate(['/dashboard']); }
}
