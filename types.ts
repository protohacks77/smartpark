import type { Timestamp, GeoPoint } from 'firebase/firestore';

export type ActiveTab = 'home' | 'map' | 'notifications' | 'settings';

export type Theme = 'dark' | 'light';

export interface Reservation {
  id: string;
  userId: string;
  parkingLotId: string;
  parkingLotName: string;
  slotId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  durationHours: number;
  amountPaid: number;
  status: 'confirmed' | 'active' | 'completed' | 'expired';
  paymentIntentId?: string;
}

export interface User {
  uid: string; // Changed from id to uid to match Firebase Auth
  username: string;
  email: string;
  carPlate: string;
  ecocashNumber: string;
}

// This represents the user object combined with their reservations for use in components
export interface UserWithReservations extends User {
    reservations: Reservation[];
}

export interface ParkingSlot {
  id:string;
  isOccupied: boolean;
  reservedUntil?: Timestamp;
  coords?: {
    lat: number;
    lng: number;
  };
}

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  location: GeoPoint; // Changed to Firestore GeoPoint
  slots: ParkingSlot[];
  hourlyRate: number;
}

export interface Notification {
  id:string;
  userId: string;
  type: 'RESERVED' | 'TIME_EXPIRED' | 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED' | 'GENERIC';
  message: string;
  isRead: boolean;
  timestamp: Timestamp; // Changed to Firestore Timestamp
  data?: {
    reservationId?: string;
    carPlate?: string;
    amountPaid?: number;
    hoursLeft?: number;
    parkingLotName?: string;
  };
}

export interface PaymentIntent {
  id: string; // Document ID
  userId: string;
  parkingLotId: string;
  parkingLotName: string;
  slotId: string;
  durationHours: number;
  amount: number;
  currency: 'USD' | 'ZWL';
  ecocashNumber: string;
  status: 'pending' | 'successful' | 'failed' | 'expired';
  pollUrl?: string; // from Paynow
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WeeklyReservations {
  day: string;
  reservations: number;
}

export interface RevenueData {
  [period: string]: {
    usd: number;
    zwl: number;
  };
}
