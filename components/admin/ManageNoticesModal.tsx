
import React, { useState } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve missing export errors.
import firebase from 'firebase/compat/app';
import { db } from '../../services/firebase';
import type { Notice, User } from '../../types';
import { TrashIcon, SpinnerIcon } from '../Icons';

interface ManageNoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: Notice[];
  users: User[];
}

const ManageNoticesModal = ({ isOpen, onClose, notices, users }: ManageNoticesModalProps) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;
  
  const handleShowForm = () => {
    setTitle('');
    setContent('');
    setView('form');
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Title and content cannot be empty.');
      return;
    }
    setIsProcessing(true);
    try {
      const notice = {
        title,
        content,
        timestamp: firebase.firestore.Timestamp.now(),
      };
      // FIX: Use v8 compat syntax for addDoc, collection, and Timestamp.
      await db.collection('notices').add(notice);

      const batch = db.batch();
      selectedUsers.forEach(userId => {
        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
          userId,
          type: 'GENERIC',
          message: title,
          isRead: false,
          timestamp: firebase.firestore.Timestamp.now(),
        });
      });
      await batch.commit();

      setView('list');
    } catch (error) {
      console.error('Error publishing notice:', error);
      alert('Failed to publish notice.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDelete = async (noticeId: string) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
        try {
            // FIX: Use v8 compat syntax for deleteDoc and doc.
            await db.collection('notices').doc(noticeId).delete();
        } catch (error) {
            console.error('Error deleting notice:', error);
            alert('Failed to delete notice.');
        }
    }
  };

  const inputStyle = "w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500";

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

          {view === 'list' && (
            <>
              <h2 className="text-xl font-bold text-center mb-4 text-indigo-500 dark:text-indigo-400">Manage Notices</h2>
              <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                {notices.map(notice => (
                  <div key={notice.id} className="bg-gray-100 dark:bg-slate-900/50 p-3 rounded-lg flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{notice.title}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 whitespace-pre-wrap">{notice.content}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{notice.timestamp.toDate().toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDelete(notice.id)} className="text-gray-400 dark:text-slate-500 hover:text-pink-500 transition-colors self-center ml-4">
                        <TrashIcon />
                    </button>
                  </div>
                ))}
                {notices.length === 0 && <p className="text-center text-gray-400 dark:text-slate-500 py-10">No notices published yet.</p>}
              </div>
              <button onClick={handleShowForm} className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">
                Create New Notice
              </button>
            </>
          )}

          {view === 'form' && (
            <div className="animate-fade-in-fast">
                <h2 className="text-xl font-bold text-center mb-4 text-indigo-500 dark:text-indigo-400">Create New Notice</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputStyle} placeholder="e.g., Holiday Hours" />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Content</label>
                        <textarea value={content} onChange={e => setContent(e.target.value)} className={inputStyle} rows={5} placeholder="Enter the notice details here..."></textarea>
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-slate-400">Select Users</label>
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="select-all"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(users.map(u => u.uid));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                        <label htmlFor="select-all" className="ml-2">Select All</label>
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-slate-700 rounded-lg p-2">
                        {users.map(user => (
                          <div key={user.uid} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`user-${user.uid}`}
                              value={user.uid}
                              checked={selectedUsers.includes(user.uid)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.uid]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(uid => uid !== user.uid));
                                }
                              }}
                            />
                            <label htmlFor={`user-${user.uid}`} className="ml-2">{user.username}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
                 <div className="flex gap-4 pt-6">
                    <button onClick={() => setView('list')} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 font-semibold py-3 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={handlePublish} disabled={isProcessing} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 flex justify-center items-center">
                        {isProcessing ? <SpinnerIcon className="w-6 h-6" /> : 'Publish Notice'}
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageNoticesModal;