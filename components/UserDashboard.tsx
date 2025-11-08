import React from 'react';
import UserSidebar from './UserSidebar';
import type { Theme, ActiveTab, User, ParkingLot, Reservation, Notice } from '../types';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import NoticeBoardScreen from './screens/NoticeBoardScreen';
import SettingsScreen from './screens/SettingsScreen';
import Header from './Header'; // Re-using the existing Header

interface UserDashboardProps {
  user: User;
  userReservations: Reservation[];
  parkingLots: ParkingLot[];
  notices: Notice[];
  isLoadingNotices: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  theme: Theme;
  onThemeToggle: () => void;
  onLogout: () => void;
  hasUnreadNotices: boolean;
  hasUnreadNotifications: boolean;
  geolocation: GeolocationPosition | null;
  onFindParking: () => void;
  onEditDetails: () => void;
  onLeaveReview: () => void;
  onToggleFavorite: (lotId: string) => void;
  onSelectLotOnMap: (lotId: string) => void;
  onLoginSuccess: () => void;
  selectedLotId: string | null;
  onClearSelectedLot: () => void;
  activeRoute: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } } | null;
  onClearActiveRoute: () => void;
  unpaidBill: any; // Replace with Bill type
  onOpenPayBillModal: () => void;
  onOpenUserDetailsModal: () => void;
  onInitiatePayment: (details: any) => void;
  onUpdateUserPlates: (plates: string[]) => Promise<void>;
  onUserDetailsUpdate: (updatedUser: User) => void;
}

const UserDashboard = (props: UserDashboardProps) => {
  const {
    user,
    userReservations,
    parkingLots,
    notices,
    isLoadingNotices,
    activeTab,
    setActiveTab,
    theme,
    onThemeToggle,
    onLogout,
    hasUnreadNotices,
    hasUnreadNotifications,
    geolocation,
    onFindParking,
    onEditDetails,
    onLeaveReview,
    onToggleFavorite,
    onSelectLotOnMap,
    onLoginSuccess,
    selectedLotId,
    onClearSelectedLot,
    activeRoute,
    onClearActiveRoute,
    unpaidBill,
    onOpenPayBillModal,
    onOpenUserDetailsModal,
    onInitiatePayment,
    onUpdateUserPlates,
    onUserDetailsUpdate,
  } = props;

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen
                  user={{ ...user, reservations: userReservations }}
                  parkingLots={parkingLots}
                  onFindParking={onFindParking}
                  onEditDetails={onEditDetails}
                  onLeaveReview={onLeaveReview}
                  onToggleFavorite={onToggleFavorite}
                  onSelectLotOnMap={onSelectLotOnMap}
                />;
      case 'map':
        return <MapScreen
                  parkingLots={parkingLots}
                  userLocation={geolocation}
                  isLoggedIn={!!user}
                  onLoginSuccess={onLoginSuccess}
                  user={user}
                  onToggleFavorite={onToggleFavorite}
                  selectedLotId={selectedLotId}
                  onClearSelectedLot={onClearSelectedLot}
                  activeRoute={activeRoute}
                  onClearActiveRoute={onClearActiveRoute}
                  unpaidBill={unpaidBill}
                  onOpenPayBillModal={onOpenPayBillModal}
                  onOpenUserDetailsModal={onOpenUserDetailsModal}
                  onInitiatePayment={onInitiatePayment}
                  onUpdateUserPlates={onUpdateUserPlates}
                />;
      case 'notifications':
        return <NotificationsScreen
                  user={user}
                  reservations={userReservations}
                  onOpenPayBillModal={onOpenPayBillModal}
                />;
      case 'notices':
        return <NoticeBoardScreen notices={notices} isLoading={isLoadingNotices} />;
      case 'settings':
        return <SettingsScreen user={user} onLogout={onLogout} onAdminLogin={() => {}} onUserDetailsUpdate={onUserDetailsUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans ${theme}`}>
      <UserSidebar
        onLogout={onLogout}
        theme={theme}
        onThemeToggle={onThemeToggle}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasUnreadNotices={hasUnreadNotices}
        hasUnreadNotifications={hasUnreadNotifications}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header theme={theme} onThemeToggle={onThemeToggle} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 p-4">
          {renderScreen()}
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;
