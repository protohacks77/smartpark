import React, { useState, useEffect } from 'react';
// Firebase v8 compat import
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

const LotForm = ({
  lot,
  onSave,
  onCancel,
  onDelete,
  isSaving,
}: {
  lot: Partial<ParkingLot>;
  onSave: (lotData: ParkingLot) => void;
  onCancel: () => void;
  onDelete: (lotId: string) => void;
  isSaving: boolean;
}) => {
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

  // ✅ FIXED handleChange — prevents app crash when typing invalid numbers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      // Allow temporary invalid states like "" or "-"
      if (value === '' || value === '-') {
        setFormData((prev) => ({ ...prev, [name]: value }));
      } else if (!isNaN(parseFloat(value))) {
        setFormData((prev) => ({ ...prev, [name]: parseFloat(value) }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lat = parseFloat(String(formData.lat));
    const lng = parseFloat(String(formData.lng));
    const hourlyRate = parseFloat(String(formData.hourlyRate));

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert('Longitude must be a valid number between -180 and 180.');
      return;
    }
    if (isNaN(hourlyRate) || hourlyRate < 0) {
      alert('Hourly rate must be a valid positive number.');
      return;
    }

    // ✅ FIXED GeoPoint — prevents crash when typing incomplete coordinates
    const lotToSave: ParkingLot = {
      id: formData.id,
      name: formData.name,
      address: formData.address,
      hourlyRate,
      slots: formData.slots,
      location: new firebase.firestore.GeoPoint(
        Number.isFinite(lat) ? lat : 0,
        Number.isFinite(lng) ? lng : 0
      ),
    };

    onSave(lotToSave);
  };

  const handleOpenSlotModal = (slotToEdit: Partial<ParkingSlot> | null) => {
    setEditingSlot(slotToEdit);
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = (savedSlot: ParkingSlot) => {
    const isEditing = formData.slots.some(
      (s) => s.id === savedSlot.id && s !== editingSlot
    );

    if (isEditing) {
      setFormData((prev) => ({
        ...prev,
        slots: prev.slots.map((s) => (s.id === savedSlot.id ? savedSlot : s)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        slots: [...prev.slots, savedSlot],
      }));
    }
    setIsSlotModalOpen(false);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (window.confirm(`Are you sure you want to delete slot ${slotId}?`)) {
      setFormData((prev) => ({
        ...prev,
        slots: prev.slots.filter((s) => s.id !== slotId),
      }));
    }
  };

  const inputStyle =
    'w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="p-6 animate-fade-in-fast max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-indigo-500 dark:text-indigo-400">
          {lot?.id ? 'Edit Parking Lot' : 'Add New Parking Lot'}
        </h2>
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
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">
            Lot Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={inputStyle}
            required
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={inputStyle}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              name="lat"
              value={formData.lat}
              onChange={handleChange}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              name="lng"
              value={formData.lng}
              onChange={handleChange}
              className={inputStyle}
              required
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">
            Hourly Rate ($)
          </label>
          <input
            type="number"
            step="0.01"
            name="hourlyRate"
            value={formData.hourlyRate}
            onChange={handleChange}
            className={inputStyle}
            required
          />
        </div>

        {/* Slot Management */}
        <div className="pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-indigo-500 dark:text-indigo-400">
              Manage Slots ({formData.slots.length})
            </h3>
            <button
              type="button"
              onClick={() => handleOpenSlotModal(null)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
            >
              Add New Slot
            </button>
          </div>

          <div className="space-y-2 p-2 bg-gray-100 dark:bg-slate-900/50 rounded-lg max-h-48 overflow-y-auto">
            {formData.slots
              .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
              .map((s) => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-slate-800/70 p-2 rounded-md flex justify-between items-center"
                >
                  <p className="font-mono text-gray-900 dark:text-white">{s.id}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSlotModal(s)}
                      className="text-sm bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-3 py-1 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(s.id)}
                      className="text-sm bg-pink-800/70 hover:bg-pink-700/70 p-1 rounded-md"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            {formData.slots.length === 0 && (
              <p className="text-center text-gray-400 dark:text-slate-500 py-4">
                No slots added yet.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 flex items-center justify-center"
          >
            {isSaving ? <SpinnerIcon className="w-6 h-6" /> : 'Save Changes'}
          </button>
        </div>
      </form>

      <SlotEditModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onSave={handleSaveSlot}
        slot={editingSlot}
        lotLocation={new firebase.firestore.GeoPoint(
          Number.isFinite(Number(formData.lat)) ? Number(formData.lat) : 0,
          Number.isFinite(Number(formData.lng)) ? Number(formData.lng) : 0
        )}
        existingSlotIds={formData.slots
          .map((s) => s.id)
          .filter((id) => id !== editingSlot?.id)}
      />
    </div>
  );
};

export default LotForm;
