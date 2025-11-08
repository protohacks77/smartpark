import React from 'react';
import type { ParkingLot, Reservation, User } from '../../types';
import Countdown from './Countdown';

interface ParkingBayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot: ParkingLot | null;
  reservations: Reservation[];
  users: User[];
}

const ParkingBayDetailsModal = ({ isOpen, onClose, lot, reservations, users }: ParkingBayDetailsModalProps) => {
  if (!isOpen || !lot) return null;

  const getOccupiedSlots = () => {
    return reservations.filter(res => res.parkingLotId === lot.id && res.status === 'active');
  };

  const getUser = (userId: string) => users.find(u => u.uid === userId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 p-6 rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">{lot.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getOccupiedSlots().map(res => {
            const user = getUser(res.userId);
            return (
              <div key={res.id} className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <p className="font-bold text-lg text-cyan-500 dark:text-cyan-400">Slot {res.slotId.toUpperCase()}</p>
                <p>User: {user?.username || 'Unknown'}</p>
                <p>Plate: {res.carPlate || 'N/A'}</p>
                <p>Time Left: <Countdown endTime={res.endTime} /></p>
              </div>
            );
          })}
          {getOccupiedSlots().length === 0 && (
            <p className="text-gray-500 dark:text-slate-400">No occupied slots.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingBayDetailsModal;
