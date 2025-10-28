import React, { useEffect, useRef, useState } from 'react';
import type { ParkingLot, User, Bill } from '../../types';
import { LocationIcon, CarIcon, LayersIcon, StarIcon, StarFilledIcon } from '../Icons';
import ReservationModal from '../ReservationModal';
import LoginModal from '../LoginModal';
import NavigationInstructions from '../NavigationInstructions';

// Leaflet is loaded via CDN, declare it to TypeScript
declare const L: any;

const tileLayers = {
  default: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }
};

// Helper function to calculate spiderfy positions
const calculateSpiderfyPositions = (center: { lat: number, lng: number }, count: number, distance: number) => {
  if (count === 0) return [];
  const positions: { lat: number, lng: number }[] = [];
  const angleStep = (2 * Math.PI) / count;
  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    positions.push({
      lat: center.lat + distance * Math.cos(angle),
      lng: center.lng + distance * Math.sin(angle) * 1.7, 
    });
  }
  return positions;
};

interface MapScreenProps {
  parkingLots: ParkingLot[];
  userLocation: GeolocationPosition | null;
  isLoggedIn: boolean;
  onLoginSuccess: () => void;
  user: User | null;
  onToggleFavorite: (lotId: string) => void;
  selectedLotId: string | null;
  onClearSelectedLot: () => void;
  activeRoute: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } } | null;
  onClearActiveRoute: () => void;
  unpaidBill: Bill | null;
  onOpenPayBillModal: () => void;
  onOpenUserDetailsModal: () => void;
  onInitiatePayment: (details: any) => void;
}

interface MapButtonProps {
  // FIX: Add children prop to allow this component to wrap other elements.
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  className?: string;
}

const MapButton: React.FC<MapButtonProps> = ({ children, onClick, title, className = "" }) => {
  return (
    <button onClick={onClick} title={title} className={`group relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-950 text-gray-900 dark:text-white shadow-lg dark:shadow-2xl transition-all duration-300 hover:scale-110 ${className}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-20 dark:group-hover:opacity-30"></div>
        <div className="absolute inset-px rounded-full bg-white dark:bg-slate-950"></div>
        <div className="relative z-10">{children}</div>
    </button>
  );
};

const MapScreen = ({ 
    parkingLots, 
    userLocation, 
    isLoggedIn, 
    onLoginSuccess, 
    user, 
    onToggleFavorite, 
    selectedLotId, 
    onClearSelectedLot,
    activeRoute,
    onClearActiveRoute,
    unpaidBill,
    onOpenPayBillModal,
    onOpenUserDetailsModal,
    onInitiatePayment,
}: MapScreenProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarker = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const routeControl = useRef<any>(null);
  
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [activeLayer, setActiveLayer] = useState<keyof typeof tileLayers>('satellite');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [topView, setTopView] = useState<'hidden' | 'lotInfo' | 'reservation' | 'login' | 'paywall'>('hidden');

  const [instructions, setInstructions] = useState<any[]>([]);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [liveDistance, setLiveDistance] = useState(0);
  const instructionStartPoint = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current && typeof L !== 'undefined') {
      const map = L.map(mapRef.current, {
        center: [-20.087, 30.831],
        zoom: 15,
        zoomControl: true,
      });
      mapInstance.current = map;
      markersLayer.current = L.layerGroup().addTo(map);
      
      const initialLayer = L.tileLayer(tileLayers.satellite.url, {
        attribution: tileLayers.satellite.attribution,
        maxZoom: 19
      }).addTo(map);
      tileLayerRef.current = initialLayer;
    }
  }, []);

  // Handle auto-selecting a lot from another screen
  useEffect(() => {
    if (selectedLotId && mapInstance.current && parkingLots.length > 0) {
        const lotToSelect = parkingLots.find(p => p.id === selectedLotId);
        if (lotToSelect) {
            const { latitude, longitude } = lotToSelect.location;
            mapInstance.current.flyTo([latitude, longitude], 17, { duration: 1.2 });
            setSelectedLot(lotToSelect);
            setTopView('lotInfo');
        }
        onClearSelectedLot(); // Clear after use
    }
  }, [selectedLotId, parkingLots, onClearSelectedLot]);
  
  // Handle Layer Changes
  useEffect(() => {
    if (mapInstance.current && tileLayerRef.current) {
        mapInstance.current.removeLayer(tileLayerRef.current);
    }
    if (mapInstance.current) {
        const newLayer = L.tileLayer(tileLayers[activeLayer].url, {
            attribution: tileLayers[activeLayer].attribution,
            maxZoom: 19
        }).addTo(mapInstance.current);
        tileLayerRef.current = newLayer;
    }
  }, [activeLayer]);

  // Update user location marker
  useEffect(() => {
    if (mapInstance.current && userLocation) {
      const { latitude, longitude } = userLocation.coords;
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        return;
      }
      const userLatLng = L.latLng(latitude, longitude);
      if (!userMarker.current) {
        userMarker.current = L.marker(userLatLng, {
          icon: L.divIcon({
            html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(mapInstance.current);
      } else {
        userMarker.current.setLatLng(userLatLng);
      }
    }
  }, [userLocation]);
  
  // Handle route creation
  useEffect(() => {
    if (mapInstance.current && activeRoute && L.Routing) {
        if (routeControl.current) {
            mapInstance.current.removeControl(routeControl.current);
        }
        
        // When a new route begins, set the starting point for distance calculation.
        instructionStartPoint.current = L.latLng(activeRoute.origin.lat, activeRoute.origin.lng);

        const plan = new L.Routing.Plan([
            L.latLng(activeRoute.origin.lat, activeRoute.origin.lng),
            L.latLng(activeRoute.destination.lat, activeRoute.destination.lng)
        ], { createMarker: () => null });

        routeControl.current = L.Routing.control({
            plan,
            routeWhileDragging: false,
            show: false,
            lineOptions: { styles: [{ color: '#6366f1', opacity: 0.8, weight: 6 }] }
        }).addTo(mapInstance.current);

        routeControl.current.on('routesfound', (e: any) => {
            const routes = e.routes;
            if (routes.length > 0) {
                setInstructions(routes[0].instructions);
                setCurrentInstructionIndex(0);
            }
        });

        setTopView('hidden');
        setSelectedLot(null);

    } else if (!activeRoute && routeControl.current) {
        mapInstance.current.removeControl(routeControl.current);
        routeControl.current = null;
        setInstructions([]);
    }
  }, [activeRoute]);

  // Update the start point for the current instruction step when the index changes.
  useEffect(() => {
      if (currentInstructionIndex > 0 && instructions.length > currentInstructionIndex) {
          const prevInstruction = instructions[currentInstructionIndex - 1];
          if (prevInstruction && prevInstruction.latLng) {
              instructionStartPoint.current = L.latLng(prevInstruction.latLng.lat, prevInstruction.latLng.lng);
          }
      }
  }, [currentInstructionIndex, instructions]);


  // Handle live navigation progress
  useEffect(() => {
      if (!userLocation || instructions.length === 0 || currentInstructionIndex >= instructions.length) {
          return;
      }

      const currentInstruction = instructions[currentInstructionIndex];
      if (!currentInstruction || !currentInstruction.latLng || !instructionStartPoint.current) {
        return;
      }
      
      const userLatLng = L.latLng(userLocation.coords.latitude, userLocation.coords.longitude);
      
      // More accurate distance: Calculate remaining distance based on progress in the current step.
      const totalStepDistance = currentInstruction.distance;
      const distanceTraveledOnStep = userLatLng.distanceTo(instructionStartPoint.current);
      const remainingDistance = Math.max(0, totalStepDistance - distanceTraveledOnStep);
      setLiveDistance(remainingDistance);

      // Advance to next instruction when user is close to the maneuver point.
      const nextManeuverPoint = L.latLng(currentInstruction.latLng.lat, currentInstruction.latLng.lng);
      const distanceToNextManeuver = userLatLng.distanceTo(nextManeuverPoint);

      if (distanceToNextManeuver < 20) {
          if (currentInstructionIndex < instructions.length - 1) {
              setCurrentInstructionIndex(prev => prev + 1);
          } else {
              setTimeout(() => {
                alert("You have arrived at your destination!");
                onClearActiveRoute();
              }, 1000);
          }
      }
  }, [userLocation, instructions, currentInstructionIndex, onClearActiveRoute]);


  // Handle marker display logic
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();
    
    if (activeRoute) return;

    if (selectedLot && topView !== 'hidden') {
      const center = { lat: selectedLot.location.latitude, lng: selectedLot.location.longitude };
      const visibleSlots = selectedLot.slots.filter(s => s.coords);
      const spiderfyPositions = calculateSpiderfyPositions(center, visibleSlots.length, 0.0003);
      const bounds = L.latLngBounds();

      visibleSlots.forEach((slot, index) => {
        if (!slot.coords || typeof slot.coords.lat !== 'number' || typeof slot.coords.lng !== 'number') return;
        const actualPos = L.latLng(slot.coords.lat, slot.coords.lng);
        
        const spiderData = spiderfyPositions[index];
        if (!spiderData || typeof spiderData.lat !== 'number' || typeof spiderData.lng !== 'number') return;
        const spiderPos = L.latLng(spiderData.lat, spiderData.lng);

        bounds.extend(spiderPos);

        L.polyline([actualPos, spiderPos], { color: 'rgba(107, 114, 128, 0.5)', dashArray: '5, 5' }).addTo(markersLayer.current);
        L.circleMarker(actualPos, { radius: 3, color: slot.isOccupied ? '#ef4444' : '#22c55e', fillOpacity: 1, weight: 1 }).addTo(markersLayer.current);
        
        const icon = L.divIcon({
            html: `<div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg ${slot.isOccupied ? 'bg-red-500' : 'bg-green-500'}">${slot.id.toUpperCase()}</div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });
        L.marker(spiderPos, { icon }).addTo(markersLayer.current);
      });

      if (bounds.isValid()) {
        mapInstance.current.flyToBounds(bounds, { duration: 1.2, paddingTopLeft: [20, 20], paddingBottomRight: [20, 150] });
      }
    } else {
      parkingLots.forEach(lot => {
        if (!lot.location || typeof lot.location.latitude !== 'number' || typeof lot.location.longitude !== 'number') return;
        const lotLatLng = L.latLng(lot.location.latitude, lot.location.longitude);
        const availableSlots = lot.slots.filter(s => !s.isOccupied).length;
        const lotIcon = L.divIcon({
            html: `<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-white ${availableSlots > 0 ? 'bg-cyan-500' : 'bg-red-500'}">${availableSlots}</div>`,
            className: '', iconSize: [40, 40], iconAnchor: [20, 20]
        });
        const marker = L.marker(lotLatLng, { icon: lotIcon }).addTo(markersLayer.current);
        marker.on('click', () => {
          setSelectedLot(lot);
          setTopView('lotInfo');
        });
      });
    }
  }, [selectedLot, parkingLots, topView, activeRoute]);

  const handleBackToLots = () => {
    setSelectedLot(null);
    setTopView('hidden');
    if (mapInstance.current) {
      const targetLat = userLocation?.coords?.latitude;
      const targetLng = userLocation?.coords?.longitude;
      const center = (typeof targetLat === 'number' && typeof targetLng === 'number') ? [targetLat, targetLng] : [-20.087, 30.831];
      mapInstance.current.flyTo(center, 15, { duration: 1 });
    }
  };
  
  const handleOpenReservationModal = () => {
    if (!selectedLot) return;
    if (unpaidBill) {
        setTopView('paywall');
        return;
    }
    if (isLoggedIn) {
      if (!user?.carPlate) {
        alert("Please add your car number plate before making a reservation.");
        onOpenUserDetailsModal();
        return;
      }
      setTopView('reservation');
    } else {
      setTopView('login');
    }
  };

  const handleRecenter = () => {
    if (mapInstance.current && userLocation) {
      const { latitude, longitude } = userLocation.coords;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        mapInstance.current.flyTo([latitude, longitude], 16, {duration: 1});
      }
    }
  };

  const handleLayerSelect = (layer: keyof typeof tileLayers) => {
    setActiveLayer(layer);
    setIsLayerMenuOpen(false);
  }

  const renderTopView = () => {
    switch (topView) {
      case 'lotInfo':
        if (!selectedLot) return null;
        const isFavorite = user?.favoriteParkingLots?.includes(selectedLot.id) || false;
        return (
          <div className="group relative rounded-xl bg-white dark:bg-slate-950 p-3 shadow-lg dark:shadow-2xl transition-all duration-300 animate-fade-in-fast">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-20 dark:group-hover:opacity-30"></div>
            <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
            <div className="relative flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex-grow pr-2">
                  <h2 className="font-bold">{selectedLot.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{selectedLot.address}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLoggedIn && (
                  <button onClick={() => onToggleFavorite(selectedLot!.id)} className="p-2 text-yellow-400 text-2xl" title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                    {isFavorite ? <StarFilledIcon /> : <StarIcon />}
                  </button>
                )}
                <button onClick={handleBackToLots} className="text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-200/50 dark:bg-slate-800/50 hover:bg-gray-300 dark:hover:bg-slate-700 px-3 py-1 rounded-md text-sm transition-colors">Back</button>
              </div>
            </div>
          </div>
        );
      
      case 'reservation':
        if (!selectedLot || !user) return null;
        return (
          <ReservationModal
            onClose={() => setTopView('lotInfo')}
            lot={selectedLot}
            user={user}
            onInitiatePayment={onInitiatePayment}
          />
        );
      
      case 'login':
        return (
            <LoginModal 
                onClose={() => setTopView('lotInfo')}
                onSuccess={() => {
                    onLoginSuccess();
                    setTopView('reservation');
                }}
            />
        );
      
      case 'paywall':
        return (
            <div className="group relative rounded-xl bg-white dark:bg-slate-950 p-4 shadow-lg dark:shadow-2xl transition-all duration-300 animate-fade-in-fast text-center">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 via-pink-500 to-yellow-500 opacity-10 dark:opacity-20 blur-sm"></div>
                <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
                <div className="relative">
                    <h2 className="font-bold text-lg text-red-500 dark:text-red-400">Payment Due</h2>
                    <p className="text-gray-600 dark:text-slate-300 my-2">You have an outstanding bill of <span className="font-bold">${unpaidBill?.amount.toFixed(2)}</span>. Please pay it before making a new reservation.</p>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setTopView('lotInfo')} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                        <button onClick={onOpenPayBillModal} className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105">Pay Bill Now</button>
                    </div>
                </div>
            </div>
        );

      default:
        return null;
    }
  };
  
  const currentInstructionData = instructions.length > 0 && currentInstructionIndex < instructions.length 
    ? instructions[currentInstructionIndex] 
    : null;

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="absolute inset-0 bottom-28 bg-gray-200" />
       
       {activeRoute && (
          <NavigationInstructions 
            instruction={currentInstructionData}
            liveDistance={liveDistance}
            onClose={onClearActiveRoute}
          />
       )}

       {!activeRoute && (
          <div className="absolute top-20 left-4 right-4 z-[401]">
              {renderTopView()}
          </div>
       )}

      {!activeRoute && (
        <>
            <div className="absolute top-20 right-4 z-[401]">
                <div className="relative">
                <MapButton onClick={() => setIsLayerMenuOpen(prev => !prev)} title="Map Layers">
                    <LayersIcon />
                </MapButton>
                {isLayerMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-36 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md rounded-lg shadow-lg animate-fade-in-fast border border-gray-200 dark:border-slate-700">
                    <button onClick={() => handleLayerSelect('default')} className={`w-full text-left p-3 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 ${activeLayer === 'default' ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-800 dark:text-white'}`}>Default</button>
                    <button onClick={() => handleLayerSelect('satellite')} className={`w-full text-left p-3 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 ${activeLayer === 'satellite' ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-800 dark:text-white'}`}>Satellite</button>
                    <button onClick={() => handleLayerSelect('terrain')} className={`w-full text-left p-3 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 ${activeLayer === 'terrain' ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-800 dark:text-white'}`}>Terrain</button>
                    </div>
                )}
                </div>
            </div>

            <div className="absolute bottom-28 right-4 z-[401] flex flex-col gap-4">
                <MapButton onClick={handleRecenter} title="Recenter">
                    <LocationIcon />
                </MapButton>
            </div>
            {topView === 'lotInfo' && (
                <div className="absolute top-36 left-1/2 -translate-x-1/2 z-[401]">
                    <button onClick={handleOpenReservationModal} title="Reserve a Spot" className="bg-gradient-to-r from-indigo-500 to-purple-500 w-48 h-12 rounded-lg flex items-center justify-center text-white shadow-lg animate-pulse transition-transform hover:scale-110">
                        <CarIcon />
                        <span className="ml-2">Reserve Parking</span>
                    </button>
                </div>
            )}
        </>
       )}
    </div>
  );
};

export default MapScreen;
