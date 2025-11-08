import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import { db } from '../../services/firebase';
import { PersonIcon, CarIcon, WalletIcon, SpinnerIcon } from '../Icons';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (newUser: any) => void;
}

const AddUserModal = ({ isOpen, onClose, onUserAdded }: AddUserModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    carPlates: [] as string[],
    ecocashNumber: '',
  });
  const [newCarPlate, setNewCarPlate] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCarPlate = () => {
    if (newCarPlate.trim() !== '' && !formData.carPlates.includes(newCarPlate.trim())) {
      setFormData(prev => ({ ...prev, carPlates: [...prev.carPlates, newCarPlate.trim()] }));
      setNewCarPlate('');
    }
  };

  const handleRemoveCarPlate = (plate: string) => {
    setFormData(prev => ({ ...prev, carPlates: prev.carPlates.filter(p => p !== plate) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email.trim() || !formData.password.trim() || !formData.username.trim()) {
      alert('Please fill in all required fields (Email, Password, Username)');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsProcessing(true);

    // It's not necessary to store and restore the current user when using a secondary app instance correctly.
    // The primary app's auth state will remain unaffected.

    let secondaryApp: firebase.app.App;

    try {
      // Create a secondary Firebase app instance for user creation.
      // This prevents the current admin user from being logged out.
      const secondaryAppName = 'SecondaryAuth';
      try {
        secondaryApp = firebase.app(secondaryAppName);
      } catch (error) {
        const firebaseConfig = firebase.app().options;
        secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);
      }

      // Create user with the auth instance of the secondary app.
      const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(
        formData.email.trim(),
        formData.password.trim()
      );

      const user = userCredential.user;

      if (!user) {
        throw new Error('User creation failed, please try again.');
      }

      // Add user data to Firestore using the primary app's instance.
      await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: formData.email.trim(),
        username: formData.username.trim(),
        carPlates: formData.carPlates,
        ecocashNumber: formData.ecocashNumber.trim(),
        createdAt: firebase.firestore.Timestamp.now(),
      });

      // Send a welcome notification.
      await db.collection('notifications').add({
        userId: user.uid,
        type: 'GENERIC',
        message: `Welcome to ParkEase, ${formData.username}! Start by adding your first parking reservation.`,
        isRead: false,
        timestamp: firebase.firestore.Timestamp.now(),
      });

      // It's good practice to sign out the newly created user from the secondary app instance.
      await secondaryApp.auth().signOut();

      // Delete the secondary app instance to clean up resources.
      await secondaryApp.delete();


      const newUser = {
        uid: user.uid,
        email: formData.email.trim(),
        username: formData.username.trim(),
        carPlates: formData.carPlates,
        ecocashNumber: formData.ecocashNumber.trim(),
        createdAt: firebase.firestore.Timestamp.now(),
      };

      // Reset the form
      setFormData({
        email: '',
        password: '',
        username: '',
        carPlates: [],
        ecocashNumber: '',
      });
      setNewCarPlate('');

      onUserAdded(newUser);
      onClose();

    } catch (error: any) {
      console.error('Error creating user:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';

      // Handle specific Firebase Auth errors.
      if (error.code) {
          switch (error.code) {
              case 'auth/email-already-in-use':
                  errorMessage = 'This email address is already in use by another account.';
                  break;
              case 'auth/invalid-email':
                  errorMessage = 'The email address is not valid.';
                  break;
              case 'auth/operation-not-allowed':
                  errorMessage = 'Email/password accounts are not enabled in the Firebase Console.';
                  break;
              case 'auth/weak-password':
                  errorMessage = 'The password is too weak.';
                  break;
              default:
                  errorMessage = error.message;
          }
      } else if (error.message) {
        // Fallback for other types of errors.
        errorMessage = error.message;
      }
      
      alert(errorMessage);

    } finally {
      setIsProcessing(false);
      // Ensure the secondary app is deleted even if an error occurred after its creation.
      try {
        const appToDelete = firebase.app('SecondaryAuth');
        await appToDelete.delete();
      } catch (error) {
        // App might not exist if initialization failed, so we can ignore this error.
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      email: '',
      password: '',
      username: '',
      carPlates: [],
      ecocashNumber: '',
    });
    setNewCarPlate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={handleCancel}
    >
      <div
        className="group relative flex w-full max-w-lg flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        
        <div className="relative p-6 text-gray-900 dark:text-white overflow-y-auto">
          <button 
            onClick={handleCancel} 
            className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20"
            type="button"
          >
            <ion-icon name="close-circle" className="w-8 h-8"></ion-icon>
          </button>

          <h2 className="text-2xl font-bold text-center mb-6 text-indigo-500 dark:text-indigo-400">
            Add New User
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                <PersonIcon className="w-4 h-4 text-indigo-400" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                <ion-icon name="lock-closed" className="w-4 h-4 text-indigo-400"></ion-icon>
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>

            {/* Username Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                <PersonIcon className="w-4 h-4 text-indigo-400" />
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Car Plates Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                <CarIcon className="w-4 h-4 text-cyan-500" />
                Car Plates
              </label>
              <div className="space-y-2">
                {formData.carPlates.map(plate => (
                  <div key={plate} className="flex items-center justify-between bg-gray-100 dark:bg-slate-900/50 p-2 rounded-lg">
                    <span className="font-mono text-gray-900 dark:text-white">{plate}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCarPlate(plate)}
                      className="text-pink-500 hover:text-pink-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCarPlate}
                    onChange={(e) => setNewCarPlate(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCarPlate();
                      }
                    }}
                    className="flex-1 bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-2 rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ABC-1234"
                  />
                  <button
                    type="button"
                    onClick={handleAddCarPlate}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Ecocash Number Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                <WalletIcon className="w-4 h-4 text-emerald-500" />
                Ecocash Number
              </label>
              <input
                type="text"
                name="ecocashNumber"
                value={formData.ecocashNumber}
                onChange={handleInputChange}
                className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0771234567"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
              >
                {isProcessing ? <SpinnerIcon className="w-5 h-5" /> : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
