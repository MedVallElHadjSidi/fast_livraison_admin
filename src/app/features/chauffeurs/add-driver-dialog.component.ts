import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes } from '@angular/fire/storage';

interface DocSlot {
  key: string;
  label: string;
  icon: string;
  file: File | null;
}

@Component({
  selector: 'app-add-driver-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatStepperModule,
  ],
  template: `
    <h2 mat-dialog-title>Ajouter un chauffeur</h2>

    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-stepper orientation="vertical" #stepper class="stepper">

          <mat-step label="Informations personnelles" state="person">
            <div class="step-body">
              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Prénom</mat-label>
                  <input matInput formControlName="prenom">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Nom</mat-label>
                  <input matInput formControlName="nom">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Numéro de téléphone</mat-label>
                <mat-icon matPrefix>phone</mat-icon>
                <input matInput formControlName="telephone" placeholder="ex: 22212345678">
                <mat-hint>Identifiant de connexion du chauffeur</mat-hint>
              </mat-form-field>

              @if (phone) {
                <div class="credentials-preview">
                  <mat-icon class="key-icon">key</mat-icon>
                  <div>
                    <div class="cred-title">Identifiants générés automatiquement</div>
                    <div class="cred-row">
                      <span class="cred-label">Téléphone :</span><strong>{{ phone }}</strong>
                    </div>
                    <div class="cred-row">
                      <span class="cred-label">Mot de passe :</span><strong>{{ pin }}</strong>
                    </div>
                  </div>
                </div>
              }

              <div class="step-actions">
                <button mat-raised-button color="primary" type="button" matStepperNext>
                  Suivant <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          </mat-step>

          <mat-step label="Véhicule" state="car">
            <div class="step-body">
              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Marque</mat-label>
                  <input matInput formControlName="marque">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Modèle</mat-label>
                  <input matInput formControlName="modele">
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Immatriculation</mat-label>
                <input matInput formControlName="immatriculation">
              </mat-form-field>

              <div class="step-actions">
                <button mat-button type="button" matStepperPrevious>Précédent</button>
                <button mat-raised-button color="primary" type="button" matStepperNext>
                  Suivant <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          </mat-step>

          <mat-step label="Documents" state="folder">
            <div class="step-body">
              <div class="section-label">
                Documents <span class="png-badge">Images (PNG, JPG, JPEG…)</span>
              </div>
              <div class="docs-grid">
                @for (slot of docs; track slot.key) {
                  <div class="doc-slot" [class.selected]="slot.file" [class.required]="slot.key === requiredDocKey"
                       (click)="triggerUpload(slot.key)">
                    <input type="file" accept="image/*" [id]="'file-' + slot.key"
                           style="display:none" (change)="onFileSelected($event, slot)">
                    @if (slot.file) {
                      <mat-icon class="doc-icon done">check_circle</mat-icon>
                      <div class="doc-label">{{ slot.label }}</div>
                      <div class="doc-filename">{{ slot.file.name }}</div>
                    } @else {
                      <mat-icon class="doc-icon">{{ slot.icon }}</mat-icon>
                      <div class="doc-label">
                        {{ slot.label }}
                        @if (slot.key === requiredDocKey) { <span class="required-mark">*</span> }
                      </div>
                      <div class="doc-action">
                        {{ slot.key === requiredDocKey ? 'Obligatoire' : 'Cliquer pour sélectionner' }}
                      </div>
                    }
                  </div>
                }
              </div>

              @if (uploadProgress()) {
                <div class="progress-box">
                  <mat-spinner diameter="16" />
                  {{ uploadProgress() }}
                </div>
              }

              @if (error()) {
                <div class="error-box">
                  <mat-icon>error_outline</mat-icon>
                  {{ error() }}
                </div>
              }

              <div class="step-actions">
                <button mat-button type="button" matStepperPrevious [disabled]="loading()">Précédent</button>
                <button mat-raised-button color="primary" type="button"
                        [disabled]="form.invalid || !hasRequiredDoc() || loading()"
                        (click)="submit()">
                  @if (loading()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <mat-icon>person_add</mat-icon>
                  }
                  Créer le chauffeur
                </button>
              </div>
            </div>
          </mat-step>

          <ng-template matStepperIcon="person"><mat-icon>person</mat-icon></ng-template>
          <ng-template matStepperIcon="car"><mat-icon>two_wheeler</mat-icon></ng-template>
          <ng-template matStepperIcon="folder"><mat-icon>folder</mat-icon></ng-template>

        </mat-stepper>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="loading()">Annuler</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; width: min(560px, 100%); }

    ::ng-deep .add-driver-panel .mat-mdc-dialog-container .mdc-dialog__surface {
      border-radius: 20px;
    }

    .stepper { background: transparent; }
    ::ng-deep .stepper .mat-step-header { border-radius: 10px; padding: 12px; }
    ::ng-deep .stepper .mat-step-header:hover { background: #F5F5FF; }
    ::ng-deep .stepper .mat-vertical-content { padding: 0 24px 24px 24px; }

    .step-body { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
    .step-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; }
    .step-actions:has(> :only-child) { justify-content: flex-end; }

    .section-label {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      color: #6B7280; letter-spacing: .5px; display: flex; align-items: center; gap: 8px;
    }
    .png-badge {
      background: #dbeafe; color: #1d4ed8;
      border-radius: 20px; padding: 2px 10px; font-size: 11px; text-transform: none;
    }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; min-width: 0; }
    .full { width: 100%; }
    .docs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 460px) {
      .row { flex-direction: column; gap: 0; }
      .docs-grid { grid-template-columns: 1fr; }
    }
    .doc-slot {
      border: 2px dashed #D1D5DB; border-radius: 10px;
      padding: 16px 12px; cursor: pointer; text-align: center; transition: all .2s;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      &:hover { border-color: #6366f1; background: #f5f5ff; }
      &.selected { border-color: #22C55E; border-style: solid; background: #f0fdf4; }
      &.required:not(.selected) { border-color: #F59E0B; }
    }
    .doc-icon { font-size: 28px; width: 28px; height: 28px; color: #9CA3AF; }
    .doc-icon.done { color: #22C55E; }
    .doc-label { font-size: 13px; font-weight: 600; color: #1A1A2E; }
    .required-mark { color: #EF4444; font-weight: 800; }
    .doc-action { font-size: 11px; color: #9CA3AF; }
    .doc-slot.required:not(.selected) .doc-action { color: #B45309; font-weight: 600; }
    .doc-filename { font-size: 11px; color: #6B7280; word-break: break-all; }
    .credentials-preview {
      display: flex; align-items: flex-start; gap: 12px;
      background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 14px;
    }
    .key-icon { color: #16a34a; margin-top: 2px; }
    .cred-title { font-size: 12px; font-weight: 700; color: #15803d; margin-bottom: 6px; }
    .cred-row { font-size: 13px; color: #1A1A2E; margin-bottom: 2px; }
    .cred-label { color: #6B7280; margin-right: 6px; }
    .progress-box {
      display: flex; align-items: center; gap: 10px;
      background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 8px; padding: 10px 14px; color: #1d4ed8; font-size: 13px;
    }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 13px;
    }
  `],
})
export class AddDriverDialogComponent {
  private fb        = inject(FormBuilder);
  private functions = inject(Functions);
  private firestore  = inject(Firestore);
  private storage    = inject(Storage);
  private snack     = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AddDriverDialogComponent>);

  loading        = signal(false);
  error          = signal('');
  uploadProgress = signal('');

  readonly requiredDocKey = 'carteIdentite';

  docs: DocSlot[] = [
    { key: 'carteIdentite',  label: "Carte d'identité",   icon: 'badge',       file: null },
    { key: 'photo',          label: 'Photo du chauffeur',  icon: 'person',      file: null },
    { key: 'photoMoto',      label: 'Photo de la moto',    icon: 'two_wheeler', file: null },
    { key: 'photoPossessif', label: 'Document possessif',  icon: 'description', file: null },
  ];

  form = this.fb.group({
    prenom:          [''],
    nom:             [''],
    telephone:       ['', [Validators.required, Validators.minLength(8)]],
    marque:          [''],
    modele:          [''],
    immatriculation: [''],
  });

  hasRequiredDoc(): boolean {
    return !!this.docs.find(d => d.key === this.requiredDocKey)?.file;
  }

  get phone(): string { return this.form.get('telephone')?.value ?? ''; }
  get pin(): string {
    return this.phone.replace(/\D/g, '').slice(-4).padStart(4, '0');
  }

  triggerUpload(key: string): void {
    document.getElementById('file-' + key)?.click();
  }

  onFileSelected(event: Event, slot: DocSlot): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set(`"${slot.label}" doit être une image (PNG, JPG, JPEG…)`);
      (event.target as HTMLInputElement).value = '';
      return;
    }
    slot.file = file;
    this.error.set('');
  }

  private fileExtension(file: File): string {
    const fromName = file.name.split('.').pop();
    if (fromName && fromName.length <= 5) return fromName.toLowerCase();
    return (file.type.split('/')[1] || 'jpg').toLowerCase();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.error.set('Le numéro de téléphone est requis'); return; }
    if (!this.hasRequiredDoc()) { this.error.set("La carte d'identité est obligatoire"); return; }
    this.loading.set(true);
    this.error.set('');
    const v   = this.form.value;
    const tel = v.telephone!;
    const pin = tel.replace(/\D/g, '').slice(-4).padStart(4, '0');

    let uid: string;
    try {
      this.uploadProgress.set('Création du compte chauffeur…');
      const fn = httpsCallable<unknown, { uid: string; email: string }>(
        this.functions, 'create_driver'
      );
      const result = await fn({
        prenom:    v.prenom,
        nom:       v.nom,
        telephone: tel,
        password:  pin,
        vehicule: {
          marque:          v.marque,
          modele:          v.modele,
          immatriculation: v.immatriculation,
        },
      });
      uid = result.data.uid;
      console.log('[createDriver] UID:', uid, 'Email:', result.data.email);
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '';
      if (msg.includes('permission-denied'))
        this.error.set("Permission refusée — votre compte n'est pas dans la collection admins");
      else if (msg.includes('unauthenticated'))
        this.error.set('Non authentifié — veuillez vous reconnecter');
      else
        this.error.set(msg || 'Erreur lors de la création');
      this.loading.set(false);
      this.uploadProgress.set('');
      return;
    }

    const selectedDocs = this.docs.filter(d => d.file);
    try {
      this.uploadProgress.set('Envoi des documents…');
      const documents: Record<string, string> = {};
      for (const slot of selectedDocs) {
        const path = `chauffeurs/${uid}/${slot.key}.${this.fileExtension(slot.file!)}`;
        await uploadBytes(ref(this.storage, path), slot.file!);
        documents[slot.key] = path;
      }
      await updateDoc(doc(this.firestore, 'drivers', uid), { documents });
      this.snack.open('Chauffeur créé et activé ! Mot de passe : ' + pin, '', { duration: 6000 });
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '';
      this.snack.open(
        `Chauffeur créé (mot de passe : ${pin}) mais l'envoi des documents a échoué : ${msg || 'erreur inconnue'}`,
        '', { duration: 8000 },
      );
    } finally {
      this.loading.set(false);
      this.uploadProgress.set('');
    }
    this.dialogRef.close(true);
  }
}
