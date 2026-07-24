"use client";

import { useState } from 'react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Technician } from '@/lib/types';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TechnicianRowProps {
  technician: Technician;
}

export function TechnicianRow({ technician }: TechnicianRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasOrders = technician.workOrders && technician.workOrders.length > 0;

  return (
    <>
      <TableRow className="border-border/50 hover:bg-primary/5 transition-colors">
        <TableCell className="font-medium">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={technician.avatarUrl || undefined} alt={technician.name} data-ai-hint="man woman"/>
              <AvatarFallback>{technician.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{technician.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {technician.email && <span className="truncate">{technician.email}</span>}
            {technician.phone && <span>{technician.phone}</span>}
            {!technician.email && !technician.phone && <span>-</span>}
          </div>
        </TableCell>
        <TableCell>{technician.specialty}</TableCell>
        <TableCell className="text-center">
          {hasOrders ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-sm transition-colors cursor-pointer select-none"
            >
              {technician.workOrders!.length}
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </TableCell>
        {/* Empty actions column — buttons removed */}
        <TableCell />
      </TableRow>

      {isExpanded && hasOrders && (
        <TableRow>
          <TableCell colSpan={4} className="p-0">
            <div className="px-4 py-2 bg-primary/5 rounded-md mx-4 mb-2">
              <h4 className="text-sm font-medium text-foreground/90 mb-3">Órdenes de Trabajo Asignadas</h4>
              <div className="space-y-2">
                {technician.workOrders!.map((workOrder) => (
                  <div key={workOrder.id} className="flex items-center justify-between p-3 bg-card/50 rounded border border-border/30 hover:bg-primary/5 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={workOrder.status === 'Completado' ? 'secondary' : workOrder.status === 'En Reparación' ? 'default' : 'outline'}>
                          {workOrder.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          #{workOrder.id}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{workOrder.motorcycle.make} {workOrder.motorcycle.model}</span>
                        <span className="text-muted-foreground ml-2">({workOrder.motorcycle.plate})</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Cliente: {workOrder.motorcycle.customer.name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {workOrder.issueDescription.length > 60
                          ? `${workOrder.issueDescription.substring(0, 60)}...`
                          : workOrder.issueDescription}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Creada: {format(new Date(workOrder.createdDate), 'dd/MM/yyyy')}</div>
                      {workOrder.completedDate && (
                        <div>Completada: {format(new Date(workOrder.completedDate), 'dd/MM/yyyy')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}