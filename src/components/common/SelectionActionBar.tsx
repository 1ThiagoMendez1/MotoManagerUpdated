'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions?: React.ReactNode;
  titleSingular?: string;
  titlePlural?: string;
}

export function SelectionActionBar({
  selectedCount,
  onClearSelection,
  actions,
  titleSingular = 'seleccionado',
  titlePlural = 'seleccionados',
}: SelectionActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.15 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 border border-primary/30 shadow-2xl backdrop-blur-xl text-foreground text-sm"
      >
        <div className="flex items-center gap-2 font-medium">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            <Check className="w-3 h-3" />
          </span>
          <span>
            <strong className="text-primary">{selectedCount}</strong>{' '}
            {selectedCount === 1 ? titleSingular : titlePlural}
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancelar
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
