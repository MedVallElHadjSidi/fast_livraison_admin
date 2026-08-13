import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Delivery, PackageSize } from '../models/delivery.model';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);
  private auth      = inject(Auth);

  async calculatePrice(distanceKm?: number, packageSize: PackageSize = 'medium'): Promise<number> {
    const fn = httpsCallable<{ distanceKm?: number; packageSize: string }, { price: number }>(
      this.functions, 'calculate_price'
    );
    const result = await fn({ distanceKm, packageSize });
    return result.data.price;
  }

  async createDelivery(data: Omit<Delivery, 'id' | 'createdAt' | 'createdBy'>): Promise<string> {
    const ref = doc(collection(this.firestore, 'deliveries'));
    await setDoc(ref, {
      ...data,
      estimatedPrice: data.prix,              // compatibilité driver app Flutter
      packageSize:    data.packageSize ?? 'medium',
      status:         'pending',
      createdAt:      serverTimestamp(),
      createdBy:      this.auth.currentUser?.uid ?? '',
    });
    return ref.id;
  }

  getAll(): Observable<Delivery[]> {
    return (collectionData(
      collection(this.firestore, 'deliveries'), { idField: 'id' }
    ) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => d as unknown as Delivery))
    );
  }
}
