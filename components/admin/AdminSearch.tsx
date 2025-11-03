import React, { useState, useMemo } from 'react';
import type { User, ParkingLot } from '../../types';
import { PersonIcon, LayersIcon, CarIcon } from '../Icons';

interface AdminSearchProps {
  users: User[];
  parkingLots: ParkingLot[];
  onResultSelect: (result: any) => void;
}

const AdminSearch = ({ users, parkingLots, onResultSelect }: AdminSearchProps) => {
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query) return [];

    const lowerCaseQuery = query.toLowerCase();
    const userResults = users
      .filter(user => user.username.toLowerCase().includes(lowerCaseQuery) || user.email.toLowerCase().includes(lowerCaseQuery) || user.carPlates?.some(plate => plate.toLowerCase().includes(lowerCaseQuery)))
      .map(user => ({ type: 'user', data: user }));

    const lotResults = parkingLots
      .filter(lot => lot.name.toLowerCase().includes(lowerCaseQuery) || lot.address.toLowerCase().includes(lowerCaseQuery))
      .map(lot => ({ type: 'lot', data: lot }));

    const slotResults = parkingLots
      .flatMap(lot => lot.slots.map(slot => ({ ...slot, lotName: lot.name })))
      .filter(slot => slot.id.toLowerCase().includes(lowerCaseQuery))
      .map(slot => ({ type: 'slot', data: slot }));

    return [...userResults, ...lotResults, ...slotResults];
  }, [query, users, parkingLots]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for users, car plates, or slots..."
        className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-2 z-10 text-white">
          {searchResults.slice(0, 5).map((result, index) => (
            <div
              key={index}
              onClick={() => onResultSelect(result)}
              className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-4"
            >
              {result.type === 'user' && <PersonIcon />}
              {result.type === 'lot' && <LayersIcon />}
              {result.type === 'slot' && <CarIcon />}
              <div>
                <p className="font-bold">{result.data.name || result.data.username || result.data.id}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {result.type === 'user' && result.data.email}
                  {result.type === 'lot' && result.data.address}
                  {result.type === 'slot' && result.data.lotName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSearch;
