
import React, { useState } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve missing export errors.
import firebase from 'firebase/compat/app';
import { db } from '../../services/firebase';
import type { User } from '../../types';
import { PersonIcon, CarIcon, WalletIcon, SpinnerIcon } from '../Icons';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (user: User) => void;
}

const AddUserModal = ({ isOpen, onClose, onUserAdded }: AddUserModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    carPlate: '',
    ecocashNumber: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async () => {
    setIsProcessing(true);
    try {
      // FIX: Use v8 compat syntax for addDoc.
      const docRef = await db.collection('users').add({
        ...formData,
        createdAt: firebase.firestore.Timestamp.now(),
      });
      onUserAdded({ ...formData, uid: docRef.id, createdAt: new Date() });
      onClose();
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Failed to add user.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="group relative flex w-full max-w-lg flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative p-6 text-gray-900 dark:text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
            <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
          </button>

          <h2 className="text-2xl font-bold text-center mb-6 text-indigo-500 dark:text-indigo-400">Add New User</h2>

          <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 mb-4">
            <div className="flex items-center gap-3">
                <PersonIcon className="w-5 h-5 text-indigo-400 dark:text-indigo-300" />
                <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleInputChange} className="w-full bg-gray-200 dark:bg-slate-800/60 text-gray-900 dark:text-white p-2 rounded-md border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-3">
                <PersonIcon className="w-5 h-5 text-indigo-400 dark:text-indigo-300" />
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="w-full bg-gray-200 dark:bg-slate-800/60 text-gray-900 dark:text-white p-2 rounded-md border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-3">
                <CarIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                <input type="text" name="carPlate" placeholder="Car Plate" value={formData.carPlate} onChange={handleInputChange} className="w-full bg-gray-200 dark:bg-slate-800/60 text-gray-900 dark:text-white p-2 rounded-md border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-3">
                <WalletIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                <input type="text" name="ecocashNumber" placeholder="Ecocash Number" value={formData.ecocashNumber} onChange={handleInputChange} className="w-full bg-gray-200 dark:bg-slate-800/60 text-gray-900 dark:text-white p-2 rounded-md border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={onClose} disabled={isProcessing} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleAddUser} disabled={isProcessing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold py-2 px-4 rounded-lg transition-colors flex justify-center text-white">
                {isProcessing ? <SpinnerIcon className="w-5 h-5"/> : 'Add User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
