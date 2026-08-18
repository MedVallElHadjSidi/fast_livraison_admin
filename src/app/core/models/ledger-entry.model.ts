export type PaymentMethod = 'bankily' | 'masrivi' | 'sedad';

export interface LedgerEntry {
  id: string;
  amount: number;
  driverId?: string;
  driverPhone?: string;
  driverName?: string;
  reason?: string;
  paymentMethod?: PaymentMethod;
  courseId?: string;
  deliveryId?: string;
  createdAt: Date;
}
