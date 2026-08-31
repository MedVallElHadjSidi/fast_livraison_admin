import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { Vendor } from '../../core/models/vendor.model';
import { VendorService } from '../../core/services/vendor.service';
import { AddVendorDialogComponent } from './add-vendor-dialog.component';

@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatTableModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Vendeurs</h1>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>person_add</mat-icon>
          Ajouter un vendeur
        </button>
      </div>

      @if (vendors$ | async; as list) {
        @if (list.length === 0) {
          <div class="empty">
            <mat-icon>storefront</mat-icon>
            <p>Aucun vendeur enregistré</p>
          </div>
        } @else {
          <div class="table-scroll">
          <table mat-table [dataSource]="list" class="mat-elevation-z2">

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Vendeur</th>
              <td mat-cell *matCellDef="let v">
                <div class="name">{{ v.name }}</div>
                <div class="phone">{{ v.phoneNumber }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Créé le</th>
              <td mat-cell *matCellDef="let v">{{ v.createdAt | date:'dd/MM/yyyy' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 900px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0; }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
    table { width: 100%; min-width: 480px; border-radius: 12px; overflow: hidden; }
    .name { font-weight: 700; color: #1A1A2E; }
    .phone { font-size: 12px; color: #6B7280; }
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
export class VendorListComponent {
  private svc    = inject(VendorService);
  private dialog = inject(MatDialog);

  cols = ['name', 'createdAt'];
  vendors$: Observable<Vendor[]> = this.svc.listAll();

  openAddDialog(): void {
    this.dialog.open(AddVendorDialogComponent, {
      width: '95vw',
      maxWidth: '460px',
      disableClose: true,
    });
  }
}
