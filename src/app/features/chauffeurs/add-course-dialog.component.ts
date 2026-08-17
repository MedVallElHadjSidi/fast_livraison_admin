import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Driver } from '../../core/models/driver.model';
import { Course } from '../../core/models/course.model';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-add-course-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier la course' : 'Nouvelle course' }}</h2>

    <mat-dialog-content>
      @if (driver) {
        <div class="driver-chip">
          <mat-icon>person</mat-icon>
          <div>
            <div class="driver-name">{{ driver.name ?? 'Sans nom' }}</div>
            <div class="driver-phone">{{ driver.phoneNumber }}</div>
          </div>
        </div>
      } @else if (!editing) {
        <div class="unassigned-note">
          <mat-icon>info</mat-icon>
          Aucun chauffeur assigné pour l'instant — à choisir lors de l'acceptation.
        </div>
      }

      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Numéro du client</mat-label>
          <mat-icon matPrefix>phone</mat-icon>
          <input matInput formControlName="clientPhone" placeholder="ex: 22212345678">
          <mat-hint>Le chauffeur pourra le voir et l'appeler</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Départ</mat-label>
          <mat-icon matPrefix>trip_origin</mat-icon>
          <input matInput formControlName="departure">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Destination</mat-label>
          <mat-icon matPrefix>place</mat-icon>
          <input matInput formControlName="destination">
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="date">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Prix</mat-label>
            <input matInput type="number" formControlName="prix" min="1">
            <span matSuffix>MRU</span>
          </mat-form-field>
        </div>

        @if (error()) {
          <div class="error-box">
            <mat-icon>error_outline</mat-icon>
            {{ error() }}
          </div>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="loading()">Annuler</button>
      <button mat-raised-button color="primary"
              [disabled]="form.invalid || loading()"
              (click)="submit()">
        @if (loading()) {
          <mat-spinner diameter="18" />
        } @else {
          <mat-icon>{{ editing ? 'save' : 'add' }}</mat-icon>
        }
        {{ editing ? 'Enregistrer' : 'Créer la course' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 12px; width: min(420px, 100%); padding-top: 8px; }
    .full { width: 100%; }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; min-width: 0; }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
    .driver-chip {
      display: flex; align-items: center; gap: 10px;
      background: #F9FAFB; border-radius: 12px; padding: 12px 14px;
      margin-bottom: 16px;
      mat-icon { color: #6B7280; }
    }
    .driver-name { font-weight: 700; color: #1A1A2E; font-size: 14px; }
    .driver-phone { font-size: 12px; color: #6B7280; }
    .unassigned-note {
      display: flex; align-items: center; gap: 8px;
      background: #EFF6FF; border: 1px solid #BFDBFE; color: #1d4ed8;
      border-radius: 10px; padding: 10px 14px; font-size: 13px;
      margin-bottom: 16px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    @media (max-width: 380px) {
      .row { flex-direction: column; gap: 0; }
    }
  `],
})
export class AddCourseDialogComponent {
  private fb        = inject(FormBuilder);
  private svc       = inject(CourseService);
  private snack     = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AddCourseDialogComponent>);

  private data: { driver?: Driver; course?: Course } = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};
  driver: Driver | undefined = this.data.driver;
  private course: Course | undefined = this.data.course;
  editing = !!this.course;

  loading = signal(false);
  error   = signal('');

  form = this.fb.group({
    clientPhone: [this.course?.clientPhone ?? '', [Validators.required, Validators.minLength(8)]],
    departure:   [this.course?.departure ?? '', Validators.required],
    destination: [this.course?.destination ?? '', Validators.required],
    date:        [(this.course?.date ?? new Date()).toISOString().slice(0, 10), Validators.required],
    prix:        [this.course?.prix ?? (null as number | null), [Validators.required, Validators.min(1)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const v = this.form.value;

    try {
      if (this.editing) {
        await this.svc.updateInfo(this.course!.id, {
          clientPhone: v.clientPhone!,
          departure:   v.departure!,
          destination: v.destination!,
          date:        new Date(v.date!),
          prix:        v.prix!,
        });
        this.snack.open('Course modifiée', '', { duration: 3000 });
      } else {
        await this.svc.create({
          driverId:    this.driver?.uid,
          driverPhone: this.driver?.phoneNumber,
          driverName:  this.driver?.name,
          clientPhone: v.clientPhone!,
          departure:   v.departure!,
          destination: v.destination!,
          date:        new Date(v.date!),
          prix:        v.prix!,
        });
        this.snack.open('Course créée', '', { duration: 3000 });
      }
      this.dialogRef.close(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement');
    } finally {
      this.loading.set(false);
    }
  }
}
