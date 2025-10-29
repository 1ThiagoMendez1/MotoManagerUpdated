"use client";

import { useState } from 'react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditTechnician } from '@/components/forms/EditTechnician';
import { DeleteTechnician } from '@/components/forms/DeleteTechnician';
import type { Technician } from '@/lib/types';
import { format } from 'date-fns';

interface TechnicianRowProps {
  technician: Technician;
}

export function TechnicianRow({ technician }: TechnicianRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow className="border-white/20 hover:bg-white/10">
        <TableCell className="font-medium">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={technician.avatarUrl || undefined} alt={technician.name} data-ai-hint="man woman"/>
              <AvatarFallback>{technician.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              {technician.workOrders && technician.workOrders.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                >
                  {isExpanded ? '−' : '+'}
                </Button>
              )}
              {technician.name}
            </div>
          </div>
        </TableCell>
        <TableCell>{technician.specialty}</TableCell>
        <TableCell className="text-center">
          {technician.workOrders ? technician.workOrders.length : 0}
        </TableCell>
        <TableCell className='text-right'>
          <div className="flex gap-2 justify-end">
            {technician.workOrders && technician.workOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
              >
                Detalles
              </Button>
            )}
            <EditTechnician technician={technician} />
            <DeleteTechnician technician={technician} />
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && technician.workOrders && technician.workOrders.length > 0 && (
        <TableRow>
          <TableCell colSpan={4} className="p-0">
            <div className="px-4 py-2 bg-white/5 rounded-md mx-4 mb-2">
              <h4 className="text-sm font-medium text-white/90 mb-3">Órdenes de Trabajo Asignadas</h4>
              <div className="space-y-2">
                {technician.workOrders.map((workOrder) => (
                  <div key={workOrder.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={workOrder.status === 'Completado' ? 'secondary' : workOrder.status === 'En Reparación' ? 'default' : 'outline'}>
                          {workOrder.status}
                        </Badge>
                        <span className="text-sm text-white/70">
                          #{workOrder.id}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{workOrder.motorcycle.make} {workOrder.motorcycle.model}</span>
                        <span className="text-white/70 ml-2">({workOrder.motorcycle.plate})</span>
                      </div>
                      <div className="text-sm text-white/70">
                        Cliente: {workOrder.motorcycle.customer.name}
                      </div>
                      <div className="text-sm text-white/60 mt-1">
                        {workOrder.issueDescription.length > 60
                          ? `${workOrder.issueDescription.substring(0, 60)}...`
                          : workOrder.issueDescription}
                      </div>
                    </div>
                    <div className="text-right text-sm text-white/70">
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