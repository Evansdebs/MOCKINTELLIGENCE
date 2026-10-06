import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

interface BECECountdownProps {
  settings?: any;
}

export const BECECountdown: React.FC<BECECountdownProps> = ({ settings }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    if (!settings?.beceStartDate) return;

    const calculateTimeLeft = () => {
      const target = new Date(settings.beceStartDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        });
      } else {
        setTimeLeft(null); // Passed or happening now
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // update every minute

    return () => clearInterval(timer);
  }, [settings?.beceStartDate]);

  if (!settings?.beceStartDate) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/30 flex flex-col justify-center relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <h3 className="text-indigo-100 font-medium text-sm flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4" /> BECE Countdown
            </h3>
            <p className="text-2xl font-bold">Not Scheduled</p>
          </div>
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl">
            <Clock className="w-6 h-6 text-indigo-100" />
          </div>
        </div>
        <p className="text-indigo-200 text-xs mt-4">Configure the BECE start date in settings.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-center relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
      <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <h3 className="text-indigo-200 font-semibold text-sm flex items-center gap-2 mb-1 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-indigo-300" /> Upcoming BECE
          </h3>
          <p className="text-[11px] text-indigo-300 font-medium mb-3">
            {new Date(settings.beceStartDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
          <Clock className="w-5 h-5 text-indigo-100" />
        </div>
      </div>

      {timeLeft ? (
        <div className="flex gap-3 mt-2 relative z-10">
          <div className="flex-1 bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-center">
            <div className="text-2xl font-bold text-white mb-0.5 leading-none">{timeLeft.days}</div>
            <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Days</div>
          </div>
          <div className="flex-1 bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-center">
            <div className="text-2xl font-bold text-white mb-0.5 leading-none">{timeLeft.hours}</div>
            <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Hours</div>
          </div>
        </div>
      ) : (
        <div className="mt-2 bg-rose-500/20 border border-rose-500/40 rounded-xl p-4 flex items-center gap-3 backdrop-blur-sm relative z-10">
          <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          <p className="text-sm font-semibold text-rose-100">BECE is currently happening or has already passed!</p>
        </div>
      )}
    </div>
  );
};
