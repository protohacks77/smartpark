import React, { useEffect, useRef } from 'react';
import type { ParkingLot } from '../../types';

declare const L: any;

interface OccupancyMapProps {
  parkingLots: ParkingLot[];
}

const OccupancyMap = ({ parkingLots }: OccupancyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current && typeof L !== 'undefined') {
      const map = L.map(mapRef.current, {
        center: [-20.087, 30.831],
        zoom: 15,
        zoomControl: true,
      });
      mapInstance.current = map;

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(map);
    }
  }, []);

  useEffect(() => {
    if (mapInstance.current) {
      parkingLots.forEach(lot => {
        lot.slots.forEach(slot => {
          if (slot.coords) {
            L.circleMarker([slot.coords.lat, slot.coords.lng], {
              radius: 5,
              color: slot.isOccupied ? '#ef4444' : '#22c55e',
              fillOpacity: 1,
            }).addTo(mapInstance.current);
          }
        });
      });
    }
  }, [parkingLots]);

  return (
    <div className="bg-gray-200 dark:bg-slate-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Live Occupancy Map</h2>
      <div ref={mapRef} className="w-full h-96 rounded-lg" />
    </div>
  );
};

export default OccupancyMap;
