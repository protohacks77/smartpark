
import React, { useState } from 'react';
import type { Review } from '../../types';
import { TrashIcon, SpinnerIcon } from '../Icons';
// FIX: Switched to Firebase v8 compat imports to resolve missing export errors.
import firebase from 'firebase/compat/app';
import { db } from '../../services/firebase';

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex">
    {/* FIX: Moved the `key` prop to a wrapper element (`span`) instead of passing it directly to the `ion-icon` web component, which does not accept a `key` prop. */}
    {[...Array(5)].map((_, i) => (
      <span key={i}><ion-icon name={i < rating ? 'star' : 'star-outline'} class="w-5 h-5 text-yellow-400"></ion-icon></span>
    ))}
  </div>
);

// FIX: Define a props interface for ReviewCard to correctly type the component.
// This resolves an issue where TypeScript would complain about the 'key' prop
// being passed to the component during a map operation.
interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
    const [replyText, setReplyText] = useState(review.adminReply || '');
    const [isReplying, setIsReplying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleReplySave = async () => {
        setIsSaving(true);
        try {
            // FIX: Use v8 compat syntax for doc and updateDoc.
            const reviewDocRef = db.collection('reviews').doc(review.id);
            await reviewDocRef.update({ adminReply: replyText.trim() });
            
            // Send a notification to the user
            // FIX: Use v8 compat syntax for addDoc, collection, and Timestamp.
            await db.collection('notifications').add({
                userId: review.userId,
                type: 'REVIEW_REPLY',
                message: `An admin has replied to your review for "${review.parkingLotName}".`,
                isRead: false,
                timestamp: firebase.firestore.Timestamp.now(),
                data: {
                    reviewId: review.id
                }
            });

            setIsReplying(false);
        } catch (error) {
            console.error("Error saving reply and sending notification: ", error);
            alert("Failed to save reply.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this review permanently?")) {
            setIsDeleting(true);
            try {
                // FIX: Use v8 compat syntax for deleteDoc and doc.
                await db.collection('reviews').doc(review.id).delete();
            } catch (error) {
                console.error("Error deleting review: ", error);
                alert("Failed to delete review.");
            } finally {
                setIsDeleting(false); // This component will unmount on success, so this is mainly for error cases
            }
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-2">
                        <StarDisplay rating={review.rating} />
                        <div className="flex-grow">
                            <p className="font-semibold text-gray-900 dark:text-white">{review.username}</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">on {review.parkingLotName}</p>
                        </div>
                    </div>
                    {review.comment && <p className="text-gray-700 dark:text-slate-300 mb-2 italic">"{review.comment}"</p>}
                    <p className="text-xs text-gray-400 dark:text-slate-500">{review.timestamp.toDate().toLocaleString()}</p>

                    {/* Admin Reply Section */}
                    {isReplying ? (
                        <div className="mt-3 animate-fade-in-fast">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 p-2 rounded-md border border-gray-300 dark:border-slate-700 focus:ring-indigo-500"
                                rows={2}
                                placeholder="Your reply..."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsReplying(false)} className="text-sm bg-gray-200 dark:bg-slate-700 px-3 py-1 rounded-md">Cancel</button>
                                <button onClick={handleReplySave} disabled={isSaving} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md flex items-center justify-center min-w-[60px]">
                                    {isSaving ? <SpinnerIcon className="w-4 h-4" /> : 'Save'}
                                </button>
                            </div>
                        </div>
                    ) : review.adminReply ? (
                        <div className="mt-3 bg-indigo-100 dark:bg-indigo-900/40 p-3 rounded-md">
                            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Admin Reply:</p>
                            <p className="text-sm text-indigo-700 dark:text-indigo-200">{review.adminReply}</p>
                            <button onClick={() => setIsReplying(true)} className="text-xs text-indigo-500 hover:underline mt-1">Edit Reply</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsReplying(true)} className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline mt-2">
                            Reply
                        </button>
                    )}
                </div>
                <button onClick={handleDelete} disabled={isDeleting} className="text-gray-400 dark:text-slate-500 hover:text-pink-500 transition-colors p-1">
                    {isDeleting ? <SpinnerIcon className="w-5 h-5" /> : <TrashIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};

interface ManageReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
}

const ManageReviewsModal = ({ isOpen, onClose, reviews }: ManageReviewsModalProps) => {
  if (!isOpen) return null;

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
        <div className="relative p-6 text-gray-900 dark:text-white max-h-[80vh] flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
            <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
            </button>

            <h2 className="text-xl font-bold text-center mb-4 text-indigo-500 dark:text-indigo-400">Manage User Reviews ({reviews.length})</h2>
            <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
            {reviews.length > 0 ? (
                reviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                ))
            ) : (
                <p className="text-center text-gray-400 dark:text-slate-500 py-20">No user reviews yet.</p>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ManageReviewsModal;