'use client';
import { useEffect, useState } from 'react';

export function ColombiaClock() {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      const timeFormatter = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      const dateFormatter = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      setTimeStr(timeFormatter.format(now));
      setDateStr(dateFormatter.format(now));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) return null;

  return (
    <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 via-background to-primary/5 border border-primary/20 shadow-md backdrop-blur-sm mr-2 whitespace-nowrap transition-all hover:border-primary/40 hover:shadow-lg group">
      <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(var(--primary),0.3)]">
        <svg 
          className="w-6 h-6 drop-shadow-md" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer ring */}
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="opacity-80"/>
          {/* Inner ring */}
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" className="opacity-50"/>
          
          {/* Normal Ticks */}
          <path d="M6 18 L7.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 12 L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 6 L7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 4 L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Redline Ticks */}
          <path d="M18 6 L16.5 7.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 12 L18 12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 18 L16.5 16.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />

          {/* Needle Pivot */}
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          
          {/* Needle with pulse animation */}
          <path d="M12 12 L16.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80 leading-none mb-1">{dateStr}</span>
        <span className="text-sm font-black text-foreground leading-none tracking-tight">{timeStr} <span className="text-[10px] text-muted-foreground ml-0.5 font-semibold">COL</span></span>
      </div>
    </div>
  );
}
