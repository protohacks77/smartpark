import React from 'react';
import type { ParkingLot } from '../../types';

interface OccupancyMapProps {
  parkingLots: ParkingLot[];
}

const OccupancyMap = ({ parkingLots }: OccupancyMapProps) => {
  const totalSlots = parkingLots.reduce((acc, lot) => acc + lot.slots.length, 0);
  const occupiedSlots = parkingLots.reduce((acc, lot) => acc + lot.slots.filter(s => s.isOccupied).length, 0);
  const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  return (
    <div className="bg-gray-200 dark:bg-slate-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Live Occupancy Map</h2>
      <div className="relative w-full h-64 bg-gray-300 dark:bg-slate-700 rounded-lg">
        {parkingLots.map(lot => (
          lot.slots.map(slot => (
            <div
              key={`${lot.id}-${slot.id}`}
              className={`absolute w-4 h-4 rounded-full ${slot.isOccupied ? 'bg-red-500' : 'bg-green-500'}`}
              style={{
                left: `${Math.random() * 90 + 5}%`,
                top: `${Math.random() * 90 + 5}%`,
              }}
            />
          ))
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <div>
          <p className="text-gray-500 dark:text-slate-400">Occupancy Rate</p>
          <p className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">Occupied Slots</p>
          <p className="text-2xl font-bold">{occupiedSlots}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">Total Slots</p>
          <p className="text-2xl font-bold">{totalSlots}</p>
        </div>
      </div>
    </div>
  );
};

export default OccupancyMap;
