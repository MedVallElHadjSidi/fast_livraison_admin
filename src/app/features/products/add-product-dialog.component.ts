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
import { ProductService } from '../../core/services/product.service';
import { VendorService } from '../../core/services/vendor.service';

@Component({
  selector: 'app-add-product-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier le produit' : 'Nouveau produit' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form">

        <div class="image-picker" [class.has-image]="!!imagePreview()" (click)="fileInput.click()">
          <input #fileInput type="file" accept="image/*" style="display:none" (change)="onImageSelected($event)">
          @if (imagePreview()) {
            <img [src]="imagePreview()" alt="">
          } @else {
            <mat-icon>add_photo_alternate</mat-icon>
            <span>Ajouter une image</span>
          }
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Nom du produit</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Prix avec livraison</mat-label>
            <input matInput type="number" formControlName="priceWithDelivery" min="1">
            <span matSuffix>MRU</span>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Quantité</mat-label>
            <input matInput type="number" formControlName="quantity" min="0">
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
        {{ editing ? 'Enregistrer' : 'Créer le produit' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 12px; width: min(420px, 100%); padding-top: 8px; }
    .full { width: 100%; }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; min-width: 0; }
    .image-picker {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; height: 140px; border: 2px dashed #D1D5DB; border-radius: 12px;
      cursor: pointer; color: #9CA3AF; font-size: 13px; overflow: hidden;
      &:hover { border-color: #6366f1; background: #f5f5ff; }
      &.has-image { border-style: solid; padding: 0; }
      img { width: 100%; height: 100%; object-fit: cover; }
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
    @media (max-width: 380px) {
      .row { flex-direction: column; gap: 0; }
    }
  `],
})
export class AddProductDialogComponent {
  private fb         = inject(FormBuilder);
  private svc        = inject(ProductService);
  private vendorSvc  = inject(VendorService);
  private auth       = inject(Auth);
  private snack      = inject(MatSnackBar);
  private dialogRef  = inject(MatDialogRef<AddProductDialogComponent>);

  private data: { product?: Product; imageUrl?: string } = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private product = this.data.product;
  editing = !!this.product;

  loading = signal(false);
  error   = signal('');
  imagePreview = signal<string | null>(this.data.imageUrl ?? null);
  private imageFile: File | undefined;

  form = this.fb.group({
    name:              [this.product?.name ?? '', Validators.required],
    priceWithDelivery: [this.product?.priceWithDelivery ?? (null as number | null), [Validators.required, Validators.min(1)]],
    quantity:          [this.product?.quantity ?? (null as number | null), [Validators.required, Validators.min(0)]],
  });

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Le fichier doit être une image');
      return;
    }
    this.imageFile = file;
    this.error.set('');
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const v = this.form.value;

    try {
      if (this.editing) {
        await this.svc.update(this.product!.id, {
          name:              v.name!,
          priceWithDelivery: v.priceWithDelivery!,
          quantity:          v.quantity!,
          image:             this.imageFile,
        });
        this.snack.open('Produit modifié', '', { duration: 3000 });
      } else {
        const uid = this.auth.currentUser?.uid;
        if (!uid) throw new Error('Non authentifié');
        const vendor = await firstValueFrom(this.vendorSvc.get(uid));
        await this.svc.create({
          vendorId:          uid,
          vendorName:        vendor.name,
          vendorPhone:       vendor.phoneNumber,
          name:              v.name!,
          priceWithDelivery: v.priceWithDelivery!,
          quantity:          v.quantity!,
          image:             this.imageFile,
        });
        this.snack.open('Produit créé', '', { duration: 3000 });
      }
      this.dialogRef.close(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      this.loading.set(false);
    }
  }
}
