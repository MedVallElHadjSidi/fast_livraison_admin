import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { switchMap, startWith } from 'rxjs/operators';
import { of, BehaviorSubject } from 'rxjs';
import { CandidatureService } from '../../../core/services/candidature.service';
import { Candidature, CandidatureStatus } from '../../../core/models/candidature.model';

@Component({
  selector: 'app-candidature-list',
  standalone: true,
  imports: [
    AsyncPipe, DatePipe, RouterModule,
    MatTableModule, MatTabsModule, MatChipsModule,
    MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule,
  ],
  templateUrl: './candidature-list.component.html',
  styleUrl: './candidature-list.component.scss',
})
export class CandidatureListComponent {
  private svc = inject(CandidatureService);

  activeStatus = signal<CandidatureStatus>('en_attente');
  displayedColumns = ['nom', 'telephone', 'vehicule', 'createdAt', 'actions'];

  candidatures$ = this.svc.getByStatus(this.activeStatus());

  tabs: { label: string; status: CandidatureStatus; icon: string }[] = [
    { label: 'En attente',  status: 'en_attente', icon: 'hourglass_empty' },
    { label: 'Approuvées',  status: 'approuve',   icon: 'check_circle'    },
    { label: 'Rejetées',    status: 'rejete',      icon: 'cancel'          },
  ];

  selectTab(status: CandidatureStatus): void {
    this.activeStatus.set(status);
    this.candidatures$ = this.svc.getByStatus(status);
  }

  vehiculeLabel(c: Candidature): string {
    return `${c.vehicule.marque} ${c.vehicule.modele} (${c.vehicule.immatriculation})`;
  }

  statusColor(status: CandidatureStatus): string {
    return { en_attente: 'warn', approuve: 'accent', rejete: 'primary' }[status] ?? '';
  }
}
