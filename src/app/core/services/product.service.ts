import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, deleteObject } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private firestore = inject(Firestore);
  private storage   = inject(Storage);

  private toDate(v: unknown): Date {
    if (v instanceof Timestamp) return v.toDate();
    if (typeof v === 'string') return new Date(v);
    return new Date();
  }

  private fromDoc(id: string, data: Record<string, unknown>): Product {
    return {
      id,
      vendorId:          data['vendorId'] as string,
      vendorName:        data['vendorName'] as string | undefined,
      vendorPhone:       data['vendorPhone'] as string | undefined,
      name:              data['name'] as string,
      priceWithDelivery: data['priceWithDelivery'] as number,
      quantity:          data['quantity'] as number,
      imagePath:         data['imagePath'] as string | undefined,
      createdAt:         this.toDate(data['createdAt']),
      updatedAt:         data['updatedAt'] ? this.toDate(data['updatedAt']) : undefined,
    };
  }

  /** Vue admin : catalogue complet, tous vendeurs confondus. */
  listAll(): Observable<Product[]> {
    const q = query(collection(this.firestore, 'products'), orderBy('createdAt', 'desc'));
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  /** Vue vendeur : uniquement ses propres produits. */
  listMine(vendorId: string): Observable<Product[]> {
    const q = query(
      collection(this.firestore, 'products'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  async create(data: {
    vendorId: string; vendorName?: string; vendorPhone?: string;
    name: string; priceWithDelivery: number; quantity: number; image?: File;
  }): Promise<string> {
    const ref_ = doc(collection(this.firestore, 'products'));
    let imagePath: string | undefined;
    if (data.image) {
      imagePath = `products/${ref_.id}.${this.fileExtension(data.image)}`;
      await uploadBytes(ref(this.storage, imagePath), data.image);
    }
    await setDoc(ref_, {
      vendorId:          data.vendorId,
      vendorName:        data.vendorName ?? null,
      vendorPhone:       data.vendorPhone ?? null,
      name:              data.name,
      priceWithDelivery: data.priceWithDelivery,
      quantity:          data.quantity,
      imagePath:         imagePath ?? null,
      createdAt:         serverTimestamp(),
    });
    return ref_.id;
  }

  async update(productId: string, data: {
    name: string; priceWithDelivery: number; quantity: number; image?: File;
  }): Promise<void> {
    const update: Record<string, unknown> = {
      name:              data.name,
      priceWithDelivery: data.priceWithDelivery,
      quantity:          data.quantity,
      updatedAt:         serverTimestamp(),
    };
    if (data.image) {
      const imagePath = `products/${productId}.${this.fileExtension(data.image)}`;
      await uploadBytes(ref(this.storage, imagePath), data.image);
      update['imagePath'] = imagePath;
    }
    await updateDoc(doc(this.firestore, 'products', productId), update);
  }

  async delete(product: Product): Promise<void> {
    if (product.imagePath) {
      try { await deleteObject(ref(this.storage, product.imagePath)); } catch { /* déjà absent */ }
    }
    await deleteDoc(doc(this.firestore, 'products', product.id));
  }

  private fileExtension(file: File): string {
    const fromName = file.name.split('.').pop();
    if (fromName && fromName.length <= 5) return fromName.toLowerCase();
    return (file.type.split('/')[1] || 'jpg').toLowerCase();
  }
}
