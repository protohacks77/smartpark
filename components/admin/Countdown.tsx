import React, { useState, useEffect } from 'react';
import type { Timestamp } from '../../types';

interface CountdownProps {
  endTime: Timestamp;
}

const Countdown = ({ endTime }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOvertime, setIsOvertime] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const end = endTime.toDate().getTime();
      const diff = end - now;

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        setIsOvertime(false);
      } else {
        const overtimeDiff = now - end;
        const hours = Math.floor(overtimeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((overtimeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((overtimeDiff % (1000 * 60)) / 1000);
        setTimeLeft(`+${hours}h ${minutes}m ${seconds}s`);
        setIsOvertime(true);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [endTime]);

  return (
    <span className={isOvertime ? 'text-red-500' : 'text-green-500'}>
      {timeLeft}
    </span>
  );
};

export default Countdown;
