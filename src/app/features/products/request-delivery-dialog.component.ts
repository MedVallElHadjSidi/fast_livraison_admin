import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../core/models/product.model';
import { DemandeService } from '../../core/services/demande.service';
import { VendorService } from '../../core/services/vendor.service';

@Component({
  selector: 'app-request-delivery-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Demander une livraison</h2>

    <mat-dialog-content>
      <div class="product-chip">
        <mat-icon>inventory_2</mat-icon>
        <div>
          <div class="product-name">{{ product.name }}</div>
          <div class="product-stock">{{ product.quantity }} en stock</div>
        </div>
      </div>

      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Quantité demandée</mat-label>
          <input matInput type="number" formControlName="quantity" min="1">
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
          <mat-icon>local_shipping</mat-icon>
        }
        Envoyer la demande
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 12px; width: min(360px, 100%); padding-top: 8px; }
    .full { width: 100%; }
    .product-chip {
      display: flex; align-items: center; gap: 10px;
      background: #F9FAFB; border-radius: 12px; padding: 12px 14px;
      margin-bottom: 16px;
      mat-icon { color: #6B7280; }
    }
    .product-name { font-weight: 700; color: #1A1A2E; font-size: 14px; }
    .product-stock { font-size: 12px; color: #6B7280; }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
  `],
})
export class RequestDeliveryDialogComponent {
  private fb        = inject(FormBuilder);
  private svc       = inject(DemandeService);
  private vendorSvc = inject(VendorService);
  private auth      = inject(Auth);
  private snack     = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<RequestDeliveryDialogComponent>);

  product: Product = inject(MAT_DIALOG_DATA).product;

  loading = signal(false);
  error   = signal('');

  form = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Non authentifié');
      const vendor = await firstValueFrom(this.vendorSvc.get(uid));
      await this.svc.create({
        vendorId:    uid,
        vendorName:  vendor.name,
        vendorPhone: vendor.phoneNumber,
        productId:   this.product.id,
        productName: this.product.name,
        quantity:    this.form.value.quantity!,
      });
      this.snack.open('Demande envoyée', '', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : "Erreur lors de l'envoi");
    } finally {
      this.loading.set(false);
    }
  }
}
