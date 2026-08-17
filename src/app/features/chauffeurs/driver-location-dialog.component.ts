import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Driver } from '../../core/models/driver.model';

interface LivePosition {
  lat?: number;
  lng?: number;
  status: Driver['status'];
  lastSeen?: Date;
}

@Component({
  selector: 'app-driver-location-dialog',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatDialogModule, MatButtonModule, MatIconModule, GoogleMap, MapMarker],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>my_location</mat-icon>
      Position de {{ driver.name ?? driver.phoneNumber }}
    </h2>

    <mat-dialog-content>
      @if (position$ | async; as pos) {
        @if (hasCoords(pos)) {
          <google-map
            width="100%" height="360px"
            [center]="{ lat: pos.lat!, lng: pos.lng! }"
            [zoom]="15"
            [options]="mapOptions"
            class="gmap-el">
            <map-marker [position]="{ lat: pos.lat!, lng: pos.lng! }" [options]="markerOpts(pos.status)" />
          </google-map>
          <div class="meta-row">
            <span class="status-chip" [class]="'chip-' + pos.status">
              <span class="dot"></span>
              {{ pos.status === 'online' ? 'En ligne' : pos.status === 'busy' ? 'En course' : 'Hors ligne' }}
            </span>
            <span class="last-seen">
              @if (pos.lastSeen) {
                Mise à jour : {{ pos.lastSeen | date:'dd/MM/yyyy HH:mm:ss' }}
              } @else {
                Heure de mise à jour inconnue
              }
            </span>
          </div>
        } @else {
          <div class="empty">
            <mat-icon>location_off</mat-icon>
            <p>Ce chauffeur n'a pas encore partagé sa position</p>
          </div>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; }
    .gmap-el { display: block; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB; min-width: min(520px, 80vw); }
    .meta-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; margin-top: 12px; flex-wrap: wrap;
    }
    .status-chip {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700;
      .dot { width: 8px; height: 8px; border-radius: 50%; }
      &.chip-online  { background: #DCFCE7; color: #15803D; .dot { background: #22C55E; } }
      &.chip-busy    { background: #FEF3C7; color: #92400E; .dot { background: #F59E0B; } }
      &.chip-offline { background: #F3F4F6; color: #4B5563; .dot { background: #9CA3AF; } }
    }
    .last-seen { font-size: 12px; color: #6B7280; }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 48px 24px; color: #9CA3AF; min-width: min(420px, 80vw);
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      p { margin: 0; font-size: 14px; text-align: center; }
    }
    @media (max-width: 480px) {
      .gmap-el, .empty { min-width: 0; width: 100%; }
    }
  `],
})
export class DriverLocationDialogComponent {
  private firestore = inject(Firestore);
  driver: Driver = inject(MAT_DIALOG_DATA).driver;

  mapOptions: google.maps.MapOptions = {
    mapTypeControl: false, streetViewControl: false,
    fullscreenControl: true, gestureHandling: 'greedy',
  };

  position$: Observable<LivePosition> = (docData(
    doc(this.firestore, 'drivers', this.driver.uid)
  ) as Observable<Record<string, unknown>>).pipe(
    map(d => ({
      lat:      d['lat'] as number | undefined,
      lng:      d['lng'] as number | undefined,
      status:   (d['status'] as Driver['status']) ?? 'offline',
      lastSeen: d['lastSeen'] ? new Date(d['lastSeen'] as string) : undefined,
    })),
  );

  hasCoords(pos: LivePosition): boolean {
    return typeof pos.lat === 'number' && typeof pos.lng === 'number';
  }

  markerOpts(status: Driver['status']): google.maps.MarkerOptions {
    const color = status === 'online' ? '#22C55E' : status === 'busy' ? '#F59E0B' : '#9CA3AF';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <circle cx="20" cy="20" r="10" fill="${color}" stroke="white" stroke-width="3"/>
    </svg>`;
    return { icon: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg) };
  }
}
