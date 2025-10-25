
import React, { useState, useEffect } from 'react';
import type { User, Bill } from '../types';
import { SpinnerIcon, WalletIcon } from './Icons';
// FIX: Switched to Firebase v8 compat imports to resolve missing export errors.
import { db } from '../services/firebase';

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  user: User;
  onSuccess: () => void;
}

const PayBillModal = ({ isOpen, onClose, bill, user, onSuccess }: PayBillModalProps) => {
  const [ecocashNumber, setEcocashNumber] = useState(user.ecocashNumber || '');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEcocashNumber(user.ecocashNumber || '');
      setError('');
    }
  }, [isOpen, user.ecocashNumber]);

  if (!isOpen) return null;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecocashNumber.trim()) {
        setError('Ecocash number is required.');
        return;
    }
    setError('');
    setIsPaying(true);

    try {
      // In a real app, this would involve a payment gateway integration.
      // Here, we'll just simulate a successful payment.
      // FIX: Use v8 compat syntax for doc and updateDoc.
      const billDocRef = db.collection('bills').doc(bill.id);
      await billDocRef.update({
        status: 'paid'
      });
      onSuccess();
    } catch (err) {
      console.error("Error processing payment:", err);
      setError("Payment failed. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="group relative flex w-full max-w-sm flex-col rounded-xl bg-white dark:bg-slate-950 p-6 shadow-lg dark:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 via-pink-500 to-yellow-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative">
            <button onClick={onClose} className="absolute -top-2 -right-2 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
              <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
            </button>

            <h2 className="text-2xl font-bold text-center mb-2 text-red-500 dark:text-red-400">Pay Outstanding Bill</h2>
            <div className="text-center mb-6">
                <p className="text-gray-500 dark:text-slate-400">Amount Due</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">${bill.amount.toFixed(2)}</p>
            </div>
            
            <form onSubmit={handlePayment} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Ecocash Number for Payment</label>
                <div className="relative">
                  <WalletIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
                  <input 
                    type="tel"
                    value={ecocashNumber}
                    onChange={(e) => setEcocashNumber(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 pl-10 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    placeholder="0777123456"
                    required
                  />
                </div>
              </div>
              
              {error && <p className="text-pink-500 text-sm text-center -my-2">{error}</p>}

              <button 
                type="submit"
                disabled={isPaying}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 flex justify-center items-center"
              >
                {isPaying ? <SpinnerIcon className="w-6 h-6"/> : 'Pay Now'}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default PayBillModal;
