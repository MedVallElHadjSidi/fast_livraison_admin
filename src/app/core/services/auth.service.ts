import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { from, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  readonly user$ = user(this.auth);

  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    // Verify the user has admin role in Firestore.
    const snap = await getDoc(doc(this.firestore, 'admins', cred.user.uid));
    if (!snap.exists()) {
      await signOut(this.auth);
      throw new Error('Accès refusé. Ce compte n\'est pas administrateur.');
    }
    await this.router.navigate(['/dashboard']);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/login']);
  }

  isLoggedIn(): Observable<boolean> {
    return new Observable(obs => {
      this.user$.subscribe(u => obs.next(!!u));
    });
  }
}
