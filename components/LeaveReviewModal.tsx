
import React, { useState, useMemo, useEffect } from 'react';
import type { Reservation, User } from '../types';
import { SpinnerIcon } from './Icons';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  user: User;
  onSuccess: () => void;
}

const StarRating = ({ rating, setRating }: { rating: number, setRating: (r: number) => void }) => {
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="text-4xl text-yellow-400 transition-transform hover:scale-110 focus:outline-none"
        >
          <ion-icon name={star <= rating ? 'star' : 'star-outline'}></ion-icon>
        </button>
      ))}
    </div>
  );
};

const LeaveReviewModal = ({ isOpen, onClose, reservations, user, onSuccess }: LeaveReviewModalProps) => {
  const [selectedLotId, setSelectedLotId] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pastParkingLots = useMemo(() => {
    const uniqueLots = new Map<string, { name: string }>();
    reservations
      .filter(r => r.status === 'completed' || r.status === 'expired')
      .forEach(r => {
        if (!uniqueLots.has(r.parkingLotId)) {
          uniqueLots.set(r.parkingLotId, { name: r.parkingLotName });
        }
      });
    return Array.from(uniqueLots.entries()).map(([id, data]) => ({ id, ...data }));
  }, [reservations]);

  useEffect(() => {
    if (isOpen && pastParkingLots.length > 0) {
      // Pre-select the first lot in the list if none is selected
      if (!selectedLotId) {
        setSelectedLotId(pastParkingLots[0].id);
      }
    } else if (!isOpen) {
      // Reset form on close
      setSelectedLotId('');
      setRating(0);
      setComment('');
      setError('');
    }
  }, [isOpen, pastParkingLots]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    if (!selectedLotId) {
      setError('Please select a parking lot.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    
    const lot = pastParkingLots.find(l => l.id === selectedLotId);
    if (!lot) return;

    try {
        await addDoc(collection(db, 'reviews'), {
            userId: user.uid,
            username: user.username,
            parkingLotId: selectedLotId,
            parkingLotName: lot.name,
            rating: rating,
            comment: comment.trim(),
            timestamp: Timestamp.now(),
        });
        onSuccess();
    } catch (e) {
        console.error("Error submitting review:", e);
        setError('Failed to submit review. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const inputStyle = "w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="group relative flex w-full max-w-md flex-col rounded-xl bg-white dark:bg-slate-950 p-6 shadow-lg dark:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative">
            <button onClick={onClose} className="absolute -top-2 -right-2 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
              <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
            </button>

            <h2 className="text-2xl font-bold text-center mb-2 text-indigo-500 dark:text-indigo-400">Leave a Review</h2>
            <p className="text-center text-gray-500 dark:text-slate-400 mb-6">How was your experience?</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Parking Lot</label>
                <select value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)} className={inputStyle}>
                    {pastParkingLots.map(lot => (
                        <option key={lot.id} value={lot.id}>{lot.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block mb-4 text-center text-sm font-medium text-gray-500 dark:text-slate-400">Your Rating</label>
                <StarRating rating={rating} setRating={setRating} />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Comments (Optional)</label>
                <textarea 
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className={`${inputStyle} h-24`}
                    placeholder="Tell us more about your experience..."
                />
              </div>
              
              {error && <p className="text-pink-500 text-sm text-center -my-2">{error}</p>}

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 flex justify-center items-center"
              >
                {isSubmitting ? <SpinnerIcon className="w-6 h-6"/> : 'Submit Review'}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LeaveReviewModal;