import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, Timestamp } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Vendor } from '../models/vendor.model';

@Injectable({ providedIn: 'root' })
export class VendorService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  private toDate(v: unknown): Date {
    if (v instanceof Timestamp) return v.toDate();
    if (typeof v === 'string') return new Date(v);
    return new Date();
  }

  private fromDoc(uid: string, data: Record<string, unknown>): Vendor {
    return {
      uid,
      phoneNumber: data['phoneNumber'] as string,
      name:        data['name'] as string,
      createdAt:   this.toDate(data['createdAt']),
    };
  }

  listAll(): Observable<Vendor[]> {
    return (collectionData(
      collection(this.firestore, 'vendors'), { idField: 'uid' }
    ) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['uid'] as string, d))),
    );
  }

  get(uid: string): Observable<Vendor> {
    return (docData(doc(this.firestore, 'vendors', uid)) as Observable<Record<string, unknown>>).pipe(
      map(d => this.fromDoc(uid, d)),
    );
  }

  async create(nom: string, telephone: string): Promise<{ uid: string; pin: string }> {
    const fn = httpsCallable<unknown, { uid: string; pin: string }>(this.functions, 'create_vendor');
    const result = await fn({ nom, telephone });
    return result.data;
  }
}
