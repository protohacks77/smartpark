import React, { useState, useEffect, useMemo } from 'react';
import type { Reservation, User } from '../../types';
import { PersonIcon, CarIcon, ClockIcon, LayersIcon } from '../Icons';

// FIX: Define a props interface for OccupancyRow and type it as a React.FC.
// This correctly types the component to accept React's special `key` prop
// when used in a list, resolving the TypeScript error.
interface OccupancyRowProps {
    reservation: Reservation;
    user: User | undefined;
}

// A single row in the table with its own countdown logic
const OccupancyRow: React.FC<OccupancyRowProps> = ({ reservation, user }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const endTime = reservation.endTime.toDate();
            const now = new Date();
            const difference = endTime.getTime() - now.getTime();

            if (difference <= 0) {
                setTimeLeft('Expired');
                return;
            }

            const hours = Math.floor((difference / (1000 * 60 * 60)));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            // Pad with leading zeros
            const formattedHours = String(hours).padStart(2, '0');
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');

            setTimeLeft(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
        };

        calculateTimeLeft(); // Initial calculation
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [reservation.endTime]);

    return (
        <tr className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
            <td className="p-3">
                <div className="flex items-center gap-2">
                    <PersonIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    <span>{user?.username || 'Unknown User'}</span>
                </div>
            </td>
            <td className="p-3">
                 <div className="flex items-center gap-2">
                    <LayersIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                    <span>{reservation.parkingLotName} - <span className="font-mono font-bold">{reservation.slotId.toUpperCase()}</span></span>
                </div>
            </td>
            <td className="p-3">
                 <div className="flex items-center gap-2">
                    <CarIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <span className="font-mono">{user?.carPlate || 'N/A'}</span>
                </div>
            </td>
            <td className="p-3 font-mono text-right">
                <div className={`flex items-center justify-end gap-2 ${timeLeft === 'Expired' ? 'text-pink-500' : ''}`}>
                    <ClockIcon className="w-5 h-5" />
                    <span>{timeLeft}</span>
                </div>
            </td>
        </tr>
    );
};

// The main table component
const LiveOccupancyTable = ({ reservations, users }: { reservations: Reservation[], users: User[] }) => {
    const activeReservations = useMemo(() => {
        return reservations
            .filter(res => res.status === 'active')
            .sort((a, b) => a.endTime.toMillis() - b.endTime.toMillis()); // Sort by soonest to expire
    }, [reservations]);
    
    const userMap = useMemo(() => {
        return new Map(users.map(u => [u.uid, u]));
    }, [users]);

    return (
        <div className="group relative flex flex-col rounded-xl bg-white dark:bg-slate-950 p-4 shadow-lg dark:shadow-2xl">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
            <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
            <div className="relative">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Live Parking Occupancy ({activeReservations.length})</h3>
                <div className="overflow-x-auto max-h-96">
                    {activeReservations.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10">
                                <tr className="border-b border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-slate-400">
                                    <th className="p-3 font-semibold">User</th>
                                    <th className="p-3 font-semibold">Location</th>
                                    <th className="p-3 font-semibold">Car Plate</th>
                                    <th className="p-3 font-semibold text-right">Time Remaining</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {activeReservations.map(res => (
                                    <OccupancyRow 
                                        key={res.id} 
                                        reservation={res}
                                        user={userMap.get(res.userId)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-gray-400 dark:text-slate-500">No active parking sessions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveOccupancyTable;