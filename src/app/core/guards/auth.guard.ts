import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authSvc = inject(AuthService);
  const router = inject(Router);
  return authSvc.role$.pipe(
    take(1),
    map(role => role ? true : router.createUrlTree(['/login'])),
  );
};

export const adminGuard: CanActivateFn = () => {
  const authSvc = inject(AuthService);
  const router = inject(Router);
  return authSvc.role$.pipe(
    take(1),
    map(role => role === 'admin' ? true : router.createUrlTree([role === 'vendor' ? '/produits' : '/login'])),
  );
};

export const guestGuard: CanActivateFn = () => {
  const authSvc = inject(AuthService);
  const router = inject(Router);
  return authSvc.role$.pipe(
    take(1),
    map(role => role ? router.createUrlTree([role === 'admin' ? '/dashboard' : '/produits']) : true),
  );
};
