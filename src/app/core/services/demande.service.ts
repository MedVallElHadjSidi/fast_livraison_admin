import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, setDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Demande, DemandeStatus, DemandePaymentMethod } from '../models/demande.model';

@Injectable({ providedIn: 'root' })
export class DemandeService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  private toDate(v: unknown): Date {
    if (v instanceof Timestamp) return v.toDate();
    if (typeof v === 'string') return new Date(v);
    return new Date();
  }

  private fromDoc(id: string, data: Record<string, unknown>): Demande {
    return {
      id,
      vendorId:    data['vendorId'] as string,
      vendorName:  data['vendorName'] as string | undefined,
      vendorPhone: data['vendorPhone'] as string | undefined,
      productId:   data['productId'] as string,
      productName: data['productName'] as string,
      quantity:    data['quantity'] as number,
      clientPhone:   data['clientPhone'] as string,
      departure:     data['departure'] as string,
      destination:   data['destination'] as string,
      paymentMethod: data['paymentMethod'] as DemandePaymentMethod,
      status:        data['status'] as DemandeStatus,
      createdAt:   this.toDate(data['createdAt']),
      updatedAt:   data['updatedAt'] ? this.toDate(data['updatedAt']) : undefined,
    };
  }

  /** Vue admin : toutes les demandes, tous vendeurs confondus. */
  listAll(): Observable<Demande[]> {
    const q = query(collection(this.firestore, 'demandes'), orderBy('createdAt', 'desc'));
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  /** Vue vendeur : uniquement ses propres demandes. */
  listMine(vendorId: string): Observable<Demande[]> {
    const q = query(
      collection(this.firestore, 'demandes'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  async create(data: {
    vendorId: string; vendorName?: string; vendorPhone?: string;
    productId: string; productName: string; quantity: number;
    clientPhone: string; departure: string; destination: string;
    paymentMethod: DemandePaymentMethod;
  }): Promise<string> {
    const ref = doc(collection(this.firestore, 'demandes'));
    await setDoc(ref, {
      vendorId:      data.vendorId,
      vendorName:    data.vendorName ?? null,
      vendorPhone:   data.vendorPhone ?? null,
      productId:     data.productId,
      productName:   data.productName,
      quantity:      data.quantity,
      clientPhone:   data.clientPhone,
      departure:     data.departure,
      destination:   data.destination,
      paymentMethod: data.paymentMethod,
      status:        'en_cours' as DemandeStatus,
      createdAt:     serverTimestamp(),
    });
    return ref.id;
  }

  async updateStatus(demandeId: string, status: DemandeStatus): Promise<void> {
    const fn = httpsCallable(this.functions, 'update_demande_status');
    await fn({ demandeId, status });
  }
}
