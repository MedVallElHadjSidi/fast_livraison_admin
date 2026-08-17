import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Driver } from '../../core/models/driver.model';
import { AddDriverDialogComponent } from './add-driver-dialog.component';
import { CreditDriverDialogComponent } from './credit-driver-dialog.component';
import { DriverLocationDialogComponent } from './driver-location-dialog.component';

@Component({
  selector: 'app-chauffeur-list',
  standalone: true,
  imports: [
    AsyncPipe, DatePipe, DecimalPipe,
    MatTableModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Chauffeurs actifs</h1>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>person_add</mat-icon>
          Ajouter un chauffeur
        </button>
      </div>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Rechercher par numéro de téléphone</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [value]="search()" (input)="search.set($any($event.target).value)"
               placeholder="ex: 22212345678">
        @if (search()) {
          <button matSuffix mat-icon-button (click)="search.set('')" aria-label="Effacer">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      @if (drivers$ | async; as allDrivers) {
        @let list = filter(allDrivers, search());
        @if (allDrivers.length === 0) {
          <div class="empty">
            <mat-icon>two_wheeler</mat-icon>
            <p>Aucun chauffeur enregistré</p>
          </div>
        } @else if (list.length === 0) {
          <div class="empty">
            <mat-icon>search_off</mat-icon>
            <p>Aucun chauffeur pour « {{ search() }} »</p>
          </div>
        } @else {
          <div class="table-scroll">
          <table mat-table [dataSource]="list" class="mat-elevation-z2">

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Chauffeur</th>
              <td mat-cell *matCellDef="let d">
                <div class="name">{{ d.name ?? 'Sans nom' }}</div>
                <div class="phone">{{ d.phoneNumber }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let d">
                <span class="status-dot" [class]="'dot-' + d.status"></span>
                {{ d.status === 'online' ? 'En ligne' : d.status === 'busy' ? 'En course' : 'Hors ligne' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="balance">
              <th mat-header-cell *matHeaderCellDef>Solde</th>
              <td mat-cell *matCellDef="let d">
                <strong [class.negative]="d.balance < 0">{{ d.balance | number:'1.0-0' }} MRU</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="lastSeen">
              <th mat-header-cell *matHeaderCellDef>Dernière activité</th>
              <td mat-cell *matCellDef="let d">
                {{ d.lastSeen ? (d.lastSeen | date:'dd/MM HH:mm') : '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let d">
                <div class="action-btns">
                  <button mat-stroked-button (click)="openLocation(d)">
                    <mat-icon>my_location</mat-icon>
                    Position
                  </button>
                  <button mat-stroked-button (click)="openCourses(d)">
                    <mat-icon>local_shipping</mat-icon>
                    Courses
                  </button>
                  <button mat-stroked-button (click)="openCreditDialog(d)">
                    <mat-icon>add_card</mat-icon>
                    Recharger
                  </button>
                </div>
              </td>
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
    .page { padding: 32px; max-width: 1100px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0; }
    .search-field { width: 100%; max-width: 380px; display: block; margin-bottom: 12px; }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
    table { width: 100%; min-width: 640px; border-radius: 12px; overflow: hidden; }
    .action-btns { display: flex; gap: 8px; }
    .name { font-weight: 700; color: #1A1A2E; }
    .phone { font-size: 12px; color: #6B7280; }
    .negative { color: #EF4444; }
    .status-dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      &.dot-online  { background: #22C55E; }
      &.dot-busy    { background: #F59E0B; }
      &.dot-offline { background: #9CA3AF; }
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
      .search-field { max-width: 100%; }
    }
  `],
})
export class ChauffeurListComponent {
  private firestore = inject(Firestore);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  cols = ['name', 'status', 'balance', 'lastSeen', 'actions'];
  search = signal('');

  drivers$: Observable<Driver[]> = (collectionData(
    collection(this.firestore, 'drivers'), { idField: 'uid' }
  ) as Observable<Record<string, unknown>[]>).pipe(
    map(docs => docs.map(d => ({
      uid:         d['uid'] as string,
      phoneNumber: d['phoneNumber'] as string,
      name:        d['name'] as string | undefined,
      status:      (d['status'] as string ?? 'offline') as Driver['status'],
      balance:     (d['balance'] as number ?? 0),
      lastSeen:    d['lastSeen'] ? new Date(d['lastSeen'] as string) : undefined,
    })))
  );

  filter(drivers: Driver[], query: string): Driver[] {
    const q = query.trim();
    if (!q) return drivers;
    return drivers.filter(d => d.phoneNumber?.includes(q));
  }

  openAddDialog(): void {
    this.dialog.open(AddDriverDialogComponent, {
      width: '95vw',
      maxWidth: '560px',
      maxHeight: '90vh',
      panelClass: 'add-driver-panel',
      disableClose: true,
    });
  }

  openCourses(driver: Driver): void {
    this.router.navigate(['/chauffeurs', driver.uid, 'courses']);
  }

  openLocation(driver: Driver): void {
    this.dialog.open(DriverLocationDialogComponent, {
      width: '95vw',
      maxWidth: '600px',
      data: { driver },
    });
  }

  openCreditDialog(driver: Driver): void {
    this.dialog.open(CreditDriverDialogComponent, {
      width: '95vw',
      maxWidth: '460px',
      disableClose: true,
      data: { driver },
    });
  }
}
