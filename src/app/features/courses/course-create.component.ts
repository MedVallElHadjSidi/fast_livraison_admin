import {
  AfterViewChecked,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GoogleMap, MapDirectionsRenderer, MapMarker } from '@angular/google-maps';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Driver } from '../../core/models/driver.model';
import { DeliveryService } from '../../core/services/delivery.service';

interface GeoPin { lat: number; lng: number; label: string; moughatta: string; fullAddress: string; }

@Component({
  selector: 'app-course-create',
  standalone: true,
  imports: [
    ReactiveFormsModule, AsyncPipe,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatRadioModule, MatSelectModule,
    MatProgressSpinnerModule,
    GoogleMap, MapMarker, MapDirectionsRenderer,
  ],
  template: `
    <div class="page">

      <!-- En-tête -->
      <div class="page-header">
        <button mat-icon-button (click)="back()"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="page-title">Lancer une course</h1>
      </div>

      <!-- Stepper visuel -->
      <div class="steps-bar">
        <div class="step-item" [class.active]="step() === 1" [class.done]="step() > 1">
          <div class="step-bubble">@if (step() > 1) { <mat-icon>check</mat-icon> } @else { 1 }</div>
          <span class="step-label">Téléphone</span>
        </div>
        <div class="step-conn" [class.done]="step() > 1"></div>
        <div class="step-item" [class.active]="step() === 2" [class.done]="step() > 2">
          <div class="step-bubble">@if (step() > 2) { <mat-icon>check</mat-icon> } @else { 2 }</div>
          <span class="step-label">Trajet</span>
        </div>
        <div class="step-conn" [class.done]="step() > 2"></div>
        <div class="step-item" [class.active]="step() === 3">
          <div class="step-bubble">3</div>
          <span class="step-label">Lancer</span>
        </div>
      </div>

      <!-- ═══ ÉTAPE 1 : TÉLÉPHONE ═══ -->
      @if (step() === 1) {
        <div class="card">
          <div class="step-hero">
            <div class="hero-circle"><mat-icon>phone_in_talk</mat-icon></div>
            <h2 class="card-title">Numéro du client</h2>
            <p class="card-desc">Saisissez le numéro de téléphone du client</p>
          </div>
          <form [formGroup]="phoneForm" class="form-col">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Numéro de téléphone</mat-label>
              <mat-icon matPrefix>phone</mat-icon>
              <input matInput formControlName="clientPhone" placeholder="ex: 22212345678">
            </mat-form-field>
            <div class="row-end">
              <button mat-button (click)="back()">Annuler</button>
              <button mat-raised-button color="primary" [disabled]="phoneForm.invalid" (click)="goTo(2)">
                Suivant <mat-icon iconPositionEnd>arrow_forward</mat-icon>
              </button>
            </div>
          </form>
        </div>
      }

      <!-- ═══ ÉTAPE 2 : CARTE ═══ -->
      @if (step() === 2) {
        <div class="card map-card">

          <!-- Boîtes de recherche Places (PlaceAutocompleteElement) -->
          <div class="search-col">
            <div class="search-row">
              <div class="search-dot a"></div>
              <div class="search-wrap" [class.has-value]="!!departure()">
                <div #depAutoCon class="pac-host"></div>
                @if (departure()) {
                  <button class="clear-btn" (click)="clearDep()"><mat-icon>close</mat-icon></button>
                }
              </div>
            </div>
            <div class="search-vline"></div>
            <div class="search-row">
              <div class="search-dot b"></div>
              <div class="search-wrap" [class.has-value]="!!destination()">
                <div #destAutoCon class="pac-host"></div>
                @if (destination()) {
                  <button class="clear-btn" (click)="clearDest()"><mat-icon>close</mat-icon></button>
                }
              </div>
            </div>
          </div>

          <!-- Indication clique carte -->
          <div class="map-tip">
            <mat-icon>touch_app</mat-icon>
            @if (geocoding()) {
              Récupération de l'adresse…
            } @else if (!departure()) {
              Ou cliquez sur la carte pour placer le <strong>&nbsp;point de départ</strong>
            } @else if (!destination()) {
              Ou cliquez sur la carte pour placer la <strong>&nbsp;destination</strong>
            } @else {
              <mat-icon style="color:#22C55E">check_circle</mat-icon>
              Trajet sélectionné — @if (duration()) { {{ duration() }} · } {{ distanceKm().toFixed(1) }} km
            }
          </div>

          <!-- GOOGLE MAP -->
          <google-map #gmap
            width="100%" height="400px"
            [center]="mapCenter" [zoom]="mapZoom"
            [options]="mapOptions"
            (mapClick)="onMapClick($event)"
            class="gmap-el">

            @if (depPosition()) {
              <map-marker [position]="depPosition()!" [options]="depOpts"/>
            }
            @if (destPosition()) {
              <map-marker [position]="destPosition()!" [options]="destOpts"/>
            }
            @if (directionsResult()) {
              <map-directions-renderer
                [directions]="directionsResult()!"
                [options]="rendererOpts"/>
            }
          </google-map>

          <div class="row-end" style="margin-top:14px">
            <button mat-button (click)="goTo(1)">Retour</button>
            <button mat-raised-button color="primary"
                    [disabled]="!departure() || !destination() || calculating()"
                    (click)="mapDone()">
              @if (calculating()) { <mat-spinner diameter="18"/> } @else { <mat-icon>check</mat-icon> }
              Continuer
            </button>
          </div>

        </div>
      }

      <!-- ═══ ÉTAPE 3 : LANCER ═══ -->
      @if (step() === 3) {
        <div class="card">

          <!-- Résumé -->
          <div class="summary">
            <div class="sum-row">
              <div class="sum-dot a"></div>
              <div class="sum-text">
                <span class="sum-lbl">Départ</span>
                <span class="sum-val">{{ departure()?.label }}</span>
              </div>
            </div>
            <div class="sum-line"></div>
            <div class="sum-row">
              <div class="sum-dot b"></div>
              <div class="sum-text">
                <span class="sum-lbl">Destination</span>
                <span class="sum-val">{{ destination()?.label }}</span>
              </div>
            </div>
            @if (distanceKm() > 0) {
              <div class="sum-badges">
                <span class="badge blue"><mat-icon>straighten</mat-icon> {{ distanceKm().toFixed(1) }} km</span>
                @if (duration()) {
                  <span class="badge purple"><mat-icon>schedule</mat-icon> {{ duration() }}</span>
                }
              </div>
            }
          </div>

          <div class="client-chip">
            <mat-icon>phone</mat-icon> {{ phoneForm.value.clientPhone }}
          </div>

          <form [formGroup]="launchForm" class="form-col" style="margin-top:16px">

            <div class="prix-row">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Prix (MRU)</mat-label>
                <mat-icon matPrefix>payments</mat-icon>
                <input matInput type="number" formControlName="prix" min="1">
                <span matSuffix>MRU</span>
              </mat-form-field>
              <button mat-stroked-button type="button" [disabled]="calculating()" (click)="recalcPrice()">
                @if (calculating()) { <mat-spinner diameter="18"/> } @else { <mat-icon>calculate</mat-icon> }
                Recalculer
              </button>
            </div>

            <mat-radio-group formControlName="assignmentType" class="radio-grp">
              <mat-radio-button value="auto">
                <div class="rb"><strong>Automatique</strong><span>Notifie les chauffeurs en ligne proches</span></div>
              </mat-radio-button>
              <mat-radio-button value="specific">
                <div class="rb"><strong>Chauffeur spécifique</strong><span>Choisir manuellement</span></div>
              </mat-radio-button>
            </mat-radio-group>

            @if (launchForm.value.assignmentType === 'specific') {
              <mat-form-field appearance="outline" class="full" style="margin-top:10px">
                <mat-label>Sélectionner un chauffeur</mat-label>
                <mat-select formControlName="driverId">
                  @if (drivers$ | async; as drivers) {
                    @for (d of drivers; track d.uid) {
                      <mat-option [value]="d.uid">
                        {{ d.name ?? d.phoneNumber }}
                        <span [class]="'ds ds-' + d.status">●</span>
                      </mat-option>
                    }
                  }
                </mat-select>
              </mat-form-field>
            }

            @if (launchError()) {
              <div class="err-box"><mat-icon>error_outline</mat-icon> {{ launchError() }}</div>
            }

            <div class="row-end">
              <button mat-button type="button" (click)="goTo(2)">Retour</button>
              <button mat-raised-button color="primary" type="button"
                      [disabled]="launchForm.invalid || launching()"
                      (click)="launch()">
                @if (launching()) { <mat-spinner diameter="18"/> } @else { <mat-icon>send</mat-icon> }
                Lancer la course
              </button>
            </div>

          </form>
        </div>
      }

    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 760px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
    .page-title { font-size: 24px; font-weight: 900; color: #1A1A2E; margin: 0; }

    /* Stepper */
    .steps-bar {
      display: flex; align-items: center; gap: 0;
      background: #fff; border-radius: 12px; padding: 14px 24px;
      box-shadow: 0 1px 6px rgba(0,0,0,.07); margin-bottom: 20px;
    }
    .step-item { display: flex; flex-direction: column; align-items: center; gap: 5px; opacity: .35; transition: opacity .3s; &.active, &.done { opacity: 1; } }
    .step-bubble {
      width: 34px; height: 34px; border-radius: 50%;
      background: #E5E7EB; color: #6B7280;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 14px; transition: all .3s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      .active & { background: #6366f1; color: #fff; }
      .done &   { background: #22C55E; color: #fff; }
    }
    .step-label { font-size: 11px; font-weight: 700; color: #9CA3AF; .active & { color: #6366f1; } }
    .step-conn  { flex: 1; height: 3px; background: #E5E7EB; margin: 0 10px; border-radius: 2px; transition: background .3s; &.done { background: #22C55E; } }

    /* Card */
    .card { background: #fff; border-radius: 16px; box-shadow: 0 2px 14px rgba(0,0,0,.08); padding: 28px; }
    .map-card { padding: 18px; }
    .form-col { display: flex; flex-direction: column; gap: 12px; }
    .full { width: 100%; }
    .row-end { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

    /* Step 1 */
    .step-hero { text-align: center; margin-bottom: 20px; }
    .hero-circle {
      width: 68px; height: 68px; border-radius: 50%;
      background: linear-gradient(135deg,#6366f1,#818cf8);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;
      mat-icon { font-size: 34px; width: 34px; height: 34px; color: #fff; }
    }
    .card-title { font-size: 20px; font-weight: 800; color: #1A1A2E; margin: 0 0 4px; }
    .card-desc  { font-size: 14px; color: #6B7280; margin: 0; }

    /* Search boxes */
    .search-col { display: flex; flex-direction: column; gap: 0; margin-bottom: 10px; }
    .search-row { display: flex; align-items: center; gap: 10px; }
    .search-dot {
      width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
      &.a { background: #6366f1; }
      &.b { background: #22C55E; }
    }
    .search-vline { width: 2px; height: 12px; background: #D1D5DB; margin: 2px 6px; }
    .search-wrap {
      flex: 1; display: flex; align-items: center;
      border: 2px solid #E5E7EB; border-radius: 10px;
      padding: 0 10px; transition: border-color .2s; background: #F9FAFB;
      &:focus-within { border-color: #6366f1; background: #fff; }
      &.has-value { border-color: #C7D2FE; background: #fff; }
    }
    .search-icon { font-size: 18px; width: 18px; height: 18px; color: #9CA3AF; flex-shrink: 0; }
    .pac-host { flex: 1; min-width: 0; }
    .clear-btn {
      background: none; border: none; cursor: pointer; padding: 4px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9CA3AF; }
      &:hover mat-icon { color: #EF4444; }
    }

    /* Map tip */
    .map-tip {
      display: flex; align-items: center; gap: 6px;
      background: #EFF6FF; border-radius: 8px; padding: 8px 12px;
      font-size: 13px; color: #1d4ed8; margin-bottom: 10px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* Map */
    .gmap-el { display: block; border-radius: 12px; overflow: hidden; border: 2px solid #E5E7EB; }

    /* Step 3 summary */
    .summary {
      background: #F9FAFB; border-radius: 12px; padding: 14px 18px;
      margin-bottom: 14px; position: relative;
    }
    .sum-row  { display: flex; align-items: flex-start; gap: 12px; padding: 3px 0; }
    .sum-dot  { width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; &.a { background: #6366f1; } &.b { background: #22C55E; } }
    .sum-line { width: 2px; height: 16px; background: #D1D5DB; margin: 0 5px; }
    .sum-text { display: flex; flex-direction: column; }
    .sum-lbl  { font-size: 10px; color: #9CA3AF; font-weight: 700; text-transform: uppercase; }
    .sum-val  { font-size: 13px; color: #1A1A2E; font-weight: 600; line-height: 1.4; }
    .sum-badges { display: flex; gap: 8px; margin-top: 10px; }
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 700;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.blue   { background: #DBEAFE; color: #1d4ed8; }
      &.purple { background: #EDE9FE; color: #7C3AED; }
    }
    .client-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: #F0FDF4; border: 1px solid #86EFAC;
      border-radius: 20px; padding: 6px 14px;
      font-size: 13px; color: #15803d; font-weight: 600;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .prix-row { display: flex; align-items: flex-start; gap: 10px; }
    .radio-grp { display: flex; flex-direction: column; gap: 8px; }
    .rb { display: flex; flex-direction: column; }
    .rb strong { font-size: 14px; color: #1A1A2E; }
    .rb span   { font-size: 12px; color: #6B7280; }
    .ds        { margin-left: 6px; font-size: 11px; }
    .ds-online  { color: #22C55E; }
    .ds-busy    { color: #F59E0B; }
    .ds-offline { color: #9CA3AF; }
    .err-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
  `],
})
export class CourseCreateComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('depAutoCon')  depAutoConRef?:  ElementRef<HTMLDivElement>;
  @ViewChild('destAutoCon') destAutoConRef?: ElementRef<HTMLDivElement>;
  @ViewChild('gmap')        gmapRef?:        GoogleMap;

  private _depPac:  any = null;
  private _destPac: any = null;

  private fb        = inject(FormBuilder);
  private router    = inject(Router);
  private svc       = inject(DeliveryService);
  private firestore = inject(Firestore);
  private snack     = inject(MatSnackBar);
  private zone      = inject(NgZone);

  step        = signal<1 | 2 | 3>(1);
  departure   = signal<GeoPin | null>(null);
  destination = signal<GeoPin | null>(null);
  depPosition = signal<google.maps.LatLngLiteral | null>(null);
  destPosition= signal<google.maps.LatLngLiteral | null>(null);
  distanceKm  = signal(0);
  duration    = signal('');
  calculating = signal(false);
  launching   = signal(false);
  geocoding   = signal(false);
  launchError = signal('');

  directionsResult = signal<google.maps.DirectionsResult | null>(null);

  mapCenter: google.maps.LatLngLiteral = { lat: 18.0858, lng: -15.9785 };
  mapZoom   = 13;
  mapOptions: google.maps.MapOptions = {
    mapTypeControl: false, streetViewControl: false,
    fullscreenControl: true, gestureHandling: 'greedy',
  };

  depOpts: google.maps.MarkerOptions  = { title: 'Départ',      icon: this.pinSvg('#6366f1', 'A'), zIndex: 10 };
  destOpts: google.maps.MarkerOptions = { title: 'Destination', icon: this.pinSvg('#22C55E', 'B'), zIndex: 10 };
  rendererOpts: google.maps.DirectionsRendererOptions = {
    suppressMarkers: true,
    polylineOptions: { strokeColor: '#6366f1', strokeWeight: 4, strokeOpacity: .85 },
  };

  phoneForm = this.fb.group({ clientPhone: ['', Validators.required] });
  launchForm = this.fb.group({
    prix:           [null as number | null, [Validators.required, Validators.min(1)]],
    assignmentType: ['auto', Validators.required],
    driverId:       [''],
  });

  drivers$!: Observable<Driver[]>;

  private placesInited  = false;
  private directionsService?: google.maps.DirectionsService;

  ngOnInit(): void {
    this.drivers$ = (collectionData(
      collection(this.firestore, 'drivers'), { idField: 'uid' }
    ) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => ({
        uid: d['uid'] as string, phoneNumber: d['phoneNumber'] as string,
        name: d['name'] as string | undefined,
        status: (d['status'] as string ?? 'offline') as Driver['status'], balance: 0,
      })))
    );
    this.launchForm.get('assignmentType')?.valueChanges.subscribe(val => {
      const c = this.launchForm.get('driverId');
      val === 'specific' ? c?.setValidators(Validators.required) : c?.clearValidators();
      c?.setValue(''); c?.updateValueAndValidity();
    });
  }

  ngAfterViewChecked(): void {
    if (this.step() === 2 && !this.placesInited && this.depAutoConRef?.nativeElement) {
      this.placesInited = true;
      setTimeout(() => this.initPlaces());
    }
    if (this.step() !== 2) this.placesInited = false;
  }

  private initPlaces(): void {
    if (typeof google === 'undefined') return;
    this.directionsService = new google.maps.DirectionsService();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const places = (google.maps as any).places;
    if (!places?.PlaceAutocompleteElement) return;

    // Extrait la moughataa mauritanienne depuis les address_components Google Maps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractMoughatta = (components: any[]): string => {
      if (!Array.isArray(components)) return '';
      const priority = ['administrative_area_level_2', 'administrative_area_level_3', 'sublocality', 'sublocality_level_1'];
      for (const type of priority) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = components.find((ac: any) => ac.types?.includes(type));
        if (c) return c.longText ?? c.long_name ?? '';
      }
      return '';
    };

    const make = (
      container: ElementRef<HTMLDivElement>,
      onSelect: (lat: number, lng: number, label: string, moughatta: string, fullAddress: string) => void,
    ) => {
      const el = new places.PlaceAutocompleteElement({ requestedLanguage: 'fr' });
      el.style.cssText = 'width:100%;display:block;';
      container.nativeElement.appendChild(el);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      el.addEventListener('gmp-placeselect', async (event: any) => {
        const place = event.place;
        await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName', 'addressComponents'] });
        this.zone.run(() => {
          const lat: number    = place.location.lat();
          const lng: number    = place.location.lng();
          const fullAddress    = place.formattedAddress ?? place.displayName ?? '';
          const moughatta      = extractMoughatta(place.addressComponents ?? []);
          const displayName    = place.displayName ?? '';
          const label          = displayName && displayName !== fullAddress ? displayName : fullAddress;
          onSelect(lat, lng, label, moughatta, fullAddress);
        });
      });
      return el;
    };

    if (this.depAutoConRef)  this._depPac  = make(this.depAutoConRef,  (lat, lng, l, m, fa) => this.setDep(lat, lng, l, m, fa));
    if (this.destAutoConRef) this._destPac = make(this.destAutoConRef, (lat, lng, l, m, fa) => this.setDest(lat, lng, l, m, fa));
  }

  goTo(s: 1 | 2 | 3): void {
    if (s === 2) {
      this.depPosition.set(null); this.destPosition.set(null);
      this.departure.set(null);   this.destination.set(null);
      this.directionsResult.set(null);
      this.distanceKm.set(0);     this.duration.set('');
      this.clearPacInput(this._depPac);
      this.clearPacInput(this._destPac);
      this._depPac = null; this._destPac = null;
    }
    this.step.set(s);
  }

  private setDep(lat: number, lng: number, label: string, moughatta = '', fullAddress = ''): void {
    this.depPosition.set({ lat, lng });
    this.departure.set({ lat, lng, label, moughatta, fullAddress: fullAddress || label });
    this.panMap({ lat, lng });
    this.fetchRoute();
  }

  private setDest(lat: number, lng: number, label: string, moughatta = '', fullAddress = ''): void {
    this.destPosition.set({ lat, lng });
    this.destination.set({ lat, lng, label, moughatta, fullAddress: fullAddress || label });
    this.fetchRoute();
  }

  clearDep(): void {
    this.departure.set(null); this.depPosition.set(null);
    this.directionsResult.set(null); this.distanceKm.set(0); this.duration.set('');
    this.clearPacInput(this._depPac);
  }

  clearDest(): void {
    this.destination.set(null); this.destPosition.set(null);
    this.directionsResult.set(null); this.distanceKm.set(0); this.duration.set('');
    this.clearPacInput(this._destPac);
  }

  private clearPacInput(pacEl: any): void {
    if (!pacEl) return;
    const inp = pacEl.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
  }

  onMapClick(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const lat = event.latLng.lat(), lng = event.latLng.lng();
    this.zone.run(async () => {
      this.geocoding.set(true);
      const { label, moughatta, fullAddress } = await this.reverseGeocode(lat, lng);
      this.geocoding.set(false);
      if (!this.departure()) this.setDep(lat, lng, label, moughatta, fullAddress);
      else                   this.setDest(lat, lng, label, moughatta, fullAddress);
    });
  }

  private fetchRoute(): void {
    const dep  = this.departure();
    const dest = this.destination();
    if (!dep || !dest || !this.directionsService) return;

    this.directionsService.route({
      origin:      { lat: dep.lat,  lng: dep.lng  },
      destination: { lat: dest.lat, lng: dest.lng },
      travelMode:  google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      this.zone.run(() => {
        if (status === 'OK' && result) {
          this.directionsResult.set(result);
          const leg = result.routes[0].legs[0];
          this.distanceKm.set((leg.distance?.value ?? 0) / 1000);
          this.duration.set(leg.duration?.text ?? '');
        } else {
          // Fallback ligne droite
          this.directionsResult.set(null);
          this.distanceKm.set(this.haversine(dep.lat, dep.lng, dest.lat, dest.lng));
        }
      });
    });
  }

  private panMap(pos: google.maps.LatLngLiteral): void {
    this.gmapRef?.panTo(pos);
  }

  async mapDone(): Promise<void> {
    await this.recalcPrice();
    this.step.set(3);
  }

  async recalcPrice(): Promise<void> {
    this.calculating.set(true);
    try {
      const price = await this.svc.calculatePrice(this.distanceKm() > 0 ? this.distanceKm() : undefined);
      this.launchForm.patchValue({ prix: price });
    } catch {
      this.launchForm.patchValue({ prix: 100 });
    } finally {
      this.calculating.set(false);
    }
  }

  async launch(): Promise<void> {
    const dep = this.departure(), dest = this.destination();
    if (!dep || !dest || this.launchForm.invalid) return;
    this.launching.set(true); this.launchError.set('');
    const v = this.launchForm.value;
    try {
      await this.svc.createDelivery({
        clientPhone:    this.phoneForm.value.clientPhone!,
        departure:      dep,
        destination:    dest,
        prix:           v.prix!,
        estimatedPrice: v.prix!,
        packageSize:    'medium',
        distance:       this.distanceKm() > 0 ? this.distanceKm() : undefined,
        status:         'pending',
        assignmentType: v.assignmentType as 'auto' | 'specific',
        driverId:       v.assignmentType === 'specific' ? v.driverId! : undefined,
      });
      this.snack.open('Course lancée avec succès !', '', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      this.launchError.set(e instanceof Error ? e.message : 'Erreur');
    } finally {
      this.launching.set(false);
    }
  }

  private pinSvg(color: string, letter: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46">
      <path fill="${color}" stroke="white" stroke-width="2.5"
            d="M18 2C10.3 2 4 8.3 4 16C4 27 18 44 18 44C18 44 32 27 32 16C32 8.3 25.7 2 18 2Z"/>
      <text x="18" y="21" text-anchor="middle" font-family="Arial Black"
            font-weight="900" font-size="14" fill="white">${letter}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  private reverseGeocode(lat: number, lng: number): Promise<{ label: string; moughatta: string; fullAddress: string }> {
    return new Promise(resolve => {
      new google.maps.Geocoder().geocode({ location: { lat, lng } }, (res, st) => {
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (st !== 'OK' || !res?.[0]) {
          resolve({ label: fallback, moughatta: '', fullAddress: fallback });
          return;
        }
        const comps    = res[0].address_components ?? [];
        const priority = ['administrative_area_level_2', 'administrative_area_level_3', 'sublocality', 'sublocality_level_1'];
        let moughatta  = '';
        for (const type of priority) {
          const c = comps.find(ac => ac.types.includes(type));
          if (c) { moughatta = c.long_name; break; }
        }
        const fullAddress = res[0].formatted_address;
        const labelComp   = comps.find(ac => ac.types.includes('sublocality_level_1') || ac.types.includes('sublocality'));
        const label       = (labelComp?.long_name && labelComp.long_name !== moughatta) ? labelComp.long_name : fullAddress;
        resolve({ label, moughatta, fullAddress });
      });
    });
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371, r = (d: number) => d * Math.PI / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  ngOnDestroy(): void {}
  back(): void { this.router.navigate(['/dashboard']); }
}
