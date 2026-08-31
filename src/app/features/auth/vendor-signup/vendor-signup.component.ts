import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm  = control.get('confirm')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-vendor-signup',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="brand">
          <div class="logo">🏪</div>
          <h1>FastTossel</h1>
          <p>Inscription vendeur</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="nom" autocomplete="name" />
            <mat-icon matPrefix>storefront</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Téléphone</mat-label>
            <input matInput formControlName="telephone" placeholder="ex: 22212345678" autocomplete="tel" />
            <mat-icon matPrefix>phone</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Mot de passe</mat-label>
            <input matInput formControlName="password"
                   [type]="hidePassword() ? 'password' : 'text'"
                   autocomplete="new-password" />
            <mat-icon matPrefix>lock</mat-icon>
            <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())">
              <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirmer le mot de passe</mat-label>
            <input matInput formControlName="confirm"
                   [type]="hidePassword() ? 'password' : 'text'"
                   autocomplete="new-password" />
            <mat-icon matPrefix>lock</mat-icon>
          </mat-form-field>

          @if (form.errors?.['mismatch'] && form.get('confirm')?.touched) {
            <div class="error-box">
              <mat-icon>error_outline</mat-icon>
              <span>Les mots de passe ne correspondent pas</span>
            </div>
          }

          @if (error()) {
            <div class="error-box">
              <mat-icon>error_outline</mat-icon>
              <span>{{ error() }}</span>
            </div>
          }

          <button mat-raised-button color="primary" type="submit"
                  [disabled]="form.invalid || loading()">
            @if (loading()) {
              <mat-spinner diameter="20" />
            } @else {
              <ng-container>
                <mat-icon>person_add</mat-icon>
                Créer mon compte
              </ng-container>
            }
          </button>
        </form>

        <a class="back-link" routerLink="/login">Déjà un compte ? Se connecter</a>
      </div>
    </div>
  `,
  styleUrl: '../login/login.component.scss',
})
export class VendorSignupComponent {
  private fb = inject(FormBuilder);
  private authSvc = inject(AuthService);

  form = this.fb.group({
    nom:       ['', Validators.required],
    telephone: ['', [Validators.required, Validators.minLength(8)]],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, Validators.minLength(6)]],
    confirm:   ['', Validators.required],
  }, { validators: passwordsMatch });

  loading = signal(false);
  error = signal('');
  hidePassword = signal(true);

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.authSvc.signupVendor({
        nom:       this.form.value.nom!,
        telephone: this.form.value.telephone!,
        email:     this.form.value.email!,
        password:  this.form.value.password!,
      });
    } catch (e: unknown) {
      const msg = (e as any)?.code === 'auth/email-already-in-use'
        ? 'Un compte existe déjà avec ce numéro de téléphone'
        : e instanceof Error ? e.message : 'Erreur lors de la création du compte';
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
