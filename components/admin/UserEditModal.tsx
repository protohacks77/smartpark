
import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { PersonIcon, CarIcon, EmailIcon, TrashIcon, StarIcon } from '../Icons';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (user: User) => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState<User>(user || { carPlates: [], defaultCarPlate: '' } as unknown as User);
  const [newCarPlate, setNewCarPlate] = useState('');

  useEffect(() => {
    setFormData(user || { carPlates: [], defaultCarPlate: '' } as unknown as User);
  }, [user]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddCarPlate = () => {
    if (newCarPlate && !formData.carPlates.includes(newCarPlate)) {
      setFormData({ ...formData, carPlates: [...formData.carPlates, newCarPlate.toUpperCase()] });
      setNewCarPlate('');
    }
  };

  const handleRemoveCarPlate = (plateToRemove: string) => {
    setFormData({ ...formData, carPlates: formData.carPlates.filter(plate => plate !== plateToRemove) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="group relative flex w-full max-w-lg flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative p-6 text-gray-900 dark:text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
            <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
          </button>

          <h2 className="text-2xl font-bold text-center mb-6 text-blue-500 dark:text-blue-400">{user ? 'Edit User' : 'Add User'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <PersonIcon className="w-6 h-6 text-blue-500 dark:text-blue-300" />
              <input
                type="text"
                name="username"
                value={formData.username || ''}
                onChange={handleChange}
                placeholder="Username"
                className="w-full bg-gray-100 dark:bg-slate-900/50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <EmailIcon className="w-6 h-6 text-blue-500 dark:text-blue-300" />
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="Email"
                className="w-full bg-gray-100 dark:bg-slate-900/50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Car Number Plates</label>
              <div className="space-y-2">
                {formData.carPlates.map(plate => (
                  <div key={plate} className="flex items-center justify-between bg-gray-100 dark:bg-slate-900/50 p-2 rounded-lg">
                    <span className="font-mono text-gray-900 dark:text-white">{plate}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setFormData({ ...formData, defaultCarPlate: plate })} className={formData.defaultCarPlate === plate ? 'text-yellow-400' : 'text-gray-400'}>
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
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-lg"
            >
              {user ? 'Save Changes' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserEditModal;
