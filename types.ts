
import type { Timestamp, GeoPoint } from 'firebase/firestore';

export type ActiveTab = 'home' | 'map' | 'notifications' | 'settings' | 'notices';

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
}

export interface User {
  uid: string; // Changed from id to uid to match Firebase Auth
  username: string;
  email: string;
  carPlate: string;
  ecocashNumber: string;
  lastViewedNotices?: Timestamp;
  favoriteParkingLots?: string[];
}

// This represents the user object combined with their reservations for use in components
export interface UserWithReservations extends User {
    reservations: Reservation[];
}

export interface ParkingSlot {
  id: string;
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
  type: 'RESERVED' | 'TIME_EXPIRED' | 'PAYMENT_CONFIRMED' | 'GENERIC' | 'REVIEW_REPLY';
  message: string;
  isRead: boolean;
  timestamp: Timestamp; // Changed to Firestore Timestamp
  data?: {
    reservationId?: string;
    carPlate?: string;
    amountPaid?: number;
    hoursLeft?: number;
    reviewId?: string;
  };
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  timestamp: Timestamp;
}

export interface Review {
  id: string;
  userId: string;
  username: string;
  parkingLotId: string;
  parkingLotName: string;
  rating: number; // 1 to 5
  comment: string;
  timestamp: Timestamp;
  adminReply?: string;
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