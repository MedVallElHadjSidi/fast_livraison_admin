import { Injectable, inject } from '@angular/core';
import {
  Firestore, collectionGroup, collectionData,
  query, orderBy, limit, Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LedgerEntry } from '../models/ledger-entry.model';

const MAX_ENTRIES = 300;

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private firestore = inject(Firestore);

  private toDate(v: unknown): Date {
    if (v instanceof Timestamp) return v.toDate();
    if (typeof v === 'string') return new Date(v);
    return new Date();
  }

  private fromDoc(id: string, data: Record<string, unknown>): LedgerEntry {
    return {
      id,
      amount:        data['amount'] as number,
      driverId:      data['driverId'] as string | undefined,
      driverPhone:   data['driverPhone'] as string | undefined,
      driverName:    data['driverName'] as string | undefined,
      reason:        data['reason'] as string | undefined,
      paymentMethod: data['paymentMethod'] as LedgerEntry['paymentMethod'],
      courseId:      data['courseId'] as string | undefined,
      deliveryId:    data['deliveryId'] as string | undefined,
      createdAt:     this.toDate(data['createdAt']),
    };
  }

  listDebits(): Observable<LedgerEntry[]> {
    const q = query(
      collectionGroup(this.firestore, 'debits'),
      orderBy('createdAt', 'desc'),
      limit(MAX_ENTRIES),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  listCredits(): Observable<LedgerEntry[]> {
    const q = query(
      collectionGroup(this.firestore, 'credits'),
      orderBy('createdAt', 'desc'),
      limit(MAX_ENTRIES),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }
}
