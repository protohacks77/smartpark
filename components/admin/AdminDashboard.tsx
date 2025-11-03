import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import type { User, Reservation, ParkingLot, Theme, Notice, Review } from '../../types';
import {
  BarChartIcon,
  PersonIcon,
  TrendingUpIcon,
  SpinnerIcon,
} from '../Icons';
import ViewAllUsersModal from './ViewAllUsersModal';
import AddUserModal from './AddUserModal';
import ManageParkingModal from './ManageParkingModal';
import UserDetailModal from './UserDetailModal';
import LocationInfoModal from './LocationInfoModal';
import ReportGenerationModal from './ReportGenerationModal';
import ManageNoticesModal from './ManageNoticesModal';
import ManageReviewsModal from './ManageReviewsModal';
import LiveOccupancyTable from './LiveOccupancyTable';
import Sidebar from './Sidebar';
import Header from './Header';
import OccupancyMap from './OccupancyMap';
import AdminSearch from './AdminSearch';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts';

const StatCard = ({ title, value, data, dataKey, color }: { title: string, value: string, data: any[], dataKey: string, color: string }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
        <p className="text-gray-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        <div className="h-16 mt-2">
            <ResponsiveContainer>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={color} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill={`url(#${color})`} isAnimationActive={true} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const DonutChartCard = ({ title, value, percentage, color }: { title: string, value: string, percentage: number, color: string }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex flex-col items-center">
        <p className="text-gray-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        <div className="w-24 h-24 relative mt-2">
            <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                    className="text-gray-200 dark:text-slate-700"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                />
                <path
                    className={`${color} transition-all duration-1000 ease-in-out`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${percentage}, 100`}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xl font-bold">{percentage.toFixed(0)}%</p>
            </div>
        </div>
    </div>
);

const AdminDashboard = ({ onLogout, theme, onThemeToggle }: { onLogout: () => void, theme: Theme, onThemeToggle: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isParkingModalOpen, setIsParkingModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isNoticesModalOpen, setIsNoticesModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lot: ParkingLot, slotId?: string} | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMapVisible, setIsMapVisible] = useState(true);
  
  useEffect(() => {
    if (toastMessage) {
        const timer = setTimeout(() => setToastMessage(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  
    const fetchStaticData = async () => {
      try {
        const usersPromise = db.collection('users').get();
        const reservationsPromise = db.collection('reservations').get();
        const [usersSnapshot, reservationsSnapshot] = await Promise.all([usersPromise, reservationsPromise]);
        setUsers(usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as User[]);
        setReservations(reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[]);
      } catch (err) {
        console.error("Failed to fetch static dashboard data:", err);
        setError("Failed to load user or reservation data.");
      }
    };
  
    const unsubscribeLots = db.collection('parkingLots').onSnapshot((snapshot) => {
      setParkingLots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ParkingLot[]);
      if (isLoading) {
        fetchStaticData().finally(() => setIsLoading(false));
      }
    }, (err) => {
      console.error("Failed to listen for parking lots:", err);
      setError("Failed to load parking lot data.");
      setIsLoading(false);
    });
  
    return () => unsubscribeLots();
  }, []);

  useEffect(() => {
    const q = db.collection('notices').orderBy('timestamp', 'desc');
    const unsubscribe = q.onSnapshot((querySnapshot) => {
        setNotices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notice[]);
    }, (err) => {
        console.error("Failed to fetch notices in real-time:", err);
        setError(prevError => prevError || "Failed to load notices. Please try refreshing.");
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = db.collection('reviews').orderBy('timestamp', 'desc');
    const unsubscribe = q.onSnapshot((querySnapshot) => {
        setReviews(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[]);
    }, (err) => {
        console.error("Failed to fetch reviews in real-time:", err);
        setError(prevError => prevError || "Failed to load reviews. Please try refreshing.");
    });
    return () => unsubscribe();
  }, []);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { revenue: number, reservations: number, users: number, notices: number }>();
    reservations.forEach(res => {
        const date = res.startTime.toDate().toISOString().split('T')[0];
        const existing = dataMap.get(date) || { revenue: 0, reservations: 0, users: 0, notices: 0 };
        dataMap.set(date, { ...existing, revenue: existing.revenue + res.amountPaid, reservations: existing.reservations + 1 });
    });
    users.forEach(user => {
        const date = (user as any).createdAt?.toDate().toISOString().split('T')[0];
        if (date) {
            const existing = dataMap.get(date) || { revenue: 0, reservations: 0, users: 0, notices: 0 };
            dataMap.set(date, { ...existing, users: existing.users + 1 });
        }
    });
    notices.forEach(notice => {
        const date = notice.timestamp.toDate().toISOString().split('T')[0];
        const existing = dataMap.get(date) || { revenue: 0, reservations: 0, users: 0, notices: 0 };
        dataMap.set(date, { ...existing, notices: existing.notices + 1 });
    });
    return Array.from(dataMap.entries()).map(([name, value]) => ({ name, ...value }));
  }, [reservations, users, notices]);

  const newUserPercentage = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsers = users.filter(user => (user as any).createdAt?.toDate() > oneWeekAgo);
    return users.length > 0 ? (newUsers.length / users.length) * 100 : 0;
  }, [users]);

  const newReviewsPercentage = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newReviews = reviews.filter(review => review.timestamp.toDate() > oneWeekAgo);
    return reviews.length > 0 ? (newReviews.length / reviews.length) * 100 : 0;
  }, [reviews]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setIsUsersModalOpen(false);
  };
  
  const handleNavigate = (view: string) => {
    setIsMapVisible(view === 'dashboard');
    switch (view) {
      case 'users':
        setIsUsersModalOpen(true);
        break;
      case 'addUser':
        setIsAddUserModalOpen(true);
        break;
      case 'parking':
        setIsParkingModalOpen(true);
        break;
      case 'notices':
        setIsNoticesModalOpen(true);
        break;
      case 'reviews':
        setIsReviewsModalOpen(true);
        break;
      case 'reports':
        setIsReportModalOpen(true);
        break;
      default:
        break;
    }
  };

  const totalRevenue = reservations.reduce((sum, res) => sum + res.amountPaid, 0);

  const filteredReservations = useMemo(() => {
    if (!searchQuery) return reservations;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return reservations.filter(res => {
      const user = users.find(u => u.uid === res.userId);
      return res.parkingLotName.toLowerCase().includes(lowerCaseQuery) ||
             res.slotId.toLowerCase().includes(lowerCaseQuery) ||
             (user && user.username && user.username.toLowerCase().includes(lowerCaseQuery)) ||
             (user && user.carPlates && user.carPlates.some(plate => plate.toLowerCase().includes(lowerCaseQuery)));
    });
  }, [searchQuery, reservations, users]);

  const handleSearchResultSelect = (result: { type: 'user' | 'lot' | 'slot', data: any }) => {
    if (result.type === 'user') {
      handleSelectUser(result.data as User);
    } else if (result.type === 'lot') {
      setSelectedLocation({ lot: result.data as ParkingLot });
    } else if (result.type === 'slot') {
      const lot = parkingLots.find(p => p.id === result.data.lotId);
      if (lot) {
        setSelectedLocation({ lot, slotId: result.data.id });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <SpinnerIcon className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white p-4">
        <p className="text-xl text-pink-500 mb-4">An Error Occurred</p>
        <p className="text-gray-500 dark:text-slate-400 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gray-100 text-gray-900 font-sans ${theme}`}>
      <Sidebar onLogout={onLogout} theme={theme} onThemeToggle={onThemeToggle} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onSearch={setSearchQuery} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-slate-900 p-4">
          <AdminSearch users={users} parkingLots={parkingLots} onResultSelect={handleSearchResultSelect} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
            <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} data={chartData} dataKey="revenue" color="#8884d8" />
            <StatCard title="Reservations" value={reservations.length.toString()} data={chartData} dataKey="reservations" color="#82ca9d" />
            <StatCard title="Users" value={users.length.toString()} data={chartData} dataKey="users" color="#ffc658" />
            <StatCard title="Notices" value={notices.length.toString()} data={chartData} dataKey="notices" color="#ff8042" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {isMapVisible && (
              <div className="lg:col-span-2">
                <OccupancyMap parkingLots={parkingLots} />
              </div>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isMapVisible ? 'lg:grid-cols-1' : 'lg:col-span-3 lg:grid-cols-4'}`}>
              <DonutChartCard title="New Users" value={users.length.toString()} percentage={newUserPercentage} color="text-green-500" />
              <DonutChartCard title="New Reviews" value={reviews.length.toString()} percentage={newReviewsPercentage} color="text-blue-500" />
            </div>
          </div>
          <div className="mt-4">
            <LiveOccupancyTable reservations={filteredReservations} users={users} />
          </div>
        </main>
      </div>
      
      <ManageParkingModal 
        isOpen={isParkingModalOpen}
        onClose={() => setIsParkingModalOpen(false)}
        parkingLots={parkingLots}
        onSaveSuccess={(message) => setToastMessage(message)}
      />
      
      <ViewAllUsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={users}
        onSelectUser={handleSelectUser}
      />

      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={(newUser) => {
          setUsers([...users, newUser]);
          setToastMessage(`User ${newUser.username} added successfully!`);
        }}
      />

      {selectedUser && (
        <UserDetailModal
            isOpen={!!selectedUser}
            onClose={() => setSelectedUser(null)}
            user={selectedUser}
            onDeleteSuccess={(message) => {
              setToastMessage(message);
              setUsers(users.filter(u => u.uid !== selectedUser.uid));
              setSelectedUser(null);
            }}
        />
      )}

      {selectedLocation && (
        <LocationInfoModal
            isOpen={!!selectedLocation}
            onClose={() => setSelectedLocation(null)}
            data={selectedLocation}
            allReservations={reservations}
            allUsers={users}
        />
      )}
      
      <ReportGenerationModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        allReservations={reservations}
        allUsers={users}
        allParkingLots={parkingLots}
      />

      <ManageNoticesModal
        isOpen={isNoticesModalOpen}
        onClose={() => setIsNoticesModalOpen(false)}
        notices={notices}
        users={users}
      />

      <ManageReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        reviews={reviews}
      />
    </div>
  );
};

export default AdminDashboard;
