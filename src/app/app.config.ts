import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

function loadGoogleMaps(): () => Promise<void> {
  return () =>
    new Promise<void>((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }
      const callbackName = '__googleMapsInit';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)[callbackName] = resolve;
      const script    = document.createElement('script');
      script.src      = `https://maps.googleapis.com/maps/api/js?key=${environment.mapsApiKey}&libraries=places&v=weekly&language=fr&callback=${callbackName}`;
      script.async    = true;
      script.defer    = true;
      script.onerror  = reject;
      document.head.appendChild(script);
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideFunctions(() => getFunctions(undefined, 'europe-west1')),
    {
      provide:    APP_INITIALIZER,
      useFactory: loadGoogleMaps,
      multi:      true,
    },
  ],
};
