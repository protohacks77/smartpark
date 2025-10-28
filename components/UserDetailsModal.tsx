
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { CarIcon, WalletIcon, TrashIcon, StarIcon } from './Icons';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { carPlates: string[]; defaultCarPlate: string; ecocashNumber: string }) => void;
  user: User | null;
}

const UserDetailsModal = ({ isOpen, onClose, onSave, user }: UserDetailsModalProps) => {
  const [carPlates, setCarPlates] = useState<string[]>([]);
  const [defaultCarPlate, setDefaultCarPlate] = useState('');
  const [newCarPlate, setNewCarPlate] = useState('');
  const [ecocashNumber, setEcocashNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCarPlates(user?.carPlates || []);
      setDefaultCarPlate(user?.defaultCarPlate || '');
      setEcocashNumber(user?.ecocashNumber || '');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleAddCarPlate = () => {
    if (newCarPlate && !carPlates.includes(newCarPlate)) {
      setCarPlates([...carPlates, newCarPlate.toUpperCase()]);
      setNewCarPlate('');
    }
  };

  const handleRemoveCarPlate = (plateToRemove: string) => {
    setCarPlates(carPlates.filter(plate => plate !== plateToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ carPlates, defaultCarPlate, ecocashNumber });
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
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative">
            <button onClick={onClose} className="absolute -top-2 -right-2 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
              <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
            </button>

            <h2 className="text-2xl font-bold text-center mb-2 text-indigo-500 dark:text-indigo-400">Your Details</h2>
            <p className="text-center text-gray-500 dark:text-slate-400 mb-6">Manage your vehicles and payment information.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Car Number Plates</label>
                <div className="space-y-2">
                  {carPlates.map(plate => (
                    <div key={plate} className="flex items-center justify-between bg-gray-100 dark:bg-slate-900/50 p-2 rounded-lg">
                      <span className="font-mono text-gray-900 dark:text-white">{plate}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setDefaultCarPlate(plate)} className={defaultCarPlate === plate ? 'text-yellow-400' : 'text-gray-400'}>
                          <StarIcon className="w-5 h-5"/>
                        </button>
                        <button type="button" onClick={() => handleRemoveCarPlate(plate)} className="text-red-500">
                          <TrashIcon className="w-5 h-5"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative mt-2">
                  <CarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
                  <input
                    type="text"
                    value={newCarPlate}
                    onChange={(e) => setNewCarPlate(e.target.value.toUpperCase())}
                    className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 pl-10 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Add a new plate"
                  />
                  <button type="button" onClick={handleAddCarPlate} className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-2 py-1 rounded">Add</button>
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Ecocash Number</label>
                <div className="relative">
                  <WalletIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
                  <input
                    type="tel"
                    value={ecocashNumber}
                    onChange={(e) => setEcocashNumber(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 pl-10 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="0777123456"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
              >
                Save Details
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;