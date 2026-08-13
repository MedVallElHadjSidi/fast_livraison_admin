export type DriverStatus = 'online' | 'offline' | 'busy';

export interface Driver {
  uid: string;
  phoneNumber: string;
  name?: string;
  status: DriverStatus;
  balance: number;
  lat?: number;
  lng?: number;
  lastSeen?: Date;
}
