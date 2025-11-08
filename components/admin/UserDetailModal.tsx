import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { db } from '../../services/firebase';
import type { User } from '../../types';
import { PersonIcon, CarIcon, WalletIcon, LocationIcon, SpinnerIcon, TrashIcon } from '../Icons';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onDeleteSuccess: (message: string) => void;
}

// Local interface for converted reservations with Date objects
interface ReservationDisplay {
  id: string;
  userId: string;
  parkingLotId: string;
  parkingLotName: string;
  slotId: string;
  startTime: Date;
  endTime: Date | null;
  amountPaid: number;
  status: 'confirmed' | 'active' | 'completed' | 'expired';
}

const DetailRow = ({ icon, label, value, name, isEditing, onChange }: { icon: React.ReactNode, label: string, value: string, name: string, isEditing: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const inputStyle = "w-full bg-gray-200 dark:bg-slate-800/60 text-gray-900 dark:text-white p-2 rounded-md border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-5">{icon}</div>
            <div className="flex-grow grid grid-cols-3 items-center">
                <p className="text-gray-500 dark:text-slate-400 col-span-1">{label}:</p>
                <div className="col-span-2">
                    {isEditing ? (
                        <input type="text" name={name} value={value} onChange={onChange} className={inputStyle} />
                    ) : (
                        <p className={`font-semibold ${name === 'carPlate' || name === 'ecocashNumber' ? 'font-mono' : ''}`}>{value || 'Not Set'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const UserDetailModal = ({ isOpen, onClose, user, onDeleteSuccess }: UserDetailModalProps) => {
  const [reservations, setReservations] = useState<ReservationDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    carPlates: [] as string[],
    ecocashNumber: '',
  });

  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isBilling, setIsBilling] = useState(false);
  const [newCarPlate, setNewCarPlate] = useState('');

  const handleAddCarPlate = () => {
    if (newCarPlate.trim() !== '' && !formData.carPlates.includes(newCarPlate.trim())) {
      setFormData(prev => ({ ...prev, carPlates: [...prev.carPlates, newCarPlate.trim()] }));
      setNewCarPlate('');
    }
  };

  useEffect(() => {
    if (user) {
        setFormData({
            username: user.username,
            carPlates: user.carPlates || [],
            ecocashNumber: user.ecocashNumber || '',
        });
        setIsEditing(false);
        setIsMessaging(false);
        setMessageText('');
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      const fetchReservations = async () => {
        setIsLoading(true);
        try {
          const q = db.collection('reservations')
            .where('userId', '==', user.uid);
          const querySnapshot = await q.get();
          
          const userReservations: ReservationDisplay[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            
            // Helper function to safely convert timestamps
            const convertTimestamp = (timestamp: any): Date | null => {
              if (!timestamp) return null;
              if (timestamp instanceof Date) return timestamp;
              if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                return timestamp.toDate();
              }
              if (timestamp.seconds) {
                return new Date(timestamp.seconds * 1000);
              }
              if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                return new Date(timestamp);
              }
              return null;
            };
            
            return {
              id: doc.id,
              userId: data.userId,
              parkingLotId: data.parkingLotId,
              parkingLotName: data.parkingLotName,
              slotId: data.slotId,
              status: data.status,
              amountPaid: data.amountPaid || 0,
              startTime: convertTimestamp(data.startTime) || new Date(),
              endTime: convertTimestamp(data.endTime)
            };
          });
          
          // Sort by date (newest first)
          userReservations.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
          
          setReservations(userReservations);
        } catch (error) {
          console.error("Error fetching user reservations: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchReservations();
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsProcessing(true);
    const userDocRef = db.collection('users').doc(user.uid);
    try {
        // Validate data before saving
        if (!formData.username.trim()) {
          alert("Username cannot be empty.");
          setIsProcessing(false);
          return;
        }

        // Update with explicit fields
        await userDocRef.update({
          username: formData.username.trim(),
          carPlates: formData.carPlates,
          ecocashNumber: formData.ecocashNumber.trim()
        });
        
        alert("User updated successfully!");
        setIsEditing(false);
    } catch (error: any) {
        console.error("Error updating user:", error);
        alert(`Failed to save changes: ${error.message || 'Unknown error'}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete user ${user.username}? This action cannot be undone.`)) {
        setIsProcessing(true);
        try {
            await db.collection('users').doc(user.uid).delete();
            onDeleteSuccess(`User ${user.username} deleted successfully.`);
            onClose();
        } catch (error: any) {
            console.error("Error deleting user:", error);
            alert(`Failed to delete user: ${error.message || 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    }
  };
  
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
        alert("Message cannot be empty.");
        return;
    }
    setIsSendingMessage(true);
    try {
        const newNotification = {
            userId: user.uid,
            type: 'GENERIC' as const,
            message: messageText.trim(),
            isRead: false,
            timestamp: firebase.firestore.Timestamp.now(),
        };
        await db.collection('notifications').add(newNotification);
        
        setMessageText('');
        setIsMessaging(false);
        alert("Message sent successfully!");

    } catch (error: any) {
        console.error("Error sending message:", error);
        alert(`Failed to send message: ${error.message || 'Unknown error'}`);
    } finally {
        setIsSendingMessage(false);
    }
  };
  
  const handleBillUser = async () => {
    if (!window.confirm(`Are you sure you want to add a $2.00 bill to ${user.username}'s account? This can be used for testing or applying manual charges.`)) {
        return;
    }
    setIsBilling(true);
    try {
        const billsQuery = db.collection('bills').where('userId', '==', user.uid).where('status', '==', 'unpaid');
        const billsSnapshot = await billsQuery.get();

        if (!billsSnapshot.empty) {
            const billDoc = billsSnapshot.docs[0];
            const newAmount = billDoc.data().amount + 2;
            await db.collection('bills').doc(billDoc.id).update({ 
              amount: newAmount, 
              updatedAt: firebase.firestore.Timestamp.now() 
            });
        } else {
            await db.collection('bills').add({
                userId: user.uid,
                amount: 2,
                status: 'unpaid' as const,
                createdAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now(),
            });
        }
        
        await db.collection('notifications').add({
          userId: user.uid,
          type: 'BILL_DUE',
          message: 'An administrative charge of $2.00 has been added to your account.',
          isRead: false,
          timestamp: firebase.firestore.Timestamp.now(),
          data: { billAmount: 2 },
        });

        alert('User billed successfully.');
    } catch (error: any) {
        console.error("Error billing user:", error);
        alert(`Failed to bill user: ${error.message || 'Unknown error'}`);
    } finally {
        setIsBilling(false);
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
            <ion-icon name="close-circle" className="w-8 h-8"></ion-icon>
          </button>

          <h2 className="text-2xl font-bold text-center mb-6 text-indigo-500 dark:text-indigo-400">User Details</h2>
          
          <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 mb-4">
            <DetailRow icon={<PersonIcon className="w-5 h-5 text-indigo-400 dark:text-indigo-300" />} label="Username" name="username" value={formData.username} isEditing={isEditing} onChange={handleInputChange} />
            <div className="flex items-center gap-3">
              <PersonIcon className="w-5 h-5 text-indigo-400 dark:text-indigo-300" />
              <p><span className="text-gray-500 dark:text-slate-400">Email:</span> <span className="font-semibold">{user.email}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <CarIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              <div className="flex-grow">
                <p className="text-gray-500 dark:text-slate-400 mb-2">Car Plates:</p>
                <div className="space-y-2">
                  {formData.carPlates.map(plate => (
                    <div key={plate} className="flex items-center justify-between bg-gray-200 dark:bg-slate-800/60 p-2 rounded-md">
                      <span className="font-mono text-gray-900 dark:text-white">{plate}</span>
                      {isEditing && (
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, carPlates: prev.carPlates.filter(p => p !== plate) }))} className="text-pink-500 hover:text-pink-700">Remove</button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <input type="text" value={newCarPlate} onChange={(e) => setNewCarPlate(e.target.value.toUpperCase())} className="w-full bg-gray-200 dark:bg-slate-800/60 text-gray-900 dark:text-white p-2 rounded-md border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="New Plate" />
                      <button type="button" onClick={handleAddCarPlate} className="bg-indigo-500 text-white px-2 py-1 rounded-md">Add</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DetailRow icon={<WalletIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />} label="Ecocash" name="ecocashNumber" value={formData.ecocashNumber} isEditing={isEditing} onChange={handleInputChange} />
          </div>

          <div className="flex gap-4 mb-2">
            {isEditing ? (
                <>
                    <button onClick={() => setIsEditing(false)} disabled={isProcessing} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={isProcessing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold py-2 px-4 rounded-lg transition-colors flex justify-center text-white">
                        {isProcessing ? <SpinnerIcon className="w-5 h-5"/> : 'Save'}
                    </button>
                </>
            ) : (
                <>
                    <button onClick={handleDelete} disabled={isProcessing} className="flex-1 bg-pink-600/80 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2">
                        {isProcessing ? <SpinnerIcon className="w-5 h-5"/> : <><TrashIcon /> Delete User</>}
                    </button>
                    <button onClick={() => setIsEditing(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Edit User</button>
                </>
            )}
          </div>
          
          <div className="mb-6">
             <button onClick={handleBillUser} disabled={isBilling} className="w-full bg-yellow-600/80 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex justify-center items-center">
                {isBilling ? <SpinnerIcon className="w-5 h-5" /> : 'Bill User ($2.00)'}
            </button>
          </div>
          
          <div className="mb-6">
            {!isMessaging ? (
                 <button onClick={() => setIsMessaging(true)} className="w-full bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    Send Message to User
                </button>
            ) : (
                <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg animate-fade-in-fast">
                    <h3 className="font-bold text-lg text-cyan-500 dark:text-cyan-400 mb-2">Compose Message</h3>
                    <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder={`Your message for ${user.username}...`}
                        className="w-full bg-gray-200 dark:bg-slate-800/60 text-gray-900 dark:text-white p-2 rounded-md border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        rows={3}
                    ></textarea>
                     <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setIsMessaging(false)} disabled={isSendingMessage} className="text-sm bg-gray-200 dark:bg-slate-700 px-3 py-1 rounded-md">Cancel</button>
                        <button onClick={handleSendMessage} disabled={isSendingMessage} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md flex items-center justify-center min-w-[60px]">
                            {isSendingMessage ? <SpinnerIcon className="w-4 h-4" /> : 'Send'}
                        </button>
                    </div>
                </div>
            )}
          </div>

          <h3 className="font-bold text-lg text-center mb-4 text-indigo-500 dark:text-indigo-400">Reservation History</h3>
          <div className="flex-grow overflow-y-auto pr-2 max-h-48">
            {isLoading ? (
              <div className="text-center py-10"><SpinnerIcon className="w-8 h-8 mx-auto text-indigo-500" /></div>
            ) : reservations.length > 0 ? (
              <div className="space-y-3">
                {reservations.map(res => (
                  <div key={res.id} className="bg-gray-100 dark:bg-slate-900/50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold flex items-center gap-2"><LocationIcon /> {res.parkingLotName} - <span className="font-mono">{res.slotId.toUpperCase()}</span></p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${res.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : res.status === 'active' ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200'}`}>{res.status}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 dark:text-slate-400">
                      <span>{res.startTime.toLocaleString()}</span>
                      <span className="font-semibold text-gray-700 dark:text-slate-300">${res.amountPaid.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 dark:text-slate-500 py-10">No reservation history for this user.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
