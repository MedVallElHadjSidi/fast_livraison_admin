import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc,
  updateDoc, query, where, orderBy, Timestamp,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Candidature, CandidatureStatus } from '../models/candidature.model';

@Injectable({ providedIn: 'root' })
export class CandidatureService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  private toDate(v: unknown): Date {
    if (v instanceof Timestamp) return v.toDate();
    if (typeof v === 'string') return new Date(v);
    return new Date();
  }

  private fromDoc(id: string, data: Record<string, unknown>): Candidature {
    return {
      id,
      nom: data['nom'] as string,
      prenom: data['prenom'] as string,
      telephone: data['telephone'] as string,
      email: data['email'] as string | undefined,
      status: data['status'] as CandidatureStatus,
      vehicule: data['vehicule'] as Candidature['vehicule'],
      documents: data['documents'] as Candidature['documents'],
      createdAt: this.toDate(data['createdAt']),
      notes: data['notes'] as string | undefined,
      approvedAt: data['approvedAt'] ? this.toDate(data['approvedAt']) : undefined,
      rejectedAt: data['rejectedAt'] ? this.toDate(data['rejectedAt']) : undefined,
      driverId: data['driverId'] as string | undefined,
    };
  }

  getByStatus(status: CandidatureStatus): Observable<Candidature[]> {
    const q = query(
      collection(this.firestore, 'candidatures'),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  getAll(): Observable<Candidature[]> {
    const q = query(
      collection(this.firestore, 'candidatures'),
      orderBy('createdAt', 'desc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  async approve(candidatureId: string): Promise<void> {
    // Cloud Function handles Auth account creation + driver doc + WhatsApp notification.
    const fn = httpsCallable(this.functions, 'approve_candidature');
    await fn({ candidatureId });
  }

  async reject(candidatureId: string, notes: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'candidatures', candidatureId), {
      status: 'rejete',
      notes,
      rejectedAt: Timestamp.now(),
    });
  }
}
