import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, setDoc, updateDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Course, CourseStatus } from '../models/course.model';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);
  private auth      = inject(Auth);

  private toDate(v: unknown): Date {
    if (v instanceof Timestamp) return v.toDate();
    if (typeof v === 'string') return new Date(v);
    return new Date();
  }

  private fromDoc(id: string, data: Record<string, unknown>): Course {
    return {
      id,
      driverId:    data['driverId'] as string | undefined,
      driverPhone: data['driverPhone'] as string | undefined,
      driverName:  data['driverName'] as string | undefined,
      clientPhone: data['clientPhone'] as string,
      departure:   data['departure'] as string,
      destination: data['destination'] as string,
      date:        this.toDate(data['date']),
      prix:        data['prix'] as number,
      commission:  data['commission'] as number | undefined,
      status:      data['status'] as CourseStatus,
      createdAt:   this.toDate(data['createdAt']),
      updatedAt:   data['updatedAt'] ? this.toDate(data['updatedAt']) : undefined,
    };
  }

  listByDriver(driverId: string): Observable<Course[]> {
    const q = query(
      collection(this.firestore, 'courses'),
      where('driverId', '==', driverId),
      orderBy('date', 'desc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  listAll(): Observable<Course[]> {
    const q = query(
      collection(this.firestore, 'courses'),
      orderBy('date', 'desc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
      map(docs => docs.map(d => this.fromDoc(d['id'] as string, d))),
    );
  }

  async create(data: {
    driverId?: string; driverPhone?: string; driverName?: string;
    clientPhone: string; departure: string; destination: string; date: Date; prix: number;
  }): Promise<string> {
    const ref = doc(collection(this.firestore, 'courses'));
    await setDoc(ref, {
      driverId:    data.driverId ?? null,
      driverPhone: data.driverPhone ?? null,
      driverName:  data.driverName ?? null,
      clientPhone: data.clientPhone,
      departure:   data.departure,
      destination: data.destination,
      date:        Timestamp.fromDate(data.date),
      prix:        data.prix,
      status:      'en_cours' as CourseStatus,
      createdAt:   serverTimestamp(),
      createdBy:   this.auth.currentUser?.uid ?? '',
    });
    return ref.id;
  }

  async updateInfo(courseId: string, data: {
    clientPhone: string; departure: string; destination: string; date: Date; prix: number;
  }): Promise<void> {
    await updateDoc(doc(this.firestore, 'courses', courseId), {
      clientPhone: data.clientPhone,
      departure:   data.departure,
      destination: data.destination,
      date:        Timestamp.fromDate(data.date),
      prix:        data.prix,
      updatedAt:   serverTimestamp(),
    });
  }

  async updateStatus(
    courseId: string, status: CourseStatus, driverId?: string,
  ): Promise<{ commission: number | null }> {
    const fn = httpsCallable<unknown, { commission: number | null }>(this.functions, 'update_course_status');
    const result = await fn({ courseId, status, driverId });
    return result.data;
  }
}
