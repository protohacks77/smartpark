
import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PersonIcon, CarIcon, WalletIcon, LogOutIcon, SpinnerIcon } from '../Icons';
import type { User } from '../../types';

interface SettingsScreenProps {
  user: User | null;
  onLogout: () => void;
  onAdminLogin: () => void;
  onUserDetailsUpdate: (user: User) => void;
}

interface InfoCardProps {
  className?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ children, className = "" }) => {
  return (
    <div className={`group relative flex flex-col rounded-xl bg-white dark:bg-slate-950 p-4 shadow-lg dark:shadow-2xl transition-all duration-300 ${className}`}>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-20 dark:group-hover:opacity-30"></div>
      <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

const SettingsScreen = ({ user, onLogout, onAdminLogin, onUserDetailsUpdate }: SettingsScreenProps) => {
  const [username, setUsername] = useState(user?.username || '');
  const [carPlate, setCarPlate] = useState(user?.carPlate || '');
  const [ecocashNumber, setEcocashNumber] = useState(user?.ecocashNumber || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setUsername(user?.username || '');
    setCarPlate(user?.carPlate || '');
    setEcocashNumber(user?.ecocashNumber || '');
  }, [user]);
  
  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const updatedDetails = { username, carPlate, ecocashNumber };
      await updateDoc(userDocRef, updatedDetails);
      onUserDetailsUpdate({ ...user, ...updatedDetails });
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const inputStyle = "w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-4 pt-24 pb-28 space-y-6 overflow-y-auto h-full animate-fade-in text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4 animate-slide-in-1">Settings</h1>

      {/* Profile Settings */}
      <InfoCard className="animate-slide-in-2">
        <h2 className="font-bold text-lg text-indigo-500 dark:text-indigo-400 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Username</label>
            <div className="relative">
                <PersonIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={`${inputStyle} pl-10`} />
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Change Password</label>
            <input type="password" placeholder="New Password" className={inputStyle} />
          </div>
        </div>
      </InfoCard>

      {/* Default Vehicle & Payment */}
      <InfoCard className="animate-slide-in-3">
        <h2 className="font-bold text-lg text-indigo-500 dark:text-indigo-400 mb-4">Defaults</h2>
         <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Car Number Plate</label>
            <div className="relative">
                <CarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
                <input type="text" value={carPlate} onChange={e => setCarPlate(e.target.value)} className={`${inputStyle} pl-10`} />
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Ecocash Number</label>
            <div className="relative">
                <WalletIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
                <input type="text" value={ecocashNumber} onChange={e => setEcocashNumber(e.target.value)} className={`${inputStyle} pl-10`} />
            </div>
          </div>
        </div>
        <button onClick={handleSaveChanges} disabled={isSaving} className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex justify-center items-center disabled:opacity-50">
          {isSaving ? <SpinnerIcon className="w-5 h-5" /> : 'Save Changes'}
        </button>
      </InfoCard>

      {/* Admin & Logout */}
      <div className="space-y-4 pt-4 animate-slide-in-5">
         <button onClick={onAdminLogin} className="w-full bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Login as Admin
         </button>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-pink-600/80 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            <LogOutIcon />
            Logout
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;