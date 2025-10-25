import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, setDoc, runTransaction, query, where, orderBy, updateDoc, addDoc, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from './services/firebase';

import type { ActiveTab, Theme, User, ParkingLot, Reservation, UserWithReservations, Notification, Notice } from './types';
import Header from './components/Header';
import Dock from './components/Dock';
import HomeScreen from './components/screens/HomeScreen';
import MapScreen from './components/screens/MapScreen';
import NotificationsScreen from './components/screens/NotificationsScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import NoticeBoardScreen from './components/screens/NoticeBoardScreen';
import LoginModal from './components/LoginModal';
import AdminLoginModal from './components/admin/AdminLoginModal';
import AdminDashboard from './components/admin/AdminDashboard';
import UserDetailsModal from './components/UserDetailsModal';
import LeaveReviewModal from './components/LeaveReviewModal';
import { useGeolocation } from './hooks/useGeolocation';
import { SpinnerIcon } from './components/Icons';
import { createDefaultAdmin } from './services/setupAdmin';
import LoadingModal from './components/LoadingModal';

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
  const [loginView, setLoginView] = useState<'user' | 'admin'>('user');
  const [hasUnreadNotices, setHasUnreadNotices] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const unreadNotifsListener = useRef<() => void | null>(null);
  const [showLoginLoader, setShowLoginLoader] = useState(false);
  const prevUser = useRef<User | null | 'loading'>(user);


  const [selectedLotOnMap, setSelectedLotOnMap] = useState<string | null>(null);
  
  const geolocation = useGeolocation();
  const [route, setRoute] = useState<{ from: [number, number], to: [number, number] } | null>(null);

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
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Simplified admin check based on email instead of custom claims
        if (firebaseUser.email === 'admin@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const fetchedUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: userData.username || firebaseUser.displayName || 'New User',
            carPlate: userData.carPlate || '',
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
            carPlate: '',
            ecocashNumber: '',
            favoriteParkingLots: [],
          };
          await setDoc(userDocRef, newUser);
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
    const q = collection(db, 'parkingLots');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const lots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ParkingLot[];
      setParkingLots(lots);
    });
    return () => unsubscribe();
  }, []);

  // New useEffect to listen for reservations for the current user
  useEffect(() => {
    if (user && user !== 'loading') {
        const q = query(
            collection(db, 'reservations'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
    const q = query(collection(db, 'notices'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
    if (user && user !== 'loading' && notices.length > 0) {
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
    if (user && user !== 'loading') {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            where('isRead', '==', false)
        );
        
        // Unsubscribe from previous listener if it exists
        if (unreadNotifsListener.current) {
            unreadNotifsListener.current();
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
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

  // Mark notices as read when user visits the notice board
  useEffect(() => {
    const markNoticesAsRead = async () => {
      if (activeTab === 'notices' && user && user !== 'loading' && hasUnreadNotices) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const now = Timestamp.now();
          await updateDoc(userDocRef, {
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
        if (activeTab === 'notifications' && user && user !== 'loading' && hasUnreadNotifications) {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                where('isRead', '==', false)
            );
            try {
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) return;
                
                const batch = writeBatch(db);
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


  // Auto-expire reservations logic
  useEffect(() => {
    const checkExpiredReservations = async () => {
      const now = Timestamp.now();
      // FIX: Query only by status to avoid needing a composite index.
      const q = query(
        collection(db, 'reservations'),
        where('status', '==', 'active')
      );

      try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          return; // No active reservations
        }
        
        // FIX: Filter for expired reservations on the client-side.
        const expiredDocs = querySnapshot.docs.filter(doc => doc.data().endTime.toMillis() < now.toMillis());

        if (expiredDocs.length === 0) {
            return; // No expired reservations found
        }

        for (const resDoc of expiredDocs) {
          const reservation = { id: resDoc.id, ...resDoc.data() } as Reservation;
          
          const lotDocRef = doc(db, 'parkingLots', reservation.parkingLotId);
          const resDocRef = doc(db, 'reservations', reservation.id);

          await runTransaction(db, async (transaction) => {
            const lotDoc = await transaction.get(lotDocRef);
            if (!lotDoc.exists()) {
              console.error(`Lot ${reservation.parkingLotId} not found for expired reservation.`);
              return; // Skip this one
            }
            
            const lotData = lotDoc.data() as ParkingLot;
            const slotIndex = lotData.slots.findIndex(s => s.id === reservation.slotId);

            if (slotIndex > -1 && lotData.slots[slotIndex].isOccupied) {
              lotData.slots[slotIndex].isOccupied = false;
              transaction.update(lotDocRef, { slots: lotData.slots });
            }
            
            transaction.update(resDocRef, { status: 'expired' });
          });

          // Send notification AFTER successful transaction
          await addDoc(collection(db, 'notifications'), {
            userId: reservation.userId,
            type: 'TIME_EXPIRED',
            message: `Your parking time at ${reservation.parkingLotName} for slot ${reservation.slotId.toUpperCase()} has expired.`,
            isRead: false,
            timestamp: Timestamp.now()
          });
        }
      } catch (error) {
        console.error("Error processing expired reservations:", error);
      }
    };

    const intervalId = setInterval(checkExpiredReservations, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, []); // Run only once when the app loads

  const handleLogout = () => {
    signOut(auth);
    setIsAdmin(false);
    setActiveTab('home');
  };

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setIsAdminLoginModalOpen(false);
  };
  
  const handleSaveUserDetails = async (details: { carPlate: string; ecocashNumber: string }) => {
    if (user && user !== 'loading') {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { ...details });
      setUser(prevUser => {
        if (!prevUser || prevUser === 'loading') return null;
        return { ...prevUser, ...details };
      });
    }
    setIsUserDetailsModalOpen(false);
  };

  const handleConfirmReservation = async (lotId: string, slotId: string, hours: number) => {
    if (!user || user === 'loading') {
      alert("You must be logged in to make a reservation.");
      return;
    }

    const lotDocRef = doc(db, 'parkingLots', lotId);
    const newReservationRef = doc(collection(db, 'reservations')); // Generate ref beforehand

    try {
      let newReservationData: Omit<Reservation, 'id'> | null = null;
      
      await runTransaction(db, async (transaction) => {
        const lotDoc = await transaction.get(lotDocRef);
        if (!lotDoc.exists()) {
          throw new Error("Parking lot does not exist!");
        }

        const lotData = lotDoc.data() as Omit<ParkingLot, 'id'>;
        const slotIndex = lotData.slots.findIndex(s => s.id === slotId);

        if (slotIndex === -1) {
          throw new Error("Parking slot not found!");
        }

        if (lotData.slots[slotIndex].isOccupied) {
          throw new Error("This slot has just been taken! Please select another one.");
        }

        lotData.slots[slotIndex].isOccupied = true;
        
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

        transaction.update(lotDocRef, { slots: lotData.slots });

        const reservationId = newReservationRef.id;
        newReservationData = {
          userId: user.uid,
          parkingLotId: lotId,
          parkingLotName: lotData.name,
          slotId: slotId,
          startTime: Timestamp.fromDate(startTime),
          endTime: Timestamp.fromDate(endTime),
          durationHours: hours,
          amountPaid: hours * lotData.hourlyRate,
          status: 'confirmed' as const,
        };
        transaction.set(newReservationRef, newReservationData);
      });

      console.log("Reservation successful!");

      // Send notification after transaction is successful
      if (newReservationData) {
        const newNotification: Omit<Notification, 'id'> = {
            userId: user.uid,
            type: 'RESERVED',
            message: `You have successfully reserved spot ${slotId.toUpperCase()} at ${newReservationData.parkingLotName}. Please mark when you have parked.`,
            isRead: false,
            timestamp: Timestamp.now(),
            data: {
                reservationId: newReservationRef.id,
                carPlate: user.carPlate,
                amountPaid: newReservationData.amountPaid,
                hoursLeft: newReservationData.durationHours,
            }
        };
        await addDoc(collection(db, 'notifications'), newNotification);
      }

      const userLocation = geolocation.data?.coords;
      const destinationLot = parkingLots.find(l => l.id === lotId);

      if (userLocation && destinationLot) {
        setRoute({
          from: [userLocation.latitude, userLocation.longitude],
          to: [destinationLot.location.latitude, destinationLot.location.longitude]
        });
        setActiveTab('map');
      }

    } catch (error) {
      console.error("Reservation failed:", error);
      alert(`Could not make reservation: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const handleArrived = () => {
    setRoute(null);
  };
  
  const handleSessionComplete = () => {
    setRoute(null);
  };

  const handleToggleFavorite = async (parkingLotId: string) => {
    if (!user || user === 'loading') return;

    const currentFavorites = user.favoriteParkingLots || [];
    const newFavorites = currentFavorites.includes(parkingLotId)
      ? currentFavorites.filter(id => id !== parkingLotId)
      : [...currentFavorites, parkingLotId];

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, { favoriteParkingLots: newFavorites });
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

  if (user === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <SpinnerIcon className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
      </div>
    );
  }

  const fullUserWithReservations: UserWithReservations | null = (user && user !== 'loading') 
    ? { ...user, reservations: userReservations } 
    : null;

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen 
                  user={fullUserWithReservations} 
                  parkingLots={parkingLots} 
                  onFindParking={() => setActiveTab('map')} 
                  onEditDetails={() => setIsUserDetailsModalOpen(true)}
                  onLeaveReview={() => setIsLeaveReviewModalOpen(true)}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectLotOnMap={handleSelectLotOnMap}
                />;
      case 'map':
        return <MapScreen 
                  parkingLots={parkingLots} 
                  onConfirmReservation={handleConfirmReservation}
                  userLocation={geolocation.data}
                  route={route}
                  onArrived={handleArrived}
                  isLoggedIn={!!user}
                  onLoginSuccess={() => { /* onAuthStateChanged handles this */ }}
                  user={user && user !== 'loading' ? user : null}
                  onToggleFavorite={handleToggleFavorite}
                  selectedLotId={selectedLotOnMap}
                  onClearSelectedLot={() => setSelectedLotOnMap(null)}
                />;
      case 'notifications':
        return <NotificationsScreen 
                  user={user} 
                  reservations={userReservations} 
                  onSessionComplete={handleSessionComplete}
                />;
      case 'notices':
        return <NoticeBoardScreen notices={notices} isLoading={isLoadingNotices} />;
      case 'settings':
        return <SettingsScreen user={user} onLogout={handleLogout} onAdminLogin={() => setIsAdminLoginModalOpen(true)} onUserDetailsUpdate={updatedUser => setUser(updatedUser)} />;
      default:
        return <HomeScreen 
                  user={fullUserWithReservations} 
                  parkingLots={parkingLots} 
                  onFindParking={() => setActiveTab('map')} 
                  onEditDetails={() => setIsUserDetailsModalOpen(true)}
                  onLeaveReview={() => setIsLeaveReviewModalOpen(true)}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectLotOnMap={handleSelectLotOnMap}
                />;
    }
  };

  if (isAdmin) {
    return <AdminDashboard onLogout={handleLogout} theme={theme} onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden text-gray-900 dark:text-white">
      <Header theme={theme} onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
      <main className="h-full w-full" key={activeTab}>{renderScreen()}</main>
      {!!user && <Dock activeTab={activeTab} setActiveTab={setActiveTab} hasUnreadNotices={hasUnreadNotices} hasUnreadNotifications={hasUnreadNotifications} />}
      
      {!user && activeTab !== 'map' && loginView === 'user' && <LoginModal 
        isOpen={!user} 
        onClose={() => { /* Can't close if not logged in */ }}
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

      {user && user !== 'loading' && <UserDetailsModal
        isOpen={isUserDetailsModalOpen}
        onClose={() => setIsUserDetailsModalOpen(false)}
        onSave={handleSaveUserDetails}
        user={user}
      />}

      {user && user !== 'loading' && <LeaveReviewModal
        isOpen={isLeaveReviewModalOpen}
        onClose={() => setIsLeaveReviewModalOpen(false)}
        user={user}
        reservations={userReservations}
        onSuccess={() => {
            alert('Thank you for your feedback!');
            setIsLeaveReviewModalOpen(false);
        }}
       />}

      <LoadingModal isOpen={showLoginLoader} />
    </div>
  );
};

export default App;