import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Driver } from '../../core/models/driver.model';

export type PaymentMethod = 'bankily' | 'masrivi' | 'sedad';

@Component({
  selector: 'app-credit-driver-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, DecimalPipe,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatRadioModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Recharger le solde</h2>

    <mat-dialog-content>
      <div class="driver-chip">
        <mat-icon>person</mat-icon>
        <div>
          <div class="driver-name">{{ driver.name ?? 'Sans nom' }}</div>
          <div class="driver-phone">{{ driver.phoneNumber }}</div>
        </div>
        <div class="driver-balance">{{ driver.balance | number:'1.0-0' }} MRU</div>
      </div>

      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Montant à créditer</mat-label>
          <mat-icon matPrefix>payments</mat-icon>
          <input matInput type="number" formControlName="amount" min="1">
          <span matSuffix>MRU</span>
        </mat-form-field>

        <div class="section-label">Moyen de paiement</div>
        <mat-radio-group formControlName="paymentMethod" class="method-grp">
          <mat-radio-button value="bankily">Bankily</mat-radio-button>
          <mat-radio-button value="masrivi">Masrivi</mat-radio-button>
          <mat-radio-button value="sedad">Sedad</mat-radio-button>
        </mat-radio-group>

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
          <mat-icon>add_card</mat-icon>
        }
        Créditer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 12px; width: min(380px, 100%); padding-top: 8px; }
    .full { width: 100%; }
    .driver-chip {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      background: #F9FAFB; border-radius: 12px; padding: 12px 14px;
      margin-bottom: 16px;
      mat-icon { color: #6B7280; }
    }
    .driver-name { font-weight: 700; color: #1A1A2E; font-size: 14px; }
    .driver-phone { font-size: 12px; color: #6B7280; }
    .driver-balance { margin-left: auto; font-weight: 800; color: #1565C0; }
    .section-label {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      color: #6B7280; letter-spacing: .5px; margin-top: 4px;
    }
    .method-grp { display: flex; gap: 20px; flex-wrap: wrap; }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
  `],
})
export class CreditDriverDialogComponent {
  private fb        = inject(FormBuilder);
  private functions = inject(Functions);
  private snack     = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<CreditDriverDialogComponent>);
  driver: Driver    = inject(MAT_DIALOG_DATA).driver;

  loading = signal(false);
  error   = signal('');

  form = this.fb.group({
    amount:        [null as number | null, [Validators.required, Validators.min(1)]],
    paymentMethod: ['bankily' as PaymentMethod, Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const v = this.form.value;

    try {
      const fn = httpsCallable<unknown, { balance: number }>(this.functions, 'credit_driver_balance');
      const result = await fn({
        driverId:      this.driver.uid,
        amount:        v.amount,
        paymentMethod: v.paymentMethod,
      });
      this.snack.open(
        `Solde crédité — nouveau solde : ${result.data.balance} MRU`, '', { duration: 4000 },
      );
      this.dialogRef.close(true);
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '';
      this.error.set(msg || 'Erreur lors du crédit');
    } finally {
      this.loading.set(false);
    }
  }
}
