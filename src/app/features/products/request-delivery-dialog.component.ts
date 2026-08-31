import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../core/models/product.model';
import { DemandePaymentMethod } from '../../core/models/demande.model';
import { DemandeService } from '../../core/services/demande.service';
import { VendorService } from '../../core/services/vendor.service';

@Component({
  selector: 'app-request-delivery-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, DecimalPipe,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatRadioModule,
    MatProgressSpinnerModule, MatStepperModule,
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

      <form [formGroup]="form">
        <mat-stepper orientation="vertical" #stepper class="stepper">

          <mat-step label="Trajet" state="trajet"
                     [stepControl]="form"
                     [completed]="step1Valid()">
            <div class="step-body">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Quantité demandée</mat-label>
                <input matInput type="number" formControlName="quantity" min="1">
              </mat-form-field>

              <div class="amount-chip">
                <mat-icon>payments</mat-icon>
                <span>Montant : <strong>{{ amount() | number:'1.0-0' }} MRU</strong></span>
              </div>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Numéro du client</mat-label>
                <mat-icon matPrefix>phone</mat-icon>
                <input matInput formControlName="clientPhone" placeholder="ex: 22212345678">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Lieu de départ</mat-label>
                <mat-icon matPrefix>trip_origin</mat-icon>
                <input matInput formControlName="departure">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Lieu de destination</mat-label>
                <mat-icon matPrefix>place</mat-icon>
                <input matInput formControlName="destination">
              </mat-form-field>

              <div class="step-actions">
                <button mat-raised-button color="primary" type="button"
                        [disabled]="!step1Valid()" matStepperNext>
                  Suivant <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          </mat-step>

          <mat-step label="Mode de paiement" state="paiement">
            <div class="step-body">
              <div class="amount-chip">
                <mat-icon>payments</mat-icon>
                <span>Montant à payer : <strong>{{ amount() | number:'1.0-0' }} MRU</strong></span>
              </div>

              <mat-radio-group formControlName="paymentMethod" class="method-grp">
                <mat-radio-button value="bankily_vendeur">Bankily vendeur</mat-radio-button>
                <mat-radio-button value="bankily_fast">Bankily FAST</mat-radio-button>
                <mat-radio-button value="espece">Espèce</mat-radio-button>
              </mat-radio-group>

              @if (error()) {
                <div class="error-box">
                  <mat-icon>error_outline</mat-icon>
                  {{ error() }}
                </div>
              }

              <div class="step-actions">
                <button mat-button type="button" matStepperPrevious [disabled]="loading()">Précédent</button>
                <button mat-raised-button color="primary" type="button"
                        [disabled]="form.invalid || loading()"
                        (click)="submit()">
                  @if (loading()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <mat-icon>local_shipping</mat-icon>
                  }
                  Envoyer la demande
                </button>
              </div>
            </div>
          </mat-step>

          <ng-template matStepperIcon="trajet"><mat-icon>route</mat-icon></ng-template>
          <ng-template matStepperIcon="paiement"><mat-icon>payments</mat-icon></ng-template>

        </mat-stepper>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="loading()">Annuler</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; width: min(420px, 100%); }
    .stepper { background: transparent; }
    ::ng-deep .stepper .mat-step-header { border-radius: 10px; padding: 12px; }
    ::ng-deep .stepper .mat-step-header:hover { background: #F5F5FF; }
    ::ng-deep .stepper .mat-vertical-content { padding: 0 24px 24px 24px; }

    .step-body { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
    .step-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; }
    .step-actions:has(> :only-child) { justify-content: flex-end; }

    .full { width: 100%; }
    .method-grp { display: flex; flex-direction: column; gap: 10px; }
    .product-chip {
      display: flex; align-items: center; gap: 10px;
      background: #F9FAFB; border-radius: 12px; padding: 12px 14px;
      margin-bottom: 16px;
      mat-icon { color: #6B7280; }
    }
    .product-name { font-weight: 700; color: #1A1A2E; font-size: 14px; }
    .product-stock { font-size: 12px; color: #6B7280; }
    .amount-chip {
      display: flex; align-items: center; gap: 8px;
      background: #EFF6FF; color: #1D4ED8;
      border-radius: 10px; padding: 10px 14px; font-size: 13px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      strong { font-size: 14px; }
    }
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
    quantity:      [1, [Validators.required, Validators.min(1)]],
    clientPhone:   ['', [Validators.required, Validators.minLength(8)]],
    departure:     ['', Validators.required],
    destination:   ['', Validators.required],
    paymentMethod: ['bankily_vendeur' as DemandePaymentMethod, Validators.required],
  });

  private quantitySig = toSignal(this.form.controls.quantity.valueChanges, {
    initialValue: this.form.controls.quantity.value,
  });
  amount = () => (this.quantitySig() ?? 0) * this.product.priceWithDelivery;

  step1Valid(): boolean {
    const g = this.form;
    return !!(g.get('quantity')?.valid && g.get('clientPhone')?.valid
      && g.get('departure')?.valid && g.get('destination')?.valid);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Non authentifié');
      const vendor = await firstValueFrom(this.vendorSvc.get(uid));
      await this.svc.create({
        vendorId:      uid,
        vendorName:    vendor.name,
        vendorPhone:   vendor.phoneNumber,
        productId:     this.product.id,
        productName:   this.product.name,
        quantity:      this.form.value.quantity!,
        unitPrice:     this.product.priceWithDelivery,
        clientPhone:   this.form.value.clientPhone!,
        departure:     this.form.value.departure!,
        destination:   this.form.value.destination!,
        paymentMethod: this.form.value.paymentMethod!,
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
