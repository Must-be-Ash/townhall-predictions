"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  closeTime: Date;
}

export function CountdownTimer({ closeTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    function calculateTimeLeft() {
      const now = new Date().getTime();
      const targetTime = closeTime.getTime();
      const difference = targetTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      }
    }

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [closeTime]);

  if (timeLeft.isExpired) {
    return (
      <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-xl px-6 py-4">
        <div className="text-center">
          <div className="text-red-400 text-sm font-medium mb-1">BETTING CLOSED</div>
          <div className="text-2xl font-bold text-red-300">Market Expired</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-900 bg-opacity-50 border border-blue-500 rounded-xl px-6 py-4">
      <div className="text-center">
        <div className="text-blue-400 text-sm font-medium mb-2">BETTING CLOSES IN</div>
        <div className="flex items-center justify-center space-x-1 md:space-x-2">
          {timeLeft.days > 0 && (
            <>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-300 tabular-nums">
                  {timeLeft.days.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-blue-400">DAYS</div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-blue-400">:</div>
            </>
          )}
          
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-300 tabular-nums">
              {timeLeft.hours.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-blue-400">HRS</div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-blue-400">:</div>
          
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-300 tabular-nums">
              {timeLeft.minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-blue-400">MIN</div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-blue-400">:</div>
          
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-300 tabular-nums">
              {timeLeft.seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-blue-400">SEC</div>
          </div>
        </div>
      </div>
    </div>
  );
}