
import React from 'react';
import type { User, Reservation, ParkingLot } from '../../types';
import { LayersIcon, CarIcon, WalletIcon, ClockIcon } from '../Icons';

interface LocationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    lot: ParkingLot;
    slotId?: string;
  };
  allReservations: Reservation[];
  allUsers: User[];
}

const LocationInfoModal = ({ isOpen, onClose, data, allReservations, allUsers }: LocationInfoModalProps) => {
  if (!isOpen) return null;

  const { lot, slotId } = data;

  const relevantReservations = allReservations.filter(res => {
    if (slotId) {
      return res.parkingLotId === lot.id && res.slotId === slotId;
    }
    return res.parkingLotId === lot.id;
  }).sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
  
  const totalRevenue = relevantReservations.reduce((sum, res) => sum + res.amountPaid, 0);

  const title = slotId ? `Slot ${slotId.toUpperCase()} @ ${lot.name}` : lot.name;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="group relative flex w-full max-w-3xl flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative p-6 text-gray-900 dark:text-white max-h-[90vh] flex flex-col">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
            <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
          </button>

          <h2 className="text-2xl font-bold text-center mb-2 text-indigo-500 dark:text-indigo-400">Location Details</h2>
          <p className="text-center text-gray-800 dark:text-slate-300 font-semibold text-lg mb-6">{title}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-center">
            <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-slate-400">Total Reservations</p>
                <p className="text-3xl font-bold">{relevantReservations.length}</p>
            </div>
            <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-slate-400">Total Revenue</p>
                <p className="text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          <h3 className="font-bold text-lg text-indigo-500 dark:text-indigo-400 mb-3">Reservation History</h3>
          <div className="flex-grow overflow-y-auto pr-2">
            {relevantReservations.length > 0 ? (
                 <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white dark:bg-slate-950">
                        <tr className="border-b border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-slate-400">
                            <th className="p-2">Date</th>
                            <th className="p-2">User</th>
                            <th className="p-2">Car Plate</th>
                            <th className="p-2 text-right">Duration</th>
                            <th className="p-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {relevantReservations.map(res => {
                            const user = allUsers.find(u => u.uid === res.userId);
                            return (
                                <tr key={res.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                    <td className="p-2 text-sm text-gray-600 dark:text-slate-300">{res.startTime.toDate().toLocaleDateString()}</td>
                                    <td className="p-2">{user?.username || 'N/A'}</td>
                                    <td className="p-2 font-mono">{user?.carPlate || 'N/A'}</td>
                                    <td className="p-2 text-right">{res.durationHours}h</td>
                                    <td className="p-2 text-right font-semibold">${res.amountPaid.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
            ) : (
                <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-slate-400">No reservation history for this location.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationInfoModal;