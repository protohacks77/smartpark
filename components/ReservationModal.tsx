
import React, { useState, useMemo, useEffect } from 'react';
import type { ParkingLot, User } from '../types';



import React, { useState, useMemo, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { functions, db } from '../services/firebase';
import type { ParkingLot, User, PaymentIntent } from '../types';
import { LocationIcon, CarIcon, ClockIcon, SpinnerIcon, WalletIcon, CheckmarkCircleIcon, CloseCircleIcon } from './Icons';



import React, { useState, useMemo, useEffect } from 'react';
import type { ParkingLot } from '../types';

import { LocationIcon, CarIcon, ClockIcon, SpinnerIcon } from './Icons';

interface ReservationModalProps {
  onClose: () => void;
  lot: ParkingLot;
  user: User;
}

const ReservationModal = ({ onClose, lot, user }: ReservationModalProps) => {
  const [step, setStep] = useState<'select' | 'confirm' | 'processing'>('select');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [hours, setHours] = useState(1);

  const maxHours = 8;

  const availableSlots = useMemo(() => lot.slots.filter(s => !s.isOccupied), [lot]);
  const totalPrice = useMemo(() => (hours * lot.hourlyRate).toFixed(2), [hours, lot.hourlyRate]);

  useEffect(() => {
    // Reset state when the component is mounted (i.e., becomes visible)
    setStep('select');
    setSelectedSlotId(null);
    setHours(1);
  }, [lot.id]); // Reset when the lot changes

  const handleSelectSlot = (slotId: string) => {
    setSelectedSlotId(slotId);
    setStep('confirm');
  };

  const handleSubmit = () => {
    if (!selectedSlotId || !user) return;
    setStep('processing');
    
    const params = new URLSearchParams({
      lotId: lot.id,
      slotId: selectedSlotId,
      hours: hours.toString(),
      amount: totalPrice,
      userId: user.uid,
      email: user.email,
      lotName: lot.name,
      lotAddress: lot.address,
      destinationLat: lot.location.latitude.toString(),
      destinationLng: lot.location.longitude.toString(),
    });

    // Redirect to the new payment page with all necessary details
    window.location.href = `/payment.html?${params.toString()}`;
  };

  return (
    <div
      className="group relative flex flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl w-full animate-fade-in-fast"
      onClick={(e) => e.stopPropagation()}
    >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative text-gray-900 dark:text-white">

            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
              <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
            </button>

            {step === 'select' && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-center mb-1 text-indigo-500 dark:text-indigo-400">Select an Available Spot</h2>
                <p className="text-sm text-center text-gray-500 dark:text-slate-400 mb-4">{lot.name}</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
                  {availableSlots.map(slot => (
                    <button 
                      key={slot.id} 
                      onClick={() => handleSelectSlot(slot.id)}
                      className="aspect-square flex items-center justify-center rounded-lg bg-gray-200/50 dark:bg-slate-800/50 hover:bg-gray-300 dark:hover:bg-slate-700 font-bold text-gray-900 dark:text-white transition-colors"
                    >
                      {slot.id.toUpperCase()}
                    </button>
                  ))}
                  {availableSlots.length === 0 && (
                      <p className="col-span-full text-center text-gray-400 dark:text-slate-500 py-4">No available spots.</p>
                  )}
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-center mb-1 text-indigo-500 dark:text-indigo-400">Confirm Reservation</h2>
                <p className="text-sm text-center text-gray-500 dark:text-slate-400 mb-4">{lot.name}</p>
                
                <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><LocationIcon className="w-5 h-5"/> Location</span>
                        <span className="font-semibold">{lot.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><CarIcon className="w-5 h-5"/> Spot</span>
                        <span className="font-bold text-lg text-cyan-500 dark:text-cyan-400">{selectedSlotId?.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><ClockIcon className="w-5 h-5"/> Duration</span>
                        <span className="font-semibold">{hours} hour{hours > 1 ? 's' : ''}</span>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Select Duration (max {maxHours} hours)</label>
                    <input 
                        type="range" 
                        min="1" 
                        max={maxHours} 
                        value={hours} 
                        onChange={(e) => setHours(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                
                <div className="text-center mb-4">
                    <p className="text-gray-500 dark:text-slate-400">Total Price</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">${totalPrice}</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => setStep('select')} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                        Back
                    </button>
                    <button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">
                        Confirm & Pay
                    </button>
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="p-6 flex flex-col items-center justify-center min-h-[250px]">
                <div className="loader"></div>
                <p className="text-lg font-semibold mt-4">Processing your reservation...</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Please wait a moment.</p>
              </div>
            )}
            
        </div>
    </div>
  );
};

export default ReservationModal;
