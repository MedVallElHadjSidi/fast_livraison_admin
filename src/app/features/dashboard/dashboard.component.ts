import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { COURSE_STATUS_LABEL, CourseStatus } from '../../core/models/course.model';
import { CourseService } from '../../core/services/course.service';

const STATUS_ICON: Record<CourseStatus, string> = {
  en_cours: 'hourglass_empty',
  accepter: 'check_circle',
  en_route: 'navigation',
  a_bord:   'airline_seat_recline_normal',
  terminer: 'flag',
  annulee:  'block',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, MatIconModule],
  template: `
    <div class="page">
      <h1 class="page-title">Tableau de bord</h1>

      @if (driverCount$ | async; as count) {
        <div class="stats-grid drivers-grid">
          <div class="stat-card drivers">
            <mat-icon>two_wheeler</mat-icon>
            <div class="value">{{ count }}</div>
            <div class="label">Chauffeurs</div>
          </div>
        </div>
      }

      @if (courseCounts$ | async; as counts) {
        <h2 class="section-title">Courses par statut</h2>
        <div class="stats-grid">
          @for (status of statuses; track status) {
            <div class="stat-card" [class]="'status-' + status">
              <mat-icon>{{ statusIcon(status) }}</mat-icon>
              <div class="value">{{ counts[status] }}</div>
              <div class="label">{{ statusLabel(status) }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1100px; }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0 0 28px; }
    .section-title { font-size: 16px; font-weight: 700; color: #1A1A2E; margin: 0 0 16px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 36px;
    }
    .drivers-grid { grid-template-columns: minmax(160px, 260px); }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);

      mat-icon { font-size: 32px; height: 32px; width: 32px; }
      .value { font-size: 36px; font-weight: 900; }
      .label { font-size: 13px; color: #6B7280; }

      &.drivers        { mat-icon, .value { color: #1565C0; } }
      &.status-en_cours { mat-icon, .value { color: #4338CA; } }
      &.status-accepter { mat-icon, .value { color: #1D4ED8; } }
      &.status-en_route { mat-icon, .value { color: #0E7490; } }
      &.status-a_bord   { mat-icon, .value { color: #7C3AED; } }
      &.status-terminer { mat-icon, .value { color: #059669; } }
      &.status-annulee  { mat-icon, .value { color: #991B1B; } }
    }

    @media (max-width: 599px) {
      .page { padding: 16px; }
      .page-title { font-size: 20px; margin-bottom: 20px; }
      .stats-grid { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
    }
  `],
})
export class DashboardComponent {
  private firestore = inject(Firestore);
  private courseSvc = inject(CourseService);

  statuses: CourseStatus[] = ['en_cours', 'accepter', 'en_route', 'a_bord', 'terminer', 'annulee'];

  driverCount$: Observable<number> = (collectionData(
    collection(this.firestore, 'drivers')
  ) as Observable<unknown[]>).pipe(
    map(list => list.length),
  );

  courseCounts$: Observable<Record<CourseStatus, number>> = this.courseSvc.listAll().pipe(
    map(courses => {
      const counts = { en_cours: 0, accepter: 0, en_route: 0, a_bord: 0, terminer: 0, annulee: 0 };
      for (const c of courses) counts[c.status]++;
      return counts;
    }),
  );

  statusLabel(status: CourseStatus): string { return COURSE_STATUS_LABEL[status]; }
  statusIcon(status: CourseStatus): string { return STATUS_ICON[status]; }
}
