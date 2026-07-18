import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type StepperProps = {
  currentStatus: string;
};

const STEPS = [
  { id: 'Recibida', label: 'Recibida' },
  { id: 'Diagnosticando', label: 'En Diagnóstico' },
  { id: 'Reparado', label: 'Reparado' },
  { id: 'Entregado', label: 'Entregado / Lista' },
];

export function WorkOrderStepper({ currentStatus }: StepperProps) {
  // Map possible status variants to our steps
  const normalizedStatus = currentStatus === 'Entregado' ? 'Entregado' 
    : currentStatus === 'Reparado' ? 'Reparado'
    : currentStatus === 'Diagnosticando' ? 'Diagnosticando'
    : 'Recibida';

  const currentIndex = STEPS.findIndex(s => s.id === normalizedStatus);

  return (
    <div className="w-full py-6 mb-4">
      <div className="relative flex items-center justify-between w-full px-2">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-700 ease-in-out" 
            style={{ width: `${(Math.max(currentIndex, 0) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-background",
                  isCompleted ? "border-primary text-primary glow-primary" : 
                  isCurrent ? "border-primary text-primary glow-primary scale-110 shadow-[0_0_15px_rgba(47,128,237,0.5)]" : 
                  "border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5 text-primary" /> : <span className="text-sm font-bold">{index + 1}</span>}
              </div>
              <span 
                className={cn(
                  "absolute -bottom-8 text-xs font-semibold whitespace-nowrap transition-colors duration-300",
                  (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
