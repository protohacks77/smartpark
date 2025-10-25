
import React, { useState } from 'react';
// FIX: Switched to Firebase v8 compat imports for auth methods to resolve type mismatch errors.
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import { PersonIcon, LockClosedIcon, GoogleLogoIcon, SpinnerIcon } from './Icons';

interface LoginModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAdminLoginClick?: () => void;
}

const LoginModal = ({ isOpen = true, onClose, onSuccess, onAdminLoginClick }: LoginModalProps) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (isLoginView) {
        // FIX: Use v8 compat syntax for signInWithEmailAndPassword.
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        // FIX: Use v8 compat syntax for createUserWithEmailAndPassword.
        await auth.createUserWithEmailAndPassword(email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      // FIX: Use v8 compat syntax for signInWithPopup and GoogleAuthProvider.
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div 
      className="group relative flex w-full max-w-sm flex-col rounded-xl bg-white dark:bg-slate-950 p-6 shadow-lg dark:shadow-2xl animate-fade-in-fast"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
      <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
      <div className="relative text-gray-900 dark:text-white">
        {onClose && (
            <button onClick={onClose} className="absolute -top-2 -right-2 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
                <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
            </button>
        )}

        <h2 className="text-2xl font-bold text-center mb-2 text-indigo-500 dark:text-indigo-400">{isLoginView ? 'Login' : 'Sign Up'} to Reserve</h2>
        <p className="text-center text-gray-500 dark:text-slate-400 mb-6">Please {isLoginView ? 'login or sign up' : 'create an account'} to continue.</p>
        
        <form onSubmit={handleAuthAction} className="space-y-4">
          <div>
            <div className="relative">
              <PersonIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 pl-10 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
            </div>
          </div>
          <div>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5"/>
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 pl-10 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
            {isLoading ? <SpinnerIcon className="w-5 h-5"/> : (isLoginView ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-200 dark:border-slate-700" />
          <span className="mx-4 text-gray-400 dark:text-slate-500 text-sm">OR</span>
          <hr className="flex-grow border-gray-200 dark:border-slate-700" />
        </div>

        <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center gap-3 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? <SpinnerIcon className="w-5 h-5"/> : <><GoogleLogoIcon /> Continue with Google</>}
        </button>
        
        <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-6">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-indigo-500 dark:text-indigo-400 hover:underline ml-1">
            {isLoginView ? 'Sign Up' : 'Login'}
          </button>
        </p>

        <div className="text-center mt-4">
             <button onClick={onAdminLoginClick} className="text-sm text-gray-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                Login as Admin
            </button>
        </div>

      </div>
    </div>
  );
  
  return (
     <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {content}
    </div>
  )
};

export default LoginModal;
