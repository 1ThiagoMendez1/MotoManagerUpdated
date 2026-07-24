'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const MOCK_SALES = [
  { name: 'Taller El Pistón', city: 'Bogotá', time: 'Hace 5 min' },
  { name: 'Motos y Rodamientos', city: 'Medellín', time: 'Hace 12 min' },
  { name: 'Serviteca Biker', city: 'Cali', time: 'Hace 23 min' },
  { name: 'Full Gas Motors', city: 'Barranquilla', time: 'Hace 45 min' },
  { name: 'Taller La 50', city: 'Bucaramanga', time: 'Hace 1 hora' },
];

export function SalesNotification() {
  const [currentSale, setCurrentSale] = useState<typeof MOCK_SALES[0] | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Initial delay before showing the first notification
    const initialDelay = setTimeout(() => {
      showNextNotification();
    }, 5000);

    return () => clearTimeout(initialDelay);
  }, []);

  const showNextNotification = () => {
    // Pick a random sale
    const randomSale = MOCK_SALES[Math.floor(Math.random() * MOCK_SALES.length)];
    setCurrentSale(randomSale);
    setIsVisible(true);

    // Hide after 6 seconds
    setTimeout(() => {
      setIsVisible(false);
      // Schedule the next one between 15 and 45 seconds later
      const nextDelay = Math.floor(Math.random() * (45000 - 15000 + 1)) + 15000;
      setTimeout(() => {
        showNextNotification();
      }, nextDelay);
    }, 6000);
  };

  return (
    <AnimatePresence>
      {isVisible && currentSale && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 left-6 z-50 flex items-start gap-3 bg-card border border-border/50 shadow-2xl rounded-lg p-4 max-w-sm"
        >
          <div className="bg-green-500/10 p-2 rounded-full mt-0.5 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              <span className="font-bold">{currentSale.name}</span> de {currentSale.city}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acaba de adquirir el Plan Anual
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
              {currentSale.time}
            </p>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
