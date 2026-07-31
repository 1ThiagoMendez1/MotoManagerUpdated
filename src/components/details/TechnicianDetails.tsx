"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Technician } from '@/lib/types';
import { Wrench, Star } from 'lucide-react';

type TechnicianDetailsProps = {
  technician: Technician;
};

export function TechnicianDetails({ technician }: TechnicianDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-transparent border-white/50 text-foreground hover:bg-card/50 hover:text-foreground">
          Ver Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
            <div className="flex flex-col items-center text-center">
                 <Avatar className="h-24 w-24 border-2 border-primary mb-4">
                    <AvatarImage src={technician.avatarUrl || undefined} alt={technician.name} data-ai-hint="man woman" />
                    <AvatarFallback className="text-4xl">{technician.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <DialogTitle className="text-2xl text-foreground">{technician.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-muted-foreground">
                    <Wrench className="h-4 w-4" /> {technician.specialty}
                </DialogDescription>
            </div>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-foreground">
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold mb-2 flex items-center"><Star className="mr-2 h-4 w-4" /> Estadísticas</h4>
                    <div className="text-sm text-muted-foreground pl-6 grid grid-cols-2 gap-2">
                        <p><strong>Trabajos este mes:</strong> 12</p>
                        <p><strong>Tasa de finalización:</strong> 95%</p>
                        <p><strong>Promedio de calificación:</strong> 4.8/5.0</p>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
