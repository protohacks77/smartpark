
import React, { useState, useEffect } from 'react';
import type { ParkingSlot } from '../../types';
// import { GeoPoint } from 'firebase/firestore';
// FIX: Switched to Firebase v8 compat imports to resolve missing export errors.
import firebase from 'firebase/compat/app';

interface SlotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slot: ParkingSlot) => void;
  slot: Partial<ParkingSlot> | null;
  // FIX: Use firebase.firestore.GeoPoint for v8 compat SDK.
  lotLocation: firebase.firestore.GeoPoint;
  existingSlotIds: string[];
}

const SlotEditModal = ({ isOpen, onClose, onSave, slot, lotLocation, existingSlotIds }: SlotEditModalProps) => {
  const [formData, setFormData] = useState({
    id: '',
    lat: '0',
    lng: '0',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (slot?.id) { // Editing existing slot
        setFormData({
          id: slot.id,
          lat: (slot.coords?.lat || lotLocation.latitude).toString(),
          lng: (slot.coords?.lng || lotLocation.longitude).toString(),
        });
      } else { // Adding new slot
        // Suggest a new location slightly offset from the lot center
        const offsetLat = (Math.random() - 0.5) * 0.0001;
        const offsetLng = (Math.random() - 0.5) * 0.0001;
        setFormData({
          id: '',
          lat: (lotLocation.latitude + offsetLat).toString(),
          lng: (lotLocation.longitude + offsetLng).toString(),
        });
      }
    }
  }, [isOpen, slot, lotLocation]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    // For numeric inputs, store as string to allow for intermediate values (e.g., "1.").
    // For other inputs (like slot ID), convert to uppercase.
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? value : value.toUpperCase()
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.id) {
        setError('Slot ID cannot be empty.');
        return;
    }
    
    // When adding a new slot, check if the ID already exists.
    // The `slot` prop is null when adding.
    if (!slot?.id && existingSlotIds.includes(formData.id)) {
        setError('This Slot ID is already in use for this lot.');
        return;
    }

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    if (isNaN(lat) || isNaN(lng)) {
        setError('Please enter valid numbers for latitude and longitude.');
        return;
    }

    onSave({
        id: formData.id,
        isOccupied: slot?.isOccupied || false,
        coords: {
            lat: lat,
            lng: lng
        }
    });
  };

  const inputStyle = "w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[101] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="group relative flex w-full max-w-md flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative p-6">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
              <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
            </button>
            <h2 className="text-xl font-bold text-center mb-4 text-indigo-500 dark:text-indigo-400">{slot?.id ? 'Edit Slot' : 'Add New Slot'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Slot ID</label>
                    <input type="text" name="id" value={formData.id} onChange={handleChange} className={inputStyle} placeholder="e.g., A1, P12" disabled={!!slot?.id} required />
                    {!!slot?.id && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Slot ID cannot be changed after creation.</p>}
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Latitude</label>
                        <input type="number" step="any" name="lat" value={formData.lat} onChange={handleChange} className={inputStyle} required />
                    </div>
                     <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Longitude</label>
                        <input type="number" step="any" name="lng" value={formData.lng} onChange={handleChange} className={inputStyle} required />
                    </div>
                </div>
                
                {error && <p className="text-pink-500 text-sm text-center -my-2">{error}</p>}

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">
                        Save Slot
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default SlotEditModal;