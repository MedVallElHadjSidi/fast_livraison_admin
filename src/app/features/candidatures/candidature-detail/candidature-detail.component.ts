import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Storage, ref, getDownloadURL } from '@angular/fire/storage';
import { Candidature } from '../../../core/models/candidature.model';
import { CandidatureService } from '../../../core/services/candidature.service';

@Component({
  selector: 'app-candidature-detail',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './candidature-detail.component.html',
  styleUrl: './candidature-detail.component.scss',
})
export class CandidatureDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private svc = inject(CandidatureService);
  private snack = inject(MatSnackBar);

  candidature = signal<Candidature | null>(null);
  loading = signal(true);
  approving = signal(false);
  rejecting = signal(false);
  rejectNotes = signal('');
  showRejectForm = signal(false);
  docUrls = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    const snap = await getDoc(doc(this.firestore, 'candidatures', id));
    if (snap.exists()) {
      const data = snap.data();
      const c: Candidature = {
        id: snap.id,
        nom: data['nom'],
        prenom: data['prenom'],
        telephone: data['telephone'],
        email: data['email'],
        status: data['status'],
        vehicule: data['vehicule'],
        documents: data['documents'],
        createdAt: data['createdAt']?.toDate() ?? new Date(),
        notes: data['notes'],
        approvedAt: data['approvedAt']?.toDate(),
        rejectedAt: data['rejectedAt']?.toDate(),
        driverId: data['driverId'],
      };
      this.candidature.set(c);
      await this.loadDocUrls(c);
    }
    this.loading.set(false);
  }

  private async loadDocUrls(c: Candidature): Promise<void> {
    const keys: Array<keyof typeof c.documents> = [
      'photoIdentite', 'permisConduite', 'photoVehicule', 'carteGrise',
    ];
    const urls: Record<string, string> = {};
    for (const key of keys) {
      const path = c.documents[key];
      if (path) {
        try {
          urls[key] = await getDownloadURL(ref(this.storage, path));
        } catch { /* file may not exist */ }
      }
    }
    this.docUrls.set(urls);
  }

  async approve(): Promise<void> {
    const c = this.candidature();
    if (!c?.id) return;
    this.approving.set(true);
    try {
      await this.svc.approve(c.id);
      this.snack.open('Candidature approuvée — compte créé et chauffeur notifié', '', { duration: 4000 });
      this.router.navigate(['/candidatures']);
    } catch (e: unknown) {
      this.snack.open('Erreur : ' + (e instanceof Error ? e.message : 'inconnue'), '', { duration: 4000 });
    } finally {
      this.approving.set(false);
    }
  }

  async reject(): Promise<void> {
    const c = this.candidature();
    if (!c?.id) return;
    this.rejecting.set(true);
    try {
      await this.svc.reject(c.id, this.rejectNotes());
      this.snack.open('Candidature rejetée', '', { duration: 3000 });
      this.router.navigate(['/candidatures']);
    } catch {
      this.snack.open('Erreur lors du rejet', '', { duration: 3000 });
    } finally {
      this.rejecting.set(false);
    }
  }

  openDoc(url: string): void { window.open(url, '_blank'); }

  back(): void { this.router.navigate(['/candidatures']); }

  docLabel(key: string): string {
    return ({
      photoIdentite: "Carte d'identité",
      permisConduite: 'Permis de conduire',
      photoVehicule: 'Photo du véhicule',
      carteGrise: 'Carte grise',
    } as Record<string, string>)[key] ?? key;
  }
}
