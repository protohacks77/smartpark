import React, { useState, useMemo, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { functions, db } from '../services/firebase';
import type { ParkingLot, User, PaymentIntent } from '../types';
import { LocationIcon, CarIcon, ClockIcon, SpinnerIcon, WalletIcon, CheckmarkCircleIcon, CloseCircleIcon } from './Icons';

type PaymentStep = 'selectSlot' | 'confirmDetails' | 'choosePayment' | 'enterPhone' | 'processing' | 'success' | 'failure';
type PaymentMethod = 'ECOCASH_USD' | 'ECOCASH_ZWL';

interface ReservationModalProps {
  onClose: () => void;
  onSuccess: (lotId: string) => void;
  lot: ParkingLot;
  user: User;
}

const ReservationModal = ({ onClose, onSuccess, lot, user }: ReservationModalProps) => {
  const [step, setStep] = useState<PaymentStep>('selectSlot');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [ecocashNumber, setEcocashNumber] = useState(user.ecocashNumber || '');
  const [processingMessage, setProcessingMessage] = useState('Processing your reservation...');
  const [failureMessage, setFailureMessage] = useState('An unknown error occurred.');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const maxHours = 8;
  const availableSlots = useMemo(() => lot.slots.filter(s => !s.isOccupied), [lot]);
  const totalPrice = useMemo(() => (hours * lot.hourlyRate).toFixed(2), [hours, lot.hourlyRate]);

  // Real-time listener for payment status
  useEffect(() => {
    if (step !== 'processing' || !paymentIntentId) return;

    const intentDocRef = doc(db, 'paymentIntents', paymentIntentId);
    const unsubscribe = onSnapshot(intentDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const intent = docSnap.data() as PaymentIntent;
        if (intent.status === 'successful') {
          setStep('success');
          unsubscribe();
        } else if (intent.status === 'failed') {
          setFailureMessage('Your payment failed or was cancelled. Please try again.');
          setStep('failure');
          unsubscribe();
        }
      }
    });

    return () => unsubscribe();
  }, [step, paymentIntentId]);

  // Reset state when the modal becomes visible or the lot changes
  useEffect(() => {
    setStep('selectSlot');
    setSelectedSlotId(null);
    setHours(1);
    setPaymentMethod(null);
    setEcocashNumber(user.ecocashNumber || '');
    setPaymentIntentId(null);
  }, [lot.id, user.ecocashNumber]);

  const handleSelectSlot = (slotId: string) => {
    setSelectedSlotId(slotId);
    setStep('confirmDetails');
  };

  const handleChoosePayment = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setStep('enterPhone');
  };
  
  const handlePay = async () => {
    if (!selectedSlotId || !paymentMethod || !ecocashNumber) return;
    setStep('processing');
    setProcessingMessage('Initiating secure payment...');

    const initiatePayment = httpsCallable(functions, 'initiate-payment');
    try {
      const result = await initiatePayment({
        lotId: lot.id,
        slotId: selectedSlotId,
        hours: hours,
        paymentMethod: paymentMethod,
        ecocashNumber: ecocashNumber,
        amount: parseFloat(totalPrice)
      });
      
      const data = result.data as { success: boolean, message: string, intentId?: string, instructions?: string };

      if (data.success && data.intentId) {
        setPaymentIntentId(data.intentId);
        setProcessingMessage(data.instructions || 'Awaiting payment confirmation. Please enter your PIN on your phone.');
      } else {
        setFailureMessage(data.message || 'Could not initiate payment.');
        setStep('failure');
      }
    } catch (error) {
      console.error("Error calling initiate-payment function:", error);
      setFailureMessage('A server error occurred. Please try again later.');
      setStep('failure');
    }
  };

  const handleTryAgain = () => {
    setStep('confirmDetails');
    setPaymentIntentId(null);
  }

  const renderContent = () => {
    switch (step) {
      case 'selectSlot':
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold text-center mb-1 text-indigo-500 dark:text-indigo-400">Select an Available Spot</h2>
            <p className="text-sm text-center text-gray-500 dark:text-slate-400 mb-4">{lot.name}</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
              {availableSlots.map(slot => (
                <button key={slot.id} onClick={() => handleSelectSlot(slot.id)} className="aspect-square flex items-center justify-center rounded-lg bg-gray-200/50 dark:bg-slate-800/50 hover:bg-gray-300 dark:hover:bg-slate-700 font-bold text-gray-900 dark:text-white transition-colors">
                  {slot.id.toUpperCase()}
                </button>
              ))}
              {availableSlots.length === 0 && <p className="col-span-full text-center text-gray-400 dark:text-slate-500 py-4">No available spots.</p>}
            </div>
          </div>
        );
      case 'confirmDetails':
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold text-center mb-1 text-indigo-500 dark:text-indigo-400">Confirm Reservation</h2>
            <p className="text-sm text-center text-gray-500 dark:text-slate-400 mb-4">{lot.name}</p>
            <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg space-y-3 mb-4">
              <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><LocationIcon className="w-5 h-5"/> Location</span><span className="font-semibold">{lot.name}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><CarIcon className="w-5 h-5"/> Spot</span><span className="font-bold text-lg text-cyan-500 dark:text-cyan-400">{selectedSlotId?.toUpperCase()}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><ClockIcon className="w-5 h-5"/> Duration</span><span className="font-semibold">{hours} hour{hours > 1 ? 's' : ''}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Select Duration (max {maxHours} hours)</label>
              <input type="range" min="1" max={maxHours} value={hours} onChange={(e) => setHours(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div className="text-center mb-4"><p className="text-gray-500 dark:text-slate-400">Total Price</p><p className="text-3xl font-bold text-gray-900 dark:text-white">${totalPrice}</p></div>
            <div className="flex gap-2">
              <button onClick={() => setStep('selectSlot')} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">Back</button>
              <button onClick={() => setStep('choosePayment')} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">Proceed to Payment</button>
            </div>
          </div>
        );
      case 'choosePayment':
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-indigo-500 dark:text-indigo-400">Choose Payment Method</h2>
            <div className="space-y-4">
              <button onClick={() => handleChoosePayment('ECOCASH_USD')} className="w-full text-left p-4 rounded-lg bg-gray-100 dark:bg-slate-900/50 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors border border-gray-200 dark:border-slate-700"><span className="font-semibold">Ecocash USD</span></button>
              <button onClick={() => handleChoosePayment('ECOCASH_ZWL')} className="w-full text-left p-4 rounded-lg bg-gray-100 dark:bg-slate-900/50 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors border border-gray-200 dark:border-slate-700"><span className="font-semibold">Ecocash ZWL</span></button>
            </div>
            <button onClick={() => setStep('confirmDetails')} className="w-full mt-6 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">Back</button>
          </div>
        );
      case 'enterPhone':
        return (
          <div className="p-6">
             <h2 className="text-xl font-bold text-center mb-4 text-indigo-500 dark:text-indigo-400">Pay with {paymentMethod === 'ECOCASH_USD' ? 'Ecocash USD' : 'Ecocash ZWL'}</h2>
             <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Ecocash Number</label>
                <div className="relative">
                    <WalletIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
                    <input type="tel" value={ecocashNumber} onChange={e => setEcocashNumber(e.target.value)} className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 pl-10 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0777123456" required/>
                </div>
            </div>
            <div className="flex gap-2 mt-6">
                <button onClick={() => setStep('choosePayment')} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">Back</button>
                <button onClick={handlePay} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">Pay ${totalPrice}</button>
            </div>
          </div>
        );
      case 'processing':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="loader"></div>
            <p className="text-lg font-semibold mt-6">Processing Payment...</p>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{processingMessage}</p>
          </div>
        );
      case 'success':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
            <CheckmarkCircleIcon className="w-20 h-20 text-emerald-500 dark:text-emerald-400" />
            <h2 className="text-2xl font-bold mt-4">Payment Successful!</h2>
            <p className="text-gray-600 dark:text-slate-300 mt-2 mb-6">Your parking spot is confirmed. You will be directed to the map for navigation.</p>
            <button onClick={() => onSuccess(lot.id)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">Done</button>
          </div>
        );
      case 'failure':
         return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
            <CloseCircleIcon className="w-20 h-20 text-pink-500" />
            <h2 className="text-2xl font-bold mt-4">Payment Failed</h2>
            <p className="text-gray-600 dark:text-slate-300 mt-2 mb-6">{failureMessage}</p>
            <div className="w-full flex gap-2">
                <button onClick={onClose} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">Close</button>
                <button onClick={handleTryAgain} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">Try Again</button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="group relative flex flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl w-full animate-fade-in-fast" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
      <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
      <div className="relative text-gray-900 dark:text-white">
        {step !== 'processing' && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
            <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
          </button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default ReservationModal;
