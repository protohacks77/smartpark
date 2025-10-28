
import React, { useState } from 'react';
import type { User } from '../../types';
import { PersonIcon, CarIcon } from '../Icons';

interface ViewAllUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSelectUser: (user: User) => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (uid: string) => void;
}

interface UserCardProps {
  user: User;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onSelect, onEdit, onDelete }) => (
    <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg flex justify-between items-center transition-colors hover:bg-gray-200 dark:hover:bg-slate-800/60">
        <div>
            <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PersonIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
                {user.username}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <CarIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                <span className="font-mono">{user.carPlate || 'No Plate'}</span>
            </p>
        </div>
        <div className="flex gap-2">
          <button
              onClick={onSelect}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
              View Details
          </button>
          <button
              onClick={onEdit}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
              Edit
          </button>
          <button
              onClick={onDelete}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
              Delete
          </button>
        </div>
    </div>
);


const ViewAllUsersModal = ({ isOpen, onClose, users, onSelectUser, onAddUser, onEditUser, onDeleteUser }: ViewAllUsersModalProps) => {
    if (!isOpen) return null;
    const [showToast, setShowToast] = useState(false);

    const handleDelete = (uid: string) => {
      if (window.confirm('Are you sure you want to delete this user?')) {
        onDeleteUser(uid);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="group relative flex w-full max-w-2xl flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
                <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
                <div className="relative p-6 text-gray-900 dark:text-white">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
                        <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
                    </button>

                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">All Users ({users.length})</h2>
                      <button
                          onClick={onAddUser}
                          className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                          Add User
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                        {users.length > 0 ? (
                            users.sort((a, b) => (a.username || '').localeCompare(b.username || '')).map(user => (
                                <UserCard
                                    key={user.uid}
                                    user={user}
                                    onSelect={() => onSelectUser(user)}
                                    onEdit={() => onEditUser(user)}
                                    onDelete={() => handleDelete(user.uid)}
                                />
                            ))
                        ) : (
                            <p className="text-gray-500 dark:text-slate-400 text-center py-10">No users found in the database.</p>
                        )}
                    </div>
                </div>
            </div>
            {showToast && (
              <div className="absolute bottom-5 bg-green-500 text-white py-2 px-4 rounded-lg">
                User deleted successfully!
              </div>
            )}
        </div>
    );
};

export default ViewAllUsersModal;