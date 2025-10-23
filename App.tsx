import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, setDoc, runTransaction, query, where, orderBy, updateDoc, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { auth, db } from './services/firebase';

import type { ActiveTab, Theme, User, ParkingLot, Reservation, UserWithReservations, Notification } from './types';
import Header from './components/Header';
import Dock from './components/Dock';
import HomeScreen from './components/screens/HomeScreen';
import MapScreen from './components/screens/MapScreen';
import NotificationsScreen from './components/screens/NotificationsScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import LoginModal from './components/LoginModal';
import AdminLoginModal from './components/admin/AdminLoginModal';
import AdminDashboard from './components/admin/AdminDashboard';
import UserDetailsModal from './components/UserDetailsModal';
import { useGeolocation } from './hooks/useGeolocation';
import { SpinnerIcon } from './components/Icons';
import { createDefaultAdmin } from './services/setupAdmin';

const App = () => {
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [loginView, setLoginView] = useState<'user' | 'admin'>('user');
  
  const geolocation = useGeolocation();
  const [route, setRoute] = useState<{ from: [number, number], to: [number, number] } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.className = theme === 'dark' ? 'bg-slate-950 font-sans' : 'bg-gray-50 font-sans';
  }, [theme]);

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
          };
          setUser(fetchedUser);
        } else {
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            username: firebaseUser.displayName || 'New User',
            carPlate: '',
            ecocashNumber: '',
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
                />;
      case 'notifications':
        return <NotificationsScreen 
                  user={user} 
                  reservations={userReservations} 
                  onSessionComplete={handleSessionComplete}
                />;
      case 'settings':
        return <SettingsScreen user={user} onLogout={handleLogout} onAdminLogin={() => setIsAdminLoginModalOpen(true)} onUserDetailsUpdate={updatedUser => setUser(updatedUser)} />;
      default:
        return <HomeScreen 
                  user={fullUserWithReservations} 
                  parkingLots={parkingLots} 
                  onFindParking={() => setActiveTab('map')} 
                  onEditDetails={() => setIsUserDetailsModalOpen(true)}
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
      {!!user && <Dock activeTab={activeTab} setActiveTab={setActiveTab} />}
      
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
    </div>
  );
};

export default App;