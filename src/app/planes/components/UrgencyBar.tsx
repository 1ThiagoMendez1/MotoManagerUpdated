'use client';

import { useEffect, useState } from 'react';
import { Timer, ArrowRight } from 'lucide-react';

export function UrgencyBar({ onScrollToPlanes }: { onScrollToPlanes: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 35, seconds: 12 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fake countdown timer that resets when it hits 0
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else {
          if (minutes > 0) {
            minutes--;
            seconds = 59;
          } else {
            if (hours > 0) {
              hours--;
              minutes = 59;
              seconds = 59;
            } else {
              // Reset timer to create fake urgency again
              hours = 4;
              minutes = 45;
              seconds = 0;
            }
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative z-50 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm sm:text-base font-semibold">
        <div className="flex items-center gap-2 animate-pulse">
          <span className="text-xl">🔥</span>
          <span className="tracking-wide text-xs sm:text-sm md:text-base">OFERTA EXCLUSIVA: HASTA 50% DE DESCUENTO</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-md border border-white/20 backdrop-blur-sm">
          <Timer className="w-4 h-4" />
          <span className="font-mono font-bold tracking-widest">
            {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
        
        <button 
          onClick={onScrollToPlanes}
          className="group flex items-center gap-1.5 text-xs sm:text-sm bg-white text-red-600 px-4 py-1.5 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-sm"
        >
          VER PLANES
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
