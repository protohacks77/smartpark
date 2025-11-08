import React, { useState, useEffect, useRef } from 'react';
// FIX: Switched to Firebase v8 compat imports for auth methods to resolve type mismatch errors.
import firebase from 'firebase/compat/app';
import { auth, db } from './services/firebase';

import type { ActiveTab, Theme, User, ParkingLot, Reservation, UserWithReservations, Notification, Notice, Bill } from './types';
import UserDashboard from './components/UserDashboard';
import LoginModal from './components/LoginModal';
import AdminLoginModal from './components/admin/AdminLoginModal';
import AdminDashboard from './components/admin/AdminDashboard';
import UserDetailsModal from './components/UserDetailsModal';
import LeaveReviewModal from './components/LeaveReviewModal';
import PayBillModal from './components/PayBillModal';
import { useGeolocation } from './hooks/useGeolocation';
import { SpinnerIcon } from './components/Icons';
import { createDefaultAdmin } from './services/setupAdmin';
import LoadingModal from './components/LoadingModal';
import PaymentScreen from './components/screens/PaymentScreen';

// --- Type Definitions for View State ---
interface ReservationDetails {
    lotId: string;
    slotId: string;
    hours: number;
    amount: number;
    userId: string;
    email: string;
    lotName: string;
    destinationLat: number;
    destinationLng: number;
}
type ViewState = 
    | { name: 'main' } 
    | { name: 'payment', details: ReservationDetails };


const App = () => {
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [isLeaveReviewModalOpen, setIsLeaveReviewModalOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<{ origin: { lat: number, lng: number }, destination: { lat: number, lng: number } } | null>(null);
  const [loginView, setLoginView] = useState<'user' | 'admin'>('user');
  const [hasUnreadNotices, setHasUnreadNotices] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const unreadNotifsListener = useRef<() => void | null>(null);
  const [showLoginLoader, setShowLoginLoader] = useState(false);
  const prevUser = useRef<User | null | 'loading'>(user);
  const [unpaidBill, setUnpaidBill] = useState<Bill | null>(null);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ name: 'main' });

  const [selectedLotOnMap, setSelectedLotOnMap] = useState<string | null>(null);
  
  const geolocation = useGeolocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.className = theme === 'dark' ? 'bg-slate-950 font-sans' : 'bg-gray-50 font-sans';
  }, [theme]);

  // Logic to show loader on login
  useEffect(() => {
    // This effect runs after every render, so we compare the current user with the previous one
    if (prevUser.current === null && user && user !== 'loading') {
      // Transition from logged out to logged in
      setShowLoginLoader(true);
      const timer = setTimeout(() => {
        setShowLoginLoader(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
    // Update the ref to the current user for the next render
    prevUser.current = user;
  }, [user]);

  // Ensure the default admin user exists on first app load
  useEffect(() => {
    createDefaultAdmin();
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      if (sessionStorage.getItem('isAdmin')) {
        handleLogout();
      }
    };

    const handleBeforeUnload = () => {
      if (isAdmin) {
        sessionStorage.setItem('isAdmin', 'true');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    handleRefresh();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAdmin]);
  
  // Listen for auth state changes
  useEffect(() => {
    // FIX: Use v8 compat syntax for onAuthStateChanged.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: firebase.User | null) => {
      if (firebaseUser) {
        // Simplified admin check based on email instead of custom claims
        if (firebaseUser.email === 'admin@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }

        // FIX: Use v8 compat syntax for doc and getDoc.
        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        const userDocSnap = await userDocRef.get();
        
        if (userDocSnap.exists) {
          const userData = userDocSnap.data();
          const fetchedUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: userData.username || firebaseUser.displayName || 'New User',
            carPlates: userData.carPlates || [],
            ecocashNumber: userData.ecocashNumber || '',
            lastViewedNotices: userData.lastViewedNotices,
            favoriteParkingLots: userData.favoriteParkingLots || [],
          };
          setUser(fetchedUser);
        } else {
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            username: firebaseUser.displayName || 'New User',
            carPlates: [],
            ecocashNumber: '',
            favoriteParkingLots: [],
          };
          // FIX: Use v8 compat syntax for setDoc.
          await userDocRef.set(newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setLoginView('user'); // Reset to user login view on logout
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for real-time parking lot updates
  useEffect(() => {
    // FIX: Use v8 compat syntax for collection and onSnapshot.
    const q = db.collection('parkingLots');
    const unsubscribe = q.onSnapshot((querySnapshot) => {
      const lots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ParkingLot[];
      setParkingLots(lots);
    });
    return () => unsubscribe();
  }, []);

  // New useEffect to listen for reservations for the current user
  useEffect(() => {
    // FIX: Use a type-safe check to ensure user is a User object, not the 'loading' string.
    if (user && typeof user === 'object') {
        // FIX: Use v8 compat syntax for query, collection, and where.
        const q = db.collection('reservations')
            .where('userId', '==', user.uid);

        // FIX: Use v8 compat syntax for onSnapshot.
        const unsubscribe = q.onSnapshot((querySnapshot) => {
            const res = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[];
            // Sort client-side to avoid needing a composite index in Firestore
            res.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
            setUserReservations(res);
        });

        return () => unsubscribe();
    } else {
        setUserReservations([]); // Clear reservations on logout
    }
  }, [user]);

  // Listen for notices
  useEffect(() => {
    // FIX: Use v8 compat syntax for query, collection, and orderBy.
    const q = db.collection('notices').orderBy('timestamp', 'desc');
    // FIX: Use v8 compat syntax for onSnapshot.
    const unsubscribe = q.onSnapshot((querySnapshot) => {
        const fetchedNotices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notice[];
        setNotices(fetchedNotices);
        setIsLoadingNotices(false);
    }, (error) => {
        console.error("Error fetching notices: ", error);
        setIsLoadingNotices(false);
    });
    return () => unsubscribe();
  }, []);

  // Check for unread notices
  useEffect(() => {
    // FIX: Use a type-safe check to ensure user is a User object.
    if (user && typeof user === 'object' && notices.length > 0) {
      const newestNoticeTimestamp = notices[0].timestamp;
      const lastViewedTimestamp = user.lastViewedNotices;

      if (!lastViewedTimestamp || newestNoticeTimestamp.toMillis() > lastViewedTimestamp.toMillis()) {
        setHasUnreadNotices(true);
      } else {
        setHasUnreadNotices(false);
      }
    } else {
      setHasUnreadNotices(false);
    }
  }, [user, notices]);
  
  // Listen for unread notifications (for the badge)
  useEffect(() => {
    // FIX: Use a type-safe check to ensure user is a User object.
    if (user && typeof user === 'object') {
        // FIX: Use v8 compat syntax for query, collection, and where.
        const q = db.collection('notifications')
            .where('userId', '==', user.uid)
            .where('isRead', '==', false);
        
        // Unsubscribe from previous listener if it exists
        if (unreadNotifsListener.current) {
            unreadNotifsListener.current();
        }

        // FIX: Use v8 compat syntax for onSnapshot.
        const unsubscribe = q.onSnapshot((snapshot) => {
            setHasUnreadNotifications(!snapshot.empty);
        });
        
        unreadNotifsListener.current = unsubscribe;

        return () => {
            if (unreadNotifsListener.current) {
                unreadNotifsListener.current();
                unreadNotifsListener.current = null;
            }
        };
    } else {
        // Cleanup on logout
        if (unreadNotifsListener.current) {
            unreadNotifsListener.current();
            unreadNotifsListener.current = null;
        }
        setHasUnreadNotifications(false);
    }
  }, [user]);

  // Listen for unpaid bills
  useEffect(() => {
    // FIX: Use a type-safe check to ensure user is a User object.
    if (user && typeof user === 'object') {
        // FIX: Use v8 compat syntax for query, collection, and where.
        const q = db.collection('bills')
            .where('userId', '==', user.uid)
            .where('status', '==', 'unpaid');
        // FIX: Use v8 compat syntax for onSnapshot.
        const unsubscribe = q.onSnapshot((snapshot) => {
            if (!snapshot.empty) {
                const billDoc = snapshot.docs[0];
                setUnpaidBill({ id: billDoc.id, ...billDoc.data() } as Bill);
            } else {
                setUnpaidBill(null);
            }
        });
        return () => unsubscribe();
    } else {
        setUnpaidBill(null);
    }
  }, [user]);

  // Mark notices as read when user visits the notice board
  useEffect(() => {
    const markNoticesAsRead = async () => {
      // FIX: Use a type-safe check to ensure user is a User object.
      if (activeTab === 'notices' && user && typeof user === 'object' && hasUnreadNotices) {
        // FIX: Use v8 compat syntax for doc.
        const userDocRef = db.collection('users').doc(user.uid);
        try {
          // FIX: Use v8 compat syntax for Timestamp.
          const now = firebase.firestore.Timestamp.now();
          // FIX: Use v8 compat syntax for updateDoc.
          await userDocRef.update({
            lastViewedNotices: now
          });
          // Update user state locally to reflect the change immediately and remove badge
          setUser(prevUser => {
              if (!prevUser || prevUser === 'loading') return prevUser;
              return { ...prevUser, lastViewedNotices: now };
          });
        } catch (error) {
          console.error("Error updating lastViewedNotices:", error);
        }
      }
    };
    markNoticesAsRead();
  }, [activeTab, user, hasUnreadNotices]);

  // Mark notifications as read when user visits the notifications screen
  useEffect(() => {
    const markNotificationsAsRead = async () => {
        // FIX: Use a type-safe check to ensure user is a User object.
        if (activeTab === 'notifications' && user && typeof user === 'object' && hasUnreadNotifications) {
            // FIX: Use v8 compat syntax for query, collection, and where.
            const q = db.collection('notifications')
                .where('userId', '==', user.uid)
                .where('isRead', '==', false);
            try {
                // FIX: Use v8 compat syntax for getDocs.
                const querySnapshot = await q.get();
                if (querySnapshot.empty) return;
                
                // FIX: Use v8 compat syntax for writeBatch.
                const batch = db.batch();
                querySnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { isRead: true });
                });
                await batch.commit();
                // The real-time listener will automatically update hasUnreadNotifications to false.
            } catch (error) {
                console.error("Error marking notifications as read:", error);
            }
        }
    };
    markNotificationsAsRead();
  }, [activeTab, user, hasUnreadNotifications]);


  // Billing and overstay logic
  useEffect(() => {
    const checkOverstayAndBill = async () => {
      // FIX: Use v8 compat syntax for Timestamp.
      const nowTimestamp = firebase.firestore.Timestamp.now();
      // Query only for active reservations to avoid needing a composite index.
      // FIX: Use v8 compat syntax for query, collection, and where.
      const q = db.collection('reservations').where('status', '==', 'active');

      try {
        // FIX: Use v8 compat syntax for getDocs.
        const querySnapshot = await q.get();
        if (querySnapshot.empty) return;

        // Filter for expired reservations on the client side.
        const overstayedReservations = querySnapshot.docs.filter(doc => {
          const reservation = doc.data() as Reservation;
          return reservation.endTime.toMillis() < nowTimestamp.toMillis();
        });

        if (overstayedReservations.length === 0) return;

        for (const resDoc of overstayedReservations) {
          const reservation = { id: resDoc.id, ...resDoc.data() } as Reservation;
          const endTime = reservation.endTime.toMillis();
          const hoursOver = Math.ceil((nowTimestamp.toMillis() - endTime) / (1000 * 60 * 60));
          const billAmount = hoursOver * 2; // $2 per hour

          // FIX: Use v8 compat syntax for query, collection, and where.
          const billsQuery = db.collection('bills').where('reservationId', '==', reservation.id);
          // FIX: Use v8 compat syntax for getDocs.
          const billsSnapshot = await billsQuery.get();

          if (billsSnapshot.empty) {
            // Create new bill
            // FIX: Use v8 compat syntax for doc and collection.
            const newBillRef = db.collection('bills').doc();
            const newBill: Omit<Bill, 'id'> = {
              userId: reservation.userId,
              reservationId: reservation.id,
              amount: billAmount,
              status: 'unpaid',
              // FIX: Use v8 compat syntax for Timestamp.
              createdAt: firebase.firestore.Timestamp.now(),
              updatedAt: firebase.firestore.Timestamp.now(),
            };
            // FIX: Use v8 compat syntax for setDoc.
            await newBillRef.set(newBill);
            // Send notification
            // FIX: Use v8 compat syntax for addDoc and collection.
            await db.collection('notifications').add({
              userId: reservation.userId,
              type: 'BILL_DUE',
              message: `Your time at ${reservation.parkingLotName} has expired. An overstay bill has been generated.`,
              isRead: false,
              // FIX: Use v8 compat syntax for Timestamp.
              timestamp: firebase.firestore.Timestamp.now(),
              data: { billId: newBillRef.id, billAmount: billAmount },
            });
          } else {
            // Update existing bill
            const billDoc = billsSnapshot.docs[0];
            const existingBill = billDoc.data() as Bill;
            if (billAmount > existingBill.amount) {
              // FIX: Use v8 compat syntax for updateDoc.
              await billDoc.ref.update({ amount: billAmount, updatedAt: firebase.firestore.Timestamp.now() });
            }
          }
        }
      } catch (error) {
        console.error("Error processing overstay bills:", error);
      }
    };

    const intervalId = setInterval(checkOverstayAndBill, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    // FIX: Use v8 compat syntax for signOut.
    auth.signOut();
    setIsAdmin(false);
    setActiveTab('home');
  };

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setIsAdminLoginModalOpen(false);
  };
  
  const handleSaveUserDetails = async (details: { carPlates: string[]; ecocashNumber: string }) => {
    // FIX: Use a type-safe check to ensure user is a User object.
    if (user && typeof user === 'object') {
      // FIX: Use v8 compat syntax for doc and updateDoc.
      const userDocRef = db.collection('users').doc(user.uid);
      await userDocRef.update({ ...details });
      setUser(prevUser => {
        if (!prevUser || prevUser === 'loading') return null;
        return { ...prevUser, ...details };
      });
    }
    setIsUserDetailsModalOpen(false);
  };

  const handleUpdateUserPlates = async (plates: string[]) => {
    if (user && typeof user === 'object') {
      const userDocRef = db.collection('users').doc(user.uid);
      await userDocRef.update({ carPlates: plates });
      setUser(prevUser => {
        if (!prevUser || prevUser === 'loading') return null;
        return { ...prevUser, carPlates: plates };
      });
    }
  };
  
  const handleToggleFavorite = async (parkingLotId: string) => {
    // FIX: Use a type-safe check to ensure user is a User object.
    if (!user || typeof user !== 'object') return;

    const currentFavorites = user.favoriteParkingLots || [];
    const newFavorites = currentFavorites.includes(parkingLotId)
      ? currentFavorites.filter(id => id !== parkingLotId)
      : [...currentFavorites, parkingLotId];

    // FIX: Use v8 compat syntax for doc and updateDoc.
    const userDocRef = db.collection('users').doc(user.uid);
    try {
      await userDocRef.update({ favoriteParkingLots: newFavorites });
      setUser(prev => {
        if (!prev || prev === 'loading') return prev;
        return { ...prev, favoriteParkingLots: newFavorites };
      });
    } catch (error) {
      console.error("Error updating favorites:", error);
      alert("Could not update your favorites. Please try again.");
    }
  };

  const handleSelectLotOnMap = (lotId: string) => {
    setSelectedLotOnMap(lotId);
    setActiveTab('map');
  };

  const handleInitiatePayment = (details: ReservationDetails) => {
    setViewState({ name: 'payment', details });
  };

  const handlePaymentSuccess = (details: { lotId: string, destination: { lat: number, lng: number } }) => {
    // The success message is now shown on the payment screen itself.
    if (geolocation.data) {
        setActiveRoute({
            origin: { lat: geolocation.data.coords.latitude, lng: geolocation.data.coords.longitude },
            destination: details.destination
        });
        setSelectedLotOnMap(details.lotId);
        setActiveTab('map');
        setViewState({ name: 'main' });
    } else {
        alert("Could not retrieve your current location to start navigation. Your spot is reserved.");
        setSelectedLotOnMap(details.lotId);
        setActiveTab('map');
        setViewState({ name: 'main' });
    }
  };


  if (user === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <SpinnerIcon className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
      </div>
    );
  }
  
  if (viewState.name === 'payment') {
    return (
        <PaymentScreen 
            details={viewState.details}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setViewState({ name: 'main' })}
        />
    );
  }

  if (isAdmin) {
    return <AdminDashboard onLogout={handleLogout} theme={theme} onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />;
  }

  if (user && typeof user === 'object') {
    return (
      <UserDashboard
        user={user}
        userReservations={userReservations}
        parkingLots={parkingLots}
        notices={notices}
        isLoadingNotices={isLoadingNotices}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onLogout={handleLogout}
        hasUnreadNotices={hasUnreadNotices}
        hasUnreadNotifications={hasUnreadNotifications}
        geolocation={geolocation.data}
        onFindParking={() => setActiveTab('map')}
        onEditDetails={() => setIsUserDetailsModalOpen(true)}
        onLeaveReview={() => setIsLeaveReviewModalOpen(true)}
        onToggleFavorite={handleToggleFavorite}
        onSelectLotOnMap={handleSelectLotOnMap}
        onLoginSuccess={() => {}}
        selectedLotId={selectedLotOnMap}
        onClearSelectedLot={() => setSelectedLotOnMap(null)}
        activeRoute={activeRoute}
        onClearActiveRoute={() => setActiveRoute(null)}
        unpaidBill={unpaidBill}
        onOpenPayBillModal={() => setIsPayBillModalOpen(true)}
        onOpenUserDetailsModal={() => setIsUserDetailsModalOpen(true)}
        onInitiatePayment={handleInitiatePayment}
        onUpdateUserPlates={handleUpdateUserPlates}
        onUserDetailsUpdate={updatedUser => setUser(updatedUser)}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden text-gray-900 dark:text-white">
      {!user && loginView === 'user' && <LoginModal
        isOpen={!user}
        onClose={() => {}}
        onSuccess={() => { /* onAuthStateChanged handles this */ }}
        onAdminLoginClick={() => setLoginView('admin')}
      />}
      
      <AdminLoginModal 
        isOpen={isAdminLoginModalOpen || (!user && loginView === 'admin')} 
        onClose={() => {
            setIsAdminLoginModalOpen(false);
            if (!user) {
                setLoginView('user');
            }
        }}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* FIX: Use a type-safe check to ensure user is a User object before rendering modals. */}
      {user && typeof user === 'object' && <UserDetailsModal
        isOpen={isUserDetailsModalOpen}
        onClose={() => setIsUserDetailsModalOpen(false)}
        onSave={handleSaveUserDetails}
        user={user}
      />}

      {user && typeof user === 'object' && <LeaveReviewModal
        isOpen={isLeaveReviewModalOpen}
        onClose={() => setIsLeaveReviewModalOpen(false)}
        user={user}
        reservations={userReservations}
        onSuccess={() => {
            alert('Thank you for your feedback!');
            setIsLeaveReviewModalOpen(false);
        }}
       />}
      
      {user && typeof user === 'object' && unpaidBill && <PayBillModal
        isOpen={isPayBillModalOpen}
        onClose={() => setIsPayBillModalOpen(false)}
        bill={unpaidBill}
        user={user}
        onSuccess={() => {
            alert("Bill paid successfully!");
            setIsPayBillModalOpen(false);
        }}
       />}

      <LoadingModal isOpen={showLoginLoader} />
    </div>
  );
};

export default App;
