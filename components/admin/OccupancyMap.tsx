import React, { useEffect, useRef } from 'react';
import type { ParkingLot } from '../../types';

declare const L: any;

interface OccupancyMapProps {
  parkingLots: ParkingLot[];
  onLotClick: (lot: ParkingLot) => void;
}

const OccupancyMap = ({ parkingLots, onLotClick }: OccupancyMapProps) => {
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
      // Clear existing markers
      mapInstance.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          mapInstance.current.removeLayer(layer);
        }
      });

      parkingLots.forEach(lot => {
        const occupiedCount = lot.slots.filter(s => s.isOccupied).length;
        const totalCount = lot.slots.length;
        const percentage = totalCount > 0 ? (occupiedCount / totalCount) * 100 : 0;
        const color = percentage > 80 ? '#ef4444' : percentage > 50 ? '#f97316' : '#22c55e';

        const lotMarker = L.circleMarker([lot.location.latitude, lot.location.longitude], {
          radius: 10,
          color: color,
          fillOpacity: 0.8,
        }).addTo(mapInstance.current);

        lotMarker.on('click', () => onLotClick(lot));

        lotMarker.bindTooltip(`${lot.name}<br>${occupiedCount}/${totalCount} occupied`);
      });
    }
  }, [parkingLots, onLotClick]);

  return (
    <div className="bg-gray-200 dark:bg-slate-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Live Occupancy Map</h2>
      <div ref={mapRef} className="w-full h-96 rounded-lg" />
    </div>
  );
};

export default OccupancyMap;
