'use client'
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ticket, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type TicketStatus = "Pendiente" | "En Revisión" | "Finalizado";

const initialTickets = [
    { id: 'TKT-001', workshopName: 'Taller Motos Veloz', description: 'No puedo exportar el inventario a Excel. El botón no hace nada.', reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), status: "Pendiente" as TicketStatus },
    { id: 'TKT-002', workshopName: 'Motos El Rayo', description: 'Al agregar una nueva venta, el total no se calcula correctamente.', reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), status: "En Revisión" as TicketStatus },
    { id: 'TKT-003', workshopName: 'Servicio 2 Ruedas', description: 'La lista de técnicos no se actualiza cuando agrego uno nuevo.', reportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: "Finalizado" as TicketStatus },
];

export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState(initialTickets);
    const { toast } = useToast();

    const getStatusVariant = (status: TicketStatus) => {
        switch (status) {
          case 'Pendiente': return 'destructive';
          case 'En Revisión': return 'secondary';
          case 'Finalizado': return 'default';
          default: return 'outline';
        }
    };
    
    const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
        setTickets(currentTickets =>
          currentTickets.map(ticket =>
            ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
          )
        );
        toast({
            title: "Estado Actualizado",
            description: `El ticket ${ticketId} ahora está "${newStatus}".`,
        });
    };

    return (
        <div className="w-full max-w-7xl p-4 md:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Ticket className="h-8 w-8 text-primary"/>
                    Tickets de Soporte
                </h1>
                <p className="text-muted-foreground text-white/80">Revisa y gestiona los problemas reportados por los usuarios.</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel
                    </Link>
                </Button>
            </div>

            <Card className="bg-white/10 border-white/20 text-white">
                <CardHeader>
                <CardTitle>Bandeja de Entrada</CardTitle>
                <CardDescription className="text-white/80">
                    Tickets de soporte pendientes de revisión y finalizados.
                </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/20 hover:bg-white/10">
                                <TableHead className="text-white/90 w-[120px]">Ticket ID</TableHead>
                                <TableHead className="text-white/90">Taller</TableHead>
                                <TableHead className="text-white/90">Descripción del Problema</TableHead>
                                <TableHead className="text-white/90">Reportado hace</TableHead>
                                <TableHead className="text-center text-white/90">Estado</TableHead>
                                <TableHead className="text-right text-white/90">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.map(ticket => (
                                <TableRow key={ticket.id} className="border-white/20 hover:bg-white/10">
                                    <TableCell className="font-mono">{ticket.id}</TableCell>
                                    <TableCell>{ticket.workshopName}</TableCell>
                                    <TableCell className="max-w-md truncate">{ticket.description}</TableCell>
                                    <TableCell>{formatDistanceToNow(ticket.reportedAt, { addSuffix: true, locale: es })}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusVariant(ticket.status)}>
                                            {ticket.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Pendiente')}>Pendiente</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'En Revisión')}>En Revisión</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Finalizado')}>Finalizado</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
