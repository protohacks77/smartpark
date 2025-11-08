import React from 'react';
import type { Reservation, User } from '../../types';

interface TransactionHistoryTableProps {
  reservations: Reservation[];
  users: User[];
}

const TransactionHistoryTable: React.FC<TransactionHistoryTableProps> = ({ reservations, users }) => {
  const getUser = (userId: string) => users.find(u => u.uid === userId);

  const completedReservations = reservations.filter(res => res.status === 'completed');

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-white border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-bold mb-4">Transaction History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">User</th>
              <th scope="col" className="px-6 py-3">Parking Bay</th>
              <th scope="col" className="px-6 py-3">Parking Slot</th>
              <th scope="col" className="px-6 py-3">Duration</th>
              <th scope="col" className="px-6 py-3">Amount</th>
              <th scope="col" className="px-6 py-3">Overtime</th>
              <th scope="col" className="px-6 py-3">Total</th>
              <th scope="col" className="px-6 py-3">Time to Pay</th>
            </tr>
          </thead>
          <tbody>
            {completedReservations.map(res => {
              const user = getUser(res.userId);
              return (
                <tr key={res.id} className="border-b bg-gray-800 border-gray-700 hover:bg-gray-600">
                  <td className="px-6 py-4">{res.startTime.toDate().toLocaleDateString()}</td>
                  <td className="px-6 py-4">{user?.username || 'Unknown'}</td>
                  <td className="px-6 py-4">{res.parkingLotName}</td>
                  <td className="px-6 py-4">{res.slotId}</td>
                  <td className="px-6 py-4">{res.durationHours} hours</td>
                  <td className="px-6 py-4">${res.amountPaid.toFixed(2)}</td>
                  <td className="px-6 py-4">${(res.overtime || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">${(res.total || res.amountPaid).toFixed(2)}</td>
                  <td className="px-6 py-4">{res.timeToPay || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionHistoryTable;
