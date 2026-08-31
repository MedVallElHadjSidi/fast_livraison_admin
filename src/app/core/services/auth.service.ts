import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, of, from, BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, shareReplay, map } from 'rxjs/operators';

export type UserRole = 'admin' | 'vendor' | null;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  readonly user$ = user(this.auth);

  // Permet de forcer une nouvelle résolution du rôle sans attendre un
  // événement d'auth (ex : juste après l'inscription vendeur, où la fiche
  // Firestore est créée APRÈS l'événement de connexion — sans ce levier,
  // role$ resterait bloqué sur la valeur résolue avant que la fiche existe).
  private roleRefresh$ = new BehaviorSubject<void>(undefined);

  // Résolu à chaque changement d'état d'authentification (login, rechargement
  // de page, logout) — pas seulement au moment du login() — pour que les
  // guards restent corrects après un rafraîchissement.
  readonly role$: Observable<UserRole> = combineLatest([this.user$, this.roleRefresh$]).pipe(
    map(([u]) => u),
    switchMap(u => (u ? from(this.resolveRole(u.uid)) : of(null))),
    shareReplay(1),
  );

  readonly role = toSignal(this.role$, { initialValue: null as UserRole });

  private async resolveRole(uid: string): Promise<UserRole> {
    const adminSnap = await getDoc(doc(this.firestore, 'admins', uid));
    if (adminSnap.exists()) return 'admin';
    const vendorSnap = await getDoc(doc(this.firestore, 'vendors', uid));
    if (vendorSnap.exists()) return 'vendor';
    return null;
  }

  // Ramène un numéro à un format unique quelle que soit la façon dont il est
  // tapé (avec ou sans indicatif "222", avec un "00" international, avec des
  // espaces...) — indispensable pour que l'inscription et une reconnexion
  // ultérieure dérivent TOUJOURS le même identifiant Firebase, même si le
  // vendeur ne retape pas son numéro exactement de la même façon les deux fois.
  private normalizePhoneDigits(raw: string): string {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    // Numéro local mauritanien à 8 chiffres, sans indicatif → on l'ajoute.
    if (digits.length === 8) digits = `222${digits}`;
    return digits;
  }

  // Un identifiant sans '@' composé majoritairement de chiffres est un
  // numéro de téléphone vendeur ; sinon c'est l'email admin tel quel.
  // (Les chauffeurs, eux, ne se connectent jamais à cette app admin.)
  private toEmail(identifier: string): string {
    if (identifier.includes('@')) return identifier;
    const digits = this.normalizePhoneDigits(identifier);
    if (digits.length >= 6) {
      return `${digits}@vendeur.fasttawassol.mr`;
    }
    return identifier;
  }

  async login(identifier: string, password: string): Promise<void> {
    const email = this.toEmail(identifier);
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const role = await this.resolveRole(cred.user.uid);
    if (!role) {
      await signOut(this.auth);
      throw new Error("Accès refusé. Ce compte n'a pas de rôle reconnu.");
    }
    await this.router.navigate([role === 'admin' ? '/dashboard' : '/produits']);
  }

  async signupVendor(data: { nom: string; telephone: string; email: string; password: string }): Promise<void> {
    // Identifiant de connexion = téléphone (converti en pseudo-email), comme
    // pour un vendeur créé par l'admin — l'email saisi n'est qu'une
    // coordonnée de contact stockée sur la fiche, pas l'identifiant Auth.
    const authEmail = this.toEmail(data.telephone);
    const cred = await createUserWithEmailAndPassword(this.auth, authEmail, data.password);
    await setDoc(doc(this.firestore, 'vendors', cred.user.uid), {
      uid:         cred.user.uid,
      name:        data.nom,
      phoneNumber: data.telephone,
      email:       data.email,
      createdAt:   serverTimestamp(),
    });
    this.roleRefresh$.next();
    await this.router.navigate(['/produits']);
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
