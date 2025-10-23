import React, { useState } from 'react';
import type { Reservation, User, ParkingLot } from '../../types';
import { generateReport } from '../../services/reportGenerator';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allReservations: Reservation[];
  allUsers: User[];
  allParkingLots: ParkingLot[];
}

type FilterType = 'week' | 'month' | 'year' | 'custom' | null;

const ReportGenerationModal = ({ isOpen, onClose, allReservations, allUsers, allParkingLots }: ReportGenerationModalProps) => {
  const [filter, setFilter] = useState<FilterType>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  if (!isOpen) return null;
  
  const handleGenerate = () => {
    if (!filter) {
        alert("Please select a date range.");
        return;
    }

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (filter) {
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            endDate = new Date();
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date();
            break;
        case 'custom':
            if (!customStart || !customEnd) {
                alert("Please select a start and end date for the custom range.");
                return;
            }
            startDate = new Date(customStart);
            // Set end date to the end of the selected day
            endDate = new Date(customEnd);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            return;
    }
    
    // Ensure start date is at the beginning of the day
    startDate.setHours(0, 0, 0, 0);

    const filteredReservations = allReservations.filter(res => {
        const resDate = res.startTime.toDate();
        return resDate >= startDate && resDate <= endDate;
    });
    
    try {
        generateReport(filteredReservations, allUsers, allParkingLots, { startDate, endDate });
        onClose();
    } catch(e) {
        alert("Failed to generate report.");
        console.error(e);
    }
  };

  const FilterButton = ({ value, label }: { value: FilterType, label: string }) => (
    <button
        onClick={() => setFilter(value)}
        className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filter === value ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}
    >
        {label}
    </button>
  );
  
  const inputStyle = "w-full bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-white p-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500";


  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="group relative flex w-full max-w-md flex-col rounded-xl bg-white dark:bg-slate-950 shadow-lg dark:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
        <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
        <div className="relative p-6 text-gray-900 dark:text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
            <ion-icon name="close-circle" class="w-8 h-8"></ion-icon>
          </button>

          <h2 className="text-2xl font-bold text-center mb-6 text-indigo-500 dark:text-indigo-400">Generate Report</h2>
          
          <div className="space-y-4">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Select Date Range:</p>
              <div className="flex gap-2">
                  <FilterButton value="week" label="This Week" />
                  <FilterButton value="month" label="This Month" />
                  <FilterButton value="year" label="This Year" />
              </div>
              
              <div className="pt-2">
                  <FilterButton value="custom" label="Custom Range" />
                  {filter === 'custom' && (
                      <div className="grid grid-cols-2 gap-4 mt-3 animate-fade-in-fast">
                          <div>
                            <label className="block text-xs mb-1 text-gray-400 dark:text-slate-500">Start Date</label>
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={inputStyle} />
                          </div>
                           <div>
                            <label className="block text-xs mb-1 text-gray-400 dark:text-slate-500">End Date</label>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className={inputStyle} />
                          </div>
                      </div>
                  )}
              </div>
          </div>
          
          <div className="flex gap-4 pt-8">
            <button onClick={onClose} className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                Cancel
            </button>
            <button onClick={handleGenerate} disabled={!filter} className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationModal;
