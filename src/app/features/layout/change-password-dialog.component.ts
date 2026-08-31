import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass && confirm && pass !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Changer mon mot de passe</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Mot de passe actuel</mat-label>
          <input matInput type="password" formControlName="currentPassword">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Nouveau mot de passe</mat-label>
          <input matInput type="password" formControlName="newPassword">
          <mat-hint>6 caractères minimum</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Confirmer le nouveau mot de passe</mat-label>
          <input matInput type="password" formControlName="confirmPassword">
          @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
            <mat-error>Les mots de passe ne correspondent pas</mat-error>
          }
        </mat-form-field>

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
      <button mat-raised-button color="primary" [disabled]="form.invalid || loading()" (click)="submit()">
        @if (loading()) {
          <mat-spinner diameter="18" />
        } @else {
          <mat-icon>lock_reset</mat-icon>
        }
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; width: min(400px, 100%); }
    .form { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
    .full { width: 100%; }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
  `],
})
export class ChangePasswordDialogComponent {
  private fb = inject(FormBuilder);
  private authSvc = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);

  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    try {
      await this.authSvc.changePassword(
        this.form.value.currentPassword!,
        this.form.value.newPassword!,
      );
      this.snack.open('Mot de passe modifié', '', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      const messages: Record<string, string> = {
        'auth/wrong-password':      'Mot de passe actuel incorrect',
        'auth/invalid-credential':  'Mot de passe actuel incorrect',
        'auth/too-many-requests':   'Trop de tentatives, réessayez plus tard',
        'auth/weak-password':       'Le nouveau mot de passe est trop faible',
      };
      this.error.set((code && messages[code]) || 'Erreur lors du changement de mot de passe');
    } finally {
      this.loading.set(false);
    }
  }
}
