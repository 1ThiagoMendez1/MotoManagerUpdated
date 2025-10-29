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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ShieldCheck, ArrowLeft, Ticket } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const mockWorkshops = [
  {
    id: 'taller_1',
    name: 'Taller Motos Veloz',
    owner: 'Carlos Reyes',
    plan: 'Premium',
    avatarUrl: 'https://i.pravatar.cc/150?u=taller1',
    modules: {
      motorcycles: true,
      workOrders: true,
      inventory: true,
      schedule: true,
      technicians: true,
      sales: true,
    }
  },
  {
    id: 'taller_2',
    name: 'Motos El Rayo',
    owner: 'Ana Torres',
    plan: 'Básico',
    avatarUrl: 'https://i.pravatar.cc/150?u=taller2',
    modules: {
      motorcycles: true,
      workOrders: true,
      inventory: true,
      schedule: false,
      technicians: false,
      sales: true,
    }
  },
  {
    id: 'taller_3',
    name: 'Servicio 2 Ruedas',
    owner: 'Luis Navarro',
    plan: 'Básico',
    avatarUrl: 'https://i.pravatar.cc/150?u=taller3',
    modules: {
      motorcycles: true,
      workOrders: true,
      inventory: false,
      schedule: false,
      technicians: true,
      sales: true,
    }
  }
];

const modules = [
  { id: 'motorcycles', label: 'Motos' },
  { id: 'workOrders', label: 'Órdenes' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'schedule', label: 'Agenda' },
  { id: 'technicians', label: 'Técnicos' },
  { id: 'sales', label: 'Ventas' },
];

export default function AdminPage() {
    const [workshops, setWorkshops] = useState(mockWorkshops);

    const handlePermissionChange = (workshopId: string, moduleId: string, checked: boolean) => {
        setWorkshops(currentWorkshops =>
            currentWorkshops.map(shop =>
                shop.id === workshopId
                ? {
                    ...shop,
                    modules: {
                        ...shop.modules,
                        [moduleId]: checked
                    }
                    }
                : shop
            )
        );
    };

  return (
    <div className="w-full max-w-7xl p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary"/>
            Panel de Administración
          </h1>
          <p className="text-muted-foreground text-white/80">Gestiona los talleres registrados y sus módulos activos.</p>
        </div>
        <div className='flex items-center gap-4'>
             <Button asChild>
                <Link href="/admin/tickets">
                    <Ticket className="mr-2 h-4 w-4" />
                    Ver Tickets
                </Link>
            </Button>
             <Button variant="outline" onClick={() => alert('Simulando agregar nuevo taller...')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Taller
            </Button>
            <Button asChild variant="outline">
                <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Link>
            </Button>
        </div>
      </div>

      <Card className="bg-white/10 border-white/20 text-white">
        <CardHeader>
          <CardTitle>Talleres Registrados</CardTitle>
          <CardDescription className="text-white/80">
            Define qué módulos puede usar cada taller.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/10">
                <TableHead className="text-white/90">Taller</TableHead>
                {modules.map(module => (
                  <TableHead key={module.id} className="text-center text-white/90">{module.label}</TableHead>
                ))}
                <TableHead className="text-right text-white/90">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workshops.map((shop) => (
                <TableRow key={shop.id} className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={shop.avatarUrl} alt={shop.name} data-ai-hint="logo building"/>
                            <AvatarFallback>{shop.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div>{shop.name}</div>
                            <div className="text-sm text-white/70">{shop.owner}</div>
                            <Badge variant={shop.plan === 'Premium' ? 'default' : 'secondary'} className="mt-1 text-xs">{shop.plan}</Badge>
                        </div>
                    </div>
                  </TableCell>
                  {modules.map(module => (
                    <TableCell key={module.id} className="text-center">
                        <Checkbox
                            checked={shop.modules[module.id as keyof typeof shop.modules]}
                            onCheckedChange={(checked) => handlePermissionChange(shop.id, module.id, Boolean(checked))}
                            aria-label={`Permiso de ${module.label} para ${shop.name}`}
                        />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => alert(`Simulando eliminar a ${shop.name}...`)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
