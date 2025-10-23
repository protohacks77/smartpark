
import React, { useState, useEffect, useRef } from 'react';
import type { User, ParkingLot } from '../../types';
import { PersonIcon, LayersIcon, CarIcon } from '../Icons';

interface AdminSearchProps {
  users: User[];
  parkingLots: ParkingLot[];
  onResultSelect: (result: any) => void;
}

const AdminSearch = ({ users, parkingLots, onResultSelect }: AdminSearchProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const lowerCaseQuery = query.toLowerCase().trim();
    
    // FIX: Add checks for undefined properties before calling .toLowerCase() to prevent runtime errors.
    // Also provide fallbacks for display values.
    const userResults = users
      .filter(u => 
        (u.carPlate || '').toLowerCase().includes(lowerCaseQuery) ||
        (u.username || '').toLowerCase().includes(lowerCaseQuery)
      )
      .map(u => ({ 
          type: 'user', 
          data: u, 
          display: u.username || 'Unnamed User', 
          subDisplay: u.carPlate || 'No Plate', 
          icon: <PersonIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" /> 
      }));

    const lotResults = parkingLots
      .filter(p => (p.name || '').toLowerCase().includes(lowerCaseQuery))
      .map(p => ({ 
          type: 'lot', 
          data: { lot: p }, 
          display: p.name || 'Unnamed Lot', 
          subDisplay: 'Parking Lot', 
          icon: <LayersIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400"/> 
      }));

    const slotResults: any[] = [];
    if(lowerCaseQuery.length > 0) {
        parkingLots.forEach(lot => {
            (lot.slots || []).forEach(slot => {
                if ((slot.id || '').toLowerCase().includes(lowerCaseQuery)) {
                slotResults.push({
                    type: 'slot',
                    data: { lot, slotId: slot.id },
                    display: `Slot ${(slot.id || '').toUpperCase()}`,
                    subDisplay: lot.name || 'Unnamed Lot',
                    icon: <CarIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                });
                }
            });
        });
    }

    const combined = [...userResults, ...lotResults, ...slotResults];
    setSuggestions(combined.slice(0, 7));
  }, [query, users, parkingLots]);
  
  const handleSelect = (result: any) => {
    setQuery('');
    setSuggestions([]);
    setIsFocused(false);
    onResultSelect(result);
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder="Search by car plate, user, lot name, or slot ID..."
        className="w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-4 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-lg"
      />
      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-20 animate-fade-in-fast">
          <ul>
            {suggestions.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => handleSelect(item)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors"
                >
                    <div className="flex-shrink-0">{item.icon}</div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.display}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{item.subDisplay}</p>
                    </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isFocused && query.length > 0 && suggestions.length === 0 && (
         <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-700 p-4 z-20">
            <p className="text-gray-500 dark:text-slate-400 text-center">No results found.</p>
         </div>
      )}
    </div>
  );
};

export default AdminSearch;