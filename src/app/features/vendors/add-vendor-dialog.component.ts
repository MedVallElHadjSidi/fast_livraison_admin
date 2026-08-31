import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VendorService } from '../../core/services/vendor.service';

@Component({
  selector: 'app-add-vendor-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Ajouter un vendeur</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nom du vendeur</mat-label>
          <mat-icon matPrefix>storefront</mat-icon>
          <input matInput formControlName="nom">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Numéro de téléphone</mat-label>
          <mat-icon matPrefix>phone</mat-icon>
          <input matInput formControlName="telephone" placeholder="ex: 22212345678">
          <mat-hint>Identifiant de connexion du vendeur</mat-hint>
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
      <button mat-raised-button color="primary"
              [disabled]="form.invalid || loading()"
              (click)="submit()">
        @if (loading()) {
          <mat-spinner diameter="18" />
        } @else {
          <mat-icon>person_add</mat-icon>
        }
        Créer le vendeur
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 12px; width: min(420px, 100%); padding-top: 8px; }
    .full { width: 100%; }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
  `],
})
export class AddVendorDialogComponent {
  private fb        = inject(FormBuilder);
  private svc       = inject(VendorService);
  private snack     = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AddVendorDialogComponent>);

  loading = signal(false);
  error   = signal('');

  form = this.fb.group({
    nom:       ['', Validators.required],
    telephone: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const v = this.form.value;

    try {
      const { pin } = await this.svc.create(v.nom!, v.telephone!);
      this.snack.open(`Vendeur créé — mot de passe : ${pin}`, '', { duration: 8000 });
      this.dialogRef.close(true);
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '';
      this.error.set(msg || 'Erreur lors de la création');
    } finally {
      this.loading.set(false);
    }
  }
}
