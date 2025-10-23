
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { User, Reservation } from '../../types';
import { PersonIcon, CarIcon, WalletIcon, ClockIcon, LocationIcon, SpinnerIcon, TrashIcon } from '../Icons';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
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

const UserDetailModal = ({ isOpen, onClose, user }: UserDetailModalProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    carPlate: '',
    ecocashNumber: '',
  });

  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    if (user) {
        setFormData({
            username: user.username,
            carPlate: user.carPlate || '',
            ecocashNumber: user.ecocashNumber || '',
        });
        setIsEditing(false); // Reset edit mode when user changes
        setIsMessaging(false); // Reset message mode
        setMessageText('');
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      const fetchReservations = async () => {
        setIsLoading(true);
        try {
          const q = query(
            collection(db, 'reservations'),
            where('userId', '==', user.uid)
          );
          const querySnapshot = await getDocs(q);
          const userReservations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[];
          // Sort client-side to avoid needing a composite index in Firestore
          userReservations.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
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
    const userDocRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(userDocRef, formData);
        setIsEditing(false);
    } catch (error) {
        console.error("Error updating user:", error);
        alert("Failed to save changes.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete user ${user.username}? This action cannot be undone.`)) {
        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, 'users', user.uid));
            // In a real-world scenario, you might want a cloud function to delete associated data (reservations, auth user, etc.)
            onClose();
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user.");
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
            timestamp: Timestamp.now(),
        };
        await addDoc(collection(db, 'notifications'), newNotification);
        
        // Reset form
        setMessageText('');
        setIsMessaging(false);
        alert("Message sent successfully!");

    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message.");
    } finally {
        setIsSendingMessage(false);
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

          <h2 className="text-2xl font-bold text-center mb-6 text-indigo-500 dark:text-indigo-400">User Details</h2>
          
          <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 mb-4">
            <DetailRow icon={<PersonIcon className="w-5 h-5 text-indigo-400 dark:text-indigo-300" />} label="Username" name="username" value={formData.username} isEditing={isEditing} onChange={handleInputChange} />
            <div className="flex items-center gap-3">
              <PersonIcon className="w-5 h-5 text-indigo-400 dark:text-indigo-300" />
              <p><span className="text-gray-500 dark:text-slate-400">Email:</span> <span className="font-semibold">{user.email}</span></p>
            </div>
            <DetailRow icon={<CarIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />} label="Car Plate" name="carPlate" value={formData.carPlate} isEditing={isEditing} onChange={handleInputChange} />
            <DetailRow icon={<WalletIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />} label="Ecocash" name="ecocashNumber" value={formData.ecocashNumber} isEditing={isEditing} onChange={handleInputChange} />
          </div>

          <div className="flex gap-4 mb-6">
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
          
          {/* Send Message Section */}
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
                    />
                    <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => setIsMessaging(false)} className="bg-gray-300 dark:bg-slate-700 hover:bg-gray-400 dark:hover:bg-slate-600 font-semibold py-2 px-3 rounded-lg transition-colors text-sm">Cancel</button>
                        <button onClick={handleSendMessage} disabled={isSendingMessage} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center min-w-[60px]">
                            {isSendingMessage ? <SpinnerIcon className="w-4 h-4"/> : 'Send'}
                        </button>
                    </div>
                </div>
            )}
          </div>

          <h3 className="font-bold text-lg text-indigo-500 dark:text-indigo-400 mb-3">Reservation History ({reservations.length})</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <SpinnerIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                </div>
            ) : reservations.length > 0 ? (
                reservations.map((res, index) => (
                    <div key={res.id} className={`bg-gray-100 dark:bg-slate-900/50 p-3 rounded-lg ${index === 0 ? 'border-2 border-indigo-500' : ''}`}>
                        {index === 0 && <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-2">Last Parking Spot</p>}
                        <div className="flex items-center gap-3 mb-1">
                            <LocationIcon className="w-5 h-5 text-indigo-400 dark:text-indigo-300"/>
                            <p className="font-semibold">{res.parkingLotName} - Slot {res.slotId.toUpperCase()}</p>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400">
                           <p>{res.startTime.toDate().toLocaleString()}</p>
                           <div className="flex items-center gap-4">
                             <div className="flex items-center gap-1"><ClockIcon/>{res.durationHours}h</div>
                             <div className="flex items-center gap-1"><WalletIcon/>${res.amountPaid.toFixed(2)}</div>
                           </div>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-gray-500 dark:text-slate-400 text-center py-8">This user has no reservation history.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;