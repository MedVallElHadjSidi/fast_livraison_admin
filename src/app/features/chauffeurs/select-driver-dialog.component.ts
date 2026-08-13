import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Driver } from '../../core/models/driver.model';

@Component({
  selector: 'app-select-driver-dialog',
  standalone: true,
  imports: [
    AsyncPipe,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatListModule,
  ],
  template: `
    <h2 mat-dialog-title>Choisir le chauffeur</h2>

    <mat-dialog-content>
      <p class="desc">Recherchez le chauffeur qui a accepté cette course par son numéro de téléphone.</p>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Numéro de téléphone</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [value]="search()" (input)="search.set($any($event.target).value)"
               placeholder="ex: 22212345678">
      </mat-form-field>

      @if (drivers$ | async; as allDrivers) {
        @let list = filter(allDrivers, search());
        @if (list.length === 0) {
          <div class="empty">
            <mat-icon>search_off</mat-icon>
            <p>Aucun chauffeur pour « {{ search() }} »</p>
          </div>
        } @else {
          <mat-nav-list class="results">
            @for (d of list; track d.uid) {
              <a mat-list-item (click)="dialogRef.close(d)">
                <mat-icon matListItemIcon>person</mat-icon>
                <span matListItemTitle>{{ d.name ?? 'Sans nom' }}</span>
                <span matListItemLine>{{ d.phoneNumber }}</span>
              </a>
            }
          </mat-nav-list>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; width: min(420px, 100%); }
    .desc { font-size: 13px; color: #6B7280; margin: 0 0 12px; }
    .search-field { width: 100%; }
    .results { max-height: 320px; overflow-y: auto; }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 32px; color: #9CA3AF;
      mat-icon { font-size: 36px; width: 36px; height: 36px; }
      p { margin: 0; font-size: 14px; }
    }
  `],
})
export class SelectDriverDialogComponent {
  private firestore = inject(Firestore);
  dialogRef = inject(MatDialogRef<SelectDriverDialogComponent, Driver>);

  search = signal('');

  drivers$: Observable<Driver[]> = (collectionData(
    collection(this.firestore, 'drivers'), { idField: 'uid' }
  ) as Observable<Record<string, unknown>[]>).pipe(
    map(docs => docs.map(d => ({
      uid:         d['uid'] as string,
      phoneNumber: d['phoneNumber'] as string,
      name:        d['name'] as string | undefined,
      status:      (d['status'] as string ?? 'offline') as Driver['status'],
      balance:     (d['balance'] as number ?? 0),
    })))
  );

  filter(drivers: Driver[], query: string): Driver[] {
    const q = query.trim();
    if (!q) return drivers;
    return drivers.filter(d => d.phoneNumber?.includes(q));
  }
}
