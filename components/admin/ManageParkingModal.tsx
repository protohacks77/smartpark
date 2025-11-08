import React, { useState, useEffect } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve missing export errors.
import firebase from 'firebase/compat/app';
import { db } from '../../services/firebase';
import type { ParkingLot, ParkingSlot } from '../../types';
import SlotEditModal from './SlotEditModal';
import { TrashIcon, SpinnerIcon } from '../Icons';
import ConfirmationModal from './ConfirmationModal';

interface LotFormData {
    id: string;
    name: string;
    address: string;
    lat: number | string;
    lng: number | string;
    hourlyRate: number | string;
    slots: ParkingSlot[];
}

const LotForm = ({ lot, onSave, onCancel, onDelete, isSaving }: { lot: Partial<ParkingLot>, onSave: (lotData: ParkingLot) => void, onCancel: () => void, onDelete: (lotId: string) => void, isSaving: boolean }) => {
  const [formData, setFormData] = useState<LotFormData>({
    id: lot?.id || '',
    name: lot?.name || '',
    address: lot?.address || '',
    lat: lot?.location?.latitude ?? 0,
    lng: lot?.location?.longitude ?? 0,
    hourlyRate: lot?.hourlyRate || 1,
    slots: lot?.slots || [],
  });
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Partial<ParkingSlot> | null>(null);

  useEffect(() => {
    setFormData({
        id: lot?.id || '',
        name: lot?.name || '',
        address: lot?.address || '',
        lat: lot?.location?.latitude ?? 0,
        lng: lot?.location?.longitude ?? 0,
        hourlyRate: lot?.hourlyRate || 1,
        slots: lot?.slots || [],
    });
  }, [lot]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
     if (type === 'number') {
        // Allow empty string or just a negative sign for better UX during input
        if (value === '' || value === '-') {
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(String(formData.lat));
    const lng = parseFloat(String(formData.lng));
    const hourlyRate = parseFloat(String(formData.hourlyRate));

    const lotToSave: ParkingLot = {
        id: formData.id,
        name: formData.name,
        address: formData.address,
        hourlyRate: hourlyRate,
        slots: formData.slots,
        // FIX: Use firebase.firestore.GeoPoint for v8 compat SDK.
        location: new firebase.firestore.GeoPoint(lat, lng),
    };
    onSave(lotToSave);
  };
  
  const handleOpenSlotModal = (slotToEdit: Partial<ParkingSlot> | null) => {
    setEditingSlot(slotToEdit);
    setIsSlotModalOpen(true);
  };
  
  const handleSaveSlot = (savedSlot: ParkingSlot) => {
    const isEditing = formData.slots.some(s => s.id === savedSlot.id && s !== editingSlot);

    if (isEditing) { // This is an update to an existing slot
        setFormData(prev => ({
            ...prev,
            slots: prev.slots.map(s => s.id === savedSlot.id ? savedSlot : s)
        }));
    } else { // This is a new slot
        setFormData(prev => ({
            ...prev,
            slots: [...prev.slots, savedSlot]
        }));
    }
    setIsSlotModalOpen(false);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (window.confirm(`Are you sure you want to delete slot ${slotId}?`)) {
        setFormData(prev => ({
            ...prev,
            slots: prev.slots.filter(s => s.id !== slotId)
        }));
    }
  };


  const inputStyle = "w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-6 animate-fade-in-fast max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-indigo-500 dark:text-indigo-400">{lot?.id ? 'Edit Parking Lot' : 'Add New Parking Lot'}</h2>
            {lot?.id && (
                <button
                    type="button"
                    onClick={() => onDelete(lot.id!)}
                    className="bg-pink-600/80 hover:bg-pink-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                    <TrashIcon className="w-4 h-4" />
                    Delete Lot
                </button>
            )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lot Details */}
            <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Lot Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputStyle} required />
            </div>
            <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputStyle} required />
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
            <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Hourly Rate ($)</label>
                <input type="number" step="0.01" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} className={inputStyle} required />
            </div>

            {/* Slot Management */}
            <div className="pt-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-indigo-500 dark:text-indigo-400">Manage Slots ({formData.slots.length})</h3>
                    <button type="button" onClick={() => handleOpenSlotModal(null)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm">
                        Add New Slot
                    </button>
                </div>
                <div className="space-y-2 p-2 bg-gray-100 dark:bg-slate-900/50 rounded-lg max-h-48 overflow-y-auto">
                    {formData.slots.sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric: true})).map(s => (
                        <div key={s.id} className="bg-white dark:bg-slate-800/70 p-2 rounded-md flex justify-between items-center">
                            <p className="font-mono text-gray-900 dark:text-white">{s.id}</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleOpenSlotModal(s)} className="text-sm bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-3 py-1 rounded-md">Edit</button>
                                <button type="button" onClick={() => handleDeleteSlot(s.id)} className="text-sm bg-pink-800/70 hover:bg-pink-700/70 p-1 rounded-md"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    {formData.slots.length === 0 && <p className="text-center text-gray-400 dark:text-slate-500 py-4">No slots added yet.</p>}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 flex items-center justify-center">
                    {isSaving ? <SpinnerIcon className="w-6 h-6" /> : 'Save Changes'}
                </button>
            </div>
        </form>

        <SlotEditModal
            isOpen={isSlotModalOpen}
            onClose={() => setIsSlotModalOpen(false)}
            onSave={handleSaveSlot}
            slot={editingSlot}
            // FIX: Use firebase.firestore.GeoPoint for v8 compat SDK.
            lotLocation={new firebase.firestore.GeoPoint(Number(formData.lat), Number(formData.lng))}
            existingSlotIds={formData.slots.map(s => s.id).filter(id => id !== editingSlot?.id)}
        />
    </div>
  );
};


interface ManageParkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  parkingLots: ParkingLot[];
  onSaveSuccess: (message: string) => void;
}

const ManageParkingModal = ({ isOpen, onClose, parkingLots, onSaveSuccess }: ManageParkingModalProps) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingLot, setEditingLot] = useState<Partial<ParkingLot>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [lotToDeleteId, setLotToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setView('list');
        setEditingLot({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEdit = (lot: ParkingLot) => {
    setEditingLot(lot);
    setView('form');
  };

  const handleAdd = () => {
    setEditingLot({});
    setView('form');
  };
  
  const handleSaveLot = async (lotData: ParkingLot) => {
    setIsSaving(true);
    try {
        if (lotData.id) { // Editing existing lot
            // FIX: Use v8 compat syntax for doc and setDoc.
            const lotDocRef = db.collection('parkingLots').doc(lotData.id);
            await lotDocRef.set(lotData, { merge: true });
        } else { // Creating new lot
            const { id, ...newLotData } = lotData;
            // FIX: Use v8 compat syntax for addDoc and collection.
            await db.collection('parkingLots').add(newLotData);
        }
        onSaveSuccess("Parking lot saved successfully!");
        setView('list');
        setEditingLot({});
    } catch (error) {
        console.error("Failed to save parking lot: ", error);
        alert("Could not save changes.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteLot = (lotId: string) => {
    setLotToDeleteId(lotId);
    setIsConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!lotToDeleteId) return;

    setIsDeleting(true);
    try {
      // FIX: Use v8 compat syntax for writeBatch.
      const batch = db.batch();
      // FIX: Use v8 compat syntax for doc.
      const lotDocRef = db.collection('parkingLots').doc(lotToDeleteId);
      batch.delete(lotDocRef);

      // FIX: Use v8 compat syntax for query, collection, and where.
      const reservationsQuery = db.collection('reservations')
        .where('parkingLotId', '==', lotToDeleteId);

      // FIX: Use v8 compat syntax for getDocs.
      const reservationsSnapshot = await reservationsQuery.get();
      reservationsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      onSaveSuccess("Parking lot deleted successfully!");
      setView('list');
    } catch (error) {
      console.error("Failed to delete parking lot and its reservations: ", error);
      alert("Could not delete the parking lot. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
      setLotToDeleteId(null);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="group relative flex w-full max-w-2xl flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl transition-all duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
          <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
          <div className="relative text-gray-900 dark:text-white">
              <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
                <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
              </button>

              {view === 'list' && (
                  <div className="p-6">
                      <h2 className="text-xl font-bold text-center mb-4 text-indigo-500 dark:text-indigo-400">Manage Parking Lots</h2>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                          {parkingLots.map(lot => (
                              <div key={lot.id} className="bg-gray-100 dark:bg-slate-900/50 p-3 rounded-lg flex justify-between items-center">
                                  <div>
                                      <p className="font-semibold text-gray-900 dark:text-white">{lot.name}</p>
                                      <p className="text-sm text-gray-500 dark:text-slate-400">{lot.address}</p>
                                  </div>
                                  <button onClick={() => handleEdit(lot)} className="bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                      Edit
                                  </button>
                              </div>
                          ))}
                      </div>
                       <button onClick={handleAdd} className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">
                          Add New Lot
                      </button>
                  </div>
              )}
              
              {view === 'form' && (
                  <LotForm lot={editingLot} onSave={handleSaveLot} onCancel={() => setView('list')} onDelete={handleDeleteLot} isSaving={isSaving} />
              )}
              
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete Parking Lot"
        message="Are you sure you want to delete this parking lot? This will also delete all associated slots and reservations. This action cannot be undone."
        confirmText="Delete"
        isProcessing={isDeleting}
      />
    </>
  );
};

export default ManageParkingModal;
