import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Driver } from '../../core/models/driver.model';
import {
  Course, CourseStatus,
  COURSE_NEXT_STATUS, COURSE_NEXT_LABEL, COURSE_NEXT_ICON,
  COURSE_CANCELLABLE, COURSE_STATUS_LABEL, courseWhatsAppUrl,
} from '../../core/models/course.model';
import { CourseService } from '../../core/services/course.service';
import { AddCourseDialogComponent } from './add-course-dialog.component';

@Component({
  selector: 'app-driver-courses',
  standalone: true,
  imports: [
    AsyncPipe, DatePipe, DecimalPipe,
    MatTableModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <button mat-icon-button (click)="back()"><mat-icon>arrow_back</mat-icon></button>
        @if (driver$ | async; as driver) {
          <div class="header-info">
            <h1 class="page-title">{{ driver.name ?? 'Sans nom' }}</h1>
            <span class="phone-chip"><mat-icon>phone</mat-icon> {{ driver.phoneNumber }}</span>
            <span class="balance-chip" [class.negative]="driver.balance < 0">
              Solde : {{ driver.balance | number:'1.0-0' }} MRU
            </span>
          </div>
          <button mat-raised-button color="primary" (click)="openAddCourse(driver)">
            <mat-icon>add</mat-icon>
            Nouvelle course
          </button>
        }
      </div>

      @if (courses$ | async; as list) {
        @if (list.length === 0) {
          <div class="empty">
            <mat-icon>local_shipping</mat-icon>
            <p>Aucune course pour ce chauffeur</p>
          </div>
        } @else {
          <div class="table-scroll">
          <table mat-table [dataSource]="list" class="mat-elevation-z2">

            <ng-container matColumnDef="trajet">
              <th mat-header-cell *matHeaderCellDef>Trajet</th>
              <td mat-cell *matCellDef="let c">
                <div class="trajet-dep">{{ c.departure }}</div>
                <div class="trajet-dest"><mat-icon>arrow_downward</mat-icon> {{ c.destination }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="client">
              <th mat-header-cell *matHeaderCellDef>Client</th>
              <td mat-cell *matCellDef="let c">
                <div class="client-phone"><mat-icon>phone</mat-icon> {{ c.clientPhone }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let c">{{ c.date | date:'dd/MM/yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="prix">
              <th mat-header-cell *matHeaderCellDef>Prix</th>
              <td mat-cell *matCellDef="let c"><strong>{{ c.prix | number:'1.0-0' }} MRU</strong></td>
            </ng-container>

            <ng-container matColumnDef="statut">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let c">
                <span class="status-badge" [class]="'status-' + c.status">
                  {{ statusLabel(c.status) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let c">
                <div class="action-btns">
                  <a class="whatsapp-btn" [href]="whatsAppUrl(c)" target="_blank" rel="noopener"
                     aria-label="Partager via WhatsApp" title="Partager via WhatsApp">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.51 1.36 5.03L2 22l5.25-1.38c1.46.8 3.1 1.22 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23zm-4.52 4.7c-.15 0-.4.06-.61.29-.21.24-.8.78-.8 1.9s.82 2.21.93 2.36c.12.15 1.6 2.53 3.97 3.44 1.97.75 2.37.6 2.8.56.43-.04 1.38-.56 1.58-1.1.19-.55.19-1.02.13-1.11-.06-.1-.22-.16-.46-.28-.24-.12-1.4-.7-1.62-.78-.22-.08-.37-.12-.53.12-.16.24-.61.78-.75.93-.14.16-.27.18-.5.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.18-1.4-1.31-1.63-.14-.24-.02-.37.1-.5.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.29-.74-1.76-.19-.46-.39-.4-.53-.4z"/>
                    </svg>
                  </a>
                  @if (canEdit(c.status)) {
                    <button mat-icon-button (click)="openEditCourse(c)" aria-label="Modifier"
                            title="Modifier la course">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                  @if (nextStatus(c.status); as next) {
                    <button mat-stroked-button color="primary"
                            [disabled]="busy() === c.id"
                            (click)="advance(c, next)">
                      <mat-icon>{{ nextIcon(c.status) }}</mat-icon>
                      {{ nextLabel(c.status) }}
                    </button>
                  }
                  @if (canCancel(c.status)) {
                    <button mat-raised-button color="warn"
                            [disabled]="busy() === c.id"
                            (click)="advance(c, 'annulee')">
                      <mat-icon>close</mat-icon>
                      Annuler
                    </button>
                  }
                  @if (c.status === 'terminer') {
                    <span class="done-chip"><mat-icon>check</mat-icon> Terminée</span>
                  }
                  @if (c.status === 'annulee') {
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
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1100px; }
    .page-header {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .header-info { display: flex; align-items: center; gap: 12px; flex: 1; flex-wrap: wrap; }
    .page-title { font-size: 22px; font-weight: 900; color: #1A1A2E; margin: 0; }
    .phone-chip, .balance-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #F3F4F6; border-radius: 20px; padding: 4px 12px;
      font-size: 13px; font-weight: 600; color: #4B5563;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .balance-chip { background: #EFF6FF; color: #1d4ed8; }
    .balance-chip.negative { background: #FEF2F2; color: #dc2626; }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
    table { width: 100%; min-width: 720px; border-radius: 12px; overflow: hidden; }
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
    .status-badge {
      padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
      &.status-en_cours { background: #E0E7FF; color: #4338CA; }
      &.status-accepter { background: #DBEAFE; color: #1D4ED8; }
      &.status-en_route { background: #CFFAFE; color: #0E7490; }
      &.status-a_bord   { background: #EDE9FE; color: #7C3AED; }
      &.status-terminer { background: #D1FAE5; color: #065F46; }
      &.status-annulee  { background: #FEE2E2; color: #991B1B; }
    }
    .action-btns { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .whatsapp-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 50%;
      background: #E7F9EF; color: #25D366; flex-shrink: 0;
      transition: background .2s;
      &:hover { background: #D1F2E0; }
    }
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
      .page-header { gap: 10px; }
      .page-title { font-size: 18px; }
    }
  `],
})
export class DriverCoursesComponent {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private firestore = inject(Firestore);
  private svc       = inject(CourseService);
  private dialog    = inject(MatDialog);
  private snack     = inject(MatSnackBar);

  cols = ['trajet', 'client', 'date', 'prix', 'statut', 'actions'];
  busy = signal<string | null>(null);

  private driverId = this.route.snapshot.paramMap.get('id')!;

  driver$: Observable<Driver> = (docData(
    doc(this.firestore, 'drivers', this.driverId)
  ) as Observable<Record<string, unknown>>).pipe(
    map(d => ({
      uid:         this.driverId,
      phoneNumber: d['phoneNumber'] as string,
      name:        d['name'] as string | undefined,
      status:      (d['status'] as string ?? 'offline') as Driver['status'],
      balance:     (d['balance'] as number ?? 0),
    })),
  );

  courses$: Observable<Course[]> = this.svc.listByDriver(this.driverId);

  statusLabel(status: CourseStatus): string { return COURSE_STATUS_LABEL[status]; }
  nextStatus(status: CourseStatus): CourseStatus | undefined { return COURSE_NEXT_STATUS[status]; }
  nextLabel(status: CourseStatus): string | undefined { return COURSE_NEXT_LABEL[status]; }
  nextIcon(status: CourseStatus): string | undefined { return COURSE_NEXT_ICON[status]; }
  canCancel(status: CourseStatus): boolean { return COURSE_CANCELLABLE.has(status); }
  canEdit(status: CourseStatus): boolean { return COURSE_CANCELLABLE.has(status); }
  whatsAppUrl(course: Course): string { return courseWhatsAppUrl(course); }

  openAddCourse(driver: Driver): void {
    this.dialog.open(AddCourseDialogComponent, {
      width: '95vw',
      maxWidth: '480px',
      disableClose: true,
      data: { driver },
    });
  }

  openEditCourse(course: Course): void {
    this.dialog.open(AddCourseDialogComponent, {
      width: '95vw',
      maxWidth: '480px',
      disableClose: true,
      data: { course },
    });
  }

  async advance(course: Course, status: CourseStatus): Promise<void> {
    this.busy.set(course.id);
    try {
      const { commission } = await this.svc.updateStatus(course.id, status);
      this.snack.open(
        status === 'terminer' ? `Course terminée — ${commission} MRU débités` :
        status === 'annulee'  ? 'Course annulée' :
        `Course → ${this.statusLabel(status)}`,
        '', { duration: 3000 },
      );
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '';
      this.snack.open(msg || 'Erreur lors de la mise à jour', '', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  back(): void { this.router.navigate(['/chauffeurs']); }
}
