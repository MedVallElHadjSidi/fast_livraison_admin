import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '@angular/fire/auth';
import { Storage, ref, getDownloadURL } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { AddProductDialogComponent } from './add-product-dialog.component';
import { RequestDeliveryDialogComponent } from './request-delivery-dialog.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, MatIconModule, MatButtonModule],
  template: `
    <div class="page">
      <div class="page-header">
        @if (isAdmin()) {
          <button mat-icon-button (click)="back()"><mat-icon>arrow_back</mat-icon></button>
        }
        <h1 class="page-title">{{ isAdmin() ? 'Produits (tous les vendeurs)' : 'Mes produits' }}</h1>
        @if (!isAdmin()) {
          <button mat-raised-button color="primary" (click)="openAdd()">
            <mat-icon>add</mat-icon>
            Nouveau produit
          </button>
        }
      </div>

      @if (products$ | async; as list) {
        @if (list.length === 0) {
          <div class="empty">
            <mat-icon>inventory_2</mat-icon>
            <p>Aucun produit</p>
          </div>
        } @else {
          <div class="grid">
            @for (p of list; track p.id) {
              <div class="card">
                <div class="thumb">
                  @if (imageUrls()[p.id]) {
                    <img [src]="imageUrls()[p.id]" alt="">
                  } @else {
                    <mat-icon>inventory_2</mat-icon>
                  }
                  @if (p.quantity <= 0) {
                    <span class="out-badge">Épuisé</span>
                  }
                </div>
                <div class="body">
                  <div class="name">{{ p.name }}</div>
                  <div class="price">{{ p.priceWithDelivery | number:'1.0-0' }} MRU</div>
                  <div class="qty" [class.low]="p.quantity <= 0">{{ p.quantity }} en stock</div>
                  @if (isAdmin()) {
                    <div class="vendor">{{ p.vendorName ?? 'Vendeur inconnu' }} — {{ p.vendorPhone }}</div>
                  }
                </div>
                @if (!isAdmin()) {
                  <div class="actions">
                    <button mat-icon-button (click)="openRequestDelivery(p)"
                            [disabled]="p.quantity <= 0" aria-label="Demander une livraison"
                            title="Demander une livraison">
                      <mat-icon>local_shipping</mat-icon>
                    </button>
                    <button mat-icon-button (click)="openEdit(p)" aria-label="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="remove(p)" aria-label="Supprimer">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1200px; }
    .page-header {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 24px;
    }
    .page-title { font-size: 26px; font-weight: 900; color: #1A1A2E; margin: 0; flex: 1; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .card {
      background: white; border-radius: 16px; overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex; flex-direction: column;
    }
    .thumb {
      position: relative; height: 140px; background: #F3F4F6;
      display: flex; align-items: center; justify-content: center;
      img { width: 100%; height: 100%; object-fit: cover; }
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #D1D5DB; }
    }
    .out-badge {
      position: absolute; top: 8px; right: 8px;
      background: #EF4444; color: white; font-size: 11px; font-weight: 700;
      border-radius: 20px; padding: 3px 10px;
    }
    .body { padding: 12px 14px; flex: 1; }
    .name { font-weight: 700; color: #1A1A2E; font-size: 14px; margin-bottom: 4px; }
    .price { color: #1565C0; font-weight: 800; font-size: 15px; margin-bottom: 2px; }
    .qty { font-size: 12px; color: #6B7280; }
    .qty.low { color: #EF4444; font-weight: 700; }
    .vendor { font-size: 11px; color: #9CA3AF; margin-top: 6px; }
    .actions { display: flex; justify-content: flex-end; gap: 4px; padding: 0 8px 8px; }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 64px; color: #9CA3AF;
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
      p { margin: 0; font-size: 16px; }
    }
    @media (max-width: 599px) {
      .page { padding: 16px; }
      .page-title { font-size: 20px; }
    }
  `],
})
export class ProductListComponent {
  private router   = inject(Router);
  private svc      = inject(ProductService);
  private authSvc  = inject(AuthService);
  private auth     = inject(Auth);
  private storage  = inject(Storage);
  private dialog   = inject(MatDialog);
  private snack    = inject(MatSnackBar);

  imageUrls = signal<Record<string, string>>({});
  isAdmin(): boolean { return this.authSvc.role() === 'admin'; }

  products$: Observable<Product[]> = (
    this.isAdmin()
      ? this.svc.listAll()
      : this.svc.listMine(this.auth.currentUser?.uid ?? '')
  ).pipe(
    tap(list => this.resolveImages(list)),
  );

  private resolveImages(products: Product[]): void {
    for (const p of products) {
      if (!p.imagePath || this.imageUrls()[p.id]) continue;
      getDownloadURL(ref(this.storage, p.imagePath))
        .then(url => this.imageUrls.update(m => ({ ...m, [p.id]: url })))
        .catch(() => {});
    }
  }

  openAdd(): void {
    this.dialog.open(AddProductDialogComponent, {
      width: '95vw',
      maxWidth: '460px',
      disableClose: true,
    });
  }

  openEdit(product: Product): void {
    this.dialog.open(AddProductDialogComponent, {
      width: '95vw',
      maxWidth: '460px',
      disableClose: true,
      data: { product, imageUrl: this.imageUrls()[product.id] },
    });
  }

  openRequestDelivery(product: Product): void {
    this.dialog.open(RequestDeliveryDialogComponent, {
      width: '95vw',
      maxWidth: '460px',
      maxHeight: '90vh',
      disableClose: true,
      data: { product },
    });
  }

  async remove(product: Product): Promise<void> {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;
    try {
      await this.svc.delete(product);
      this.snack.open('Produit supprimé', '', { duration: 3000 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      this.snack.open(msg, '', { duration: 4000 });
    }
  }

  back(): void { this.router.navigate(['/dashboard']); }
}
