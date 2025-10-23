import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { Notification, User, Reservation, ParkingLot } from '../../types';
import { CheckmarkCircleIcon, TrashIcon, WalletIcon, CarIcon, ClockIcon, SpinnerIcon } from '../Icons';

interface NotificationCardProps {
  notification: Notification;
  reservation?: Reservation;
  onDelete: (id: string) => void;
  onMarkAsParked: (reservationId: string) => void;
  onLeftParking: (reservationId: string) => void;
  className?: string;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification, reservation, onDelete, onMarkAsParked, onLeftParking, className = "" }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'RESERVED': return <CheckmarkCircleIcon className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />;
      case 'TIME_EXPIRED': return <ClockIcon className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />;
      default: return <CheckmarkCircleIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />;
    }
  };

  const renderActionButton = () => {
    if (!reservation || notification.type !== 'RESERVED') {
      return null;
    }

    if (reservation.status === 'confirmed') {
      return (
        <button onClick={() => onMarkAsParked(reservation.id)} className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm w-full">
          Mark as Parked (Starts Timer)
        </button>
      );
    }

    if (reservation.status === 'active') {
      return (
        <button onClick={() => onLeftParking(reservation.id)} className="mt-3 bg-pink-600 hover:bg-pink-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm w-full">
          I've Left Parking
        </button>
      );
    }

    return null;
  };

  return (
    <div className={`group relative flex-col rounded-xl bg-white dark:bg-slate-950 p-4 shadow-lg dark:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/20 ${notification.isRead ? 'opacity-60' : ''} ${className}`}>
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-20 dark:group-hover:opacity-30 ${notification.isRead ? '!opacity-5' : ''}`}></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative flex gap-4">
            <div className="flex-shrink-0">{getIcon()}</div>
            <div className="flex-grow">
                <p className="text-gray-900 dark:text-white">{notification.message}</p>
                {notification.type === 'RESERVED' && notification.data && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400 mt-2">
                        <span className="flex items-center gap-1"><CarIcon className="w-4 h-4"/>{notification.data.carPlate}</span>
                        <span className="flex items-center gap-1"><WalletIcon className="w-4 h-4"/>${notification.data.amountPaid?.toFixed(2)}</span>
                        <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4"/>{notification.data.hoursLeft}h reserved</span>
                    </div>
                )}
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{notification.timestamp.toDate().toLocaleString()}</p>
                {renderActionButton()}
            </div>
            <button onClick={() => onDelete(notification.id)} className="text-gray-400 dark:text-slate-500 hover:text-pink-500 transition-colors self-start">
                <TrashIcon />
            </button>
        </div>
    </div>
  );
};

interface NotificationsScreenProps {
  user: User | null;
  reservations: Reservation[];
  onSessionComplete: () => void;
}

const NotificationsScreen = ({ user, reservations, onSessionComplete }: NotificationsScreenProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reservationsMap = new Map(reservations.map(r => [r.id, r]));

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        setNotifications([]);
        return;
    };
    
    setIsLoading(true);
    const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
        // Sort client-side to avoid needing a composite index in Firestore
        notifs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        setNotifications(notifs);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching notifications: ", error);
        setIsLoading(false);
    });

    return () => unsubscribe();

  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification: ", error);
    }
  };

  const handleMarkAsParked = async (reservationId: string) => {
    const reservation = reservationsMap.get(reservationId);
    if (!reservation) return;

    try {
      const resDocRef = doc(db, 'reservations', reservationId);
      const now = new Date();
      const newEndTime = new Date(now.getTime() + reservation.durationHours * 60 * 60 * 1000);
      
      await updateDoc(resDocRef, {
        status: 'active',
        startTime: Timestamp.fromDate(now),
        endTime: Timestamp.fromDate(newEndTime)
      });
      // UI will update via the real-time listener in App.tsx
    } catch (error) {
      console.error("Error marking as parked:", error);
      alert("Could not update parking status.");
    }
  };

  const handleLeftParking = async (reservationId: string) => {
    const reservation = reservationsMap.get(reservationId);
    if (!reservation) return;

    try {
      const lotDocRef = doc(db, 'parkingLots', reservation.parkingLotId);
      const resDocRef = doc(db, 'reservations', reservationId);

      await runTransaction(db, async (transaction) => {
        const lotDoc = await transaction.get(lotDocRef);
        if (!lotDoc.exists()) throw new Error("Parking lot not found!");
        
        const lotData = lotDoc.data() as ParkingLot;
        const slotIndex = lotData.slots.findIndex(s => s.id === reservation.slotId);
        if (slotIndex > -1) {
          lotData.slots[slotIndex].isOccupied = false;
          transaction.update(lotDocRef, { slots: lotData.slots });
        }
        
        transaction.update(resDocRef, { status: 'completed' });
      });
      onSessionComplete();
    } catch (error) {
      console.error("Error marking as left:", error);
      alert("Could not update parking status.");
    }
  };

  return (
    <div className="p-4 pt-24 pb-28 space-y-4 overflow-y-auto h-full animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 animate-slide-in-1">Notifications</h1>
      {isLoading ? (
        <div className="text-center py-10">
            <SpinnerIcon className="w-8 h-8 mx-auto text-indigo-500 dark:text-indigo-400"/>
        </div>
      ) : notifications.length > 0 ? (
        notifications.map((n, index) => {
          const reservation = n.data?.reservationId ? reservationsMap.get(n.data.reservationId) : undefined;
          return (
            <NotificationCard 
                key={n.id} 
                notification={n} 
                reservation={reservation}
                onDelete={handleDelete} 
                onMarkAsParked={handleMarkAsParked}
                onLeftParking={handleLeftParking}
                className={`animate-slide-in-${index + 2}`} 
            />
          );
        })
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-slate-400">You have no new notifications.</p>
        </div>
      )}
    </div>
  );
};

export default NotificationsScreen;