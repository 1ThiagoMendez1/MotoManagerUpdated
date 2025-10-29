import { getTechnicians } from '@/lib/data';
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
import { AddTechnician } from '@/components/forms/AddTechnician';
import type { Technician } from '@/lib/types';
import { TechnicianRow } from '@/components/TechnicianRow';

export default async function TechniciansPage() {
  let technicians: Technician[] = [];
  let error: string | null = null;

  try {
    technicians = await getTechnicians();
  } catch (err) {
    console.error('Error fetching technicians:', err);
    error = 'Error al cargar los técnicos';
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Técnicos</h1>
          <p className="text-muted-foreground text-white/80">Gestiona el personal de tu taller.</p>
        </div>
        <AddTechnician />
      </div>
      <Card className="bg-white/10 border-white/20 text-white">
        <CardHeader>
          <CardTitle>Lista de Personal</CardTitle>
          <CardDescription className="text-white/80">
            Una lista de todos los técnicos de tu equipo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-10 text-red-400">
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/10">
                  <TableHead className="text-white/90">Nombre</TableHead>
                  <TableHead className="text-white/90">Especialidad</TableHead>
                  <TableHead className="text-white/90 text-center">Órdenes de Trabajo</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-white/70">
                      No hay técnicos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  technicians.map((tech) => (
                    <TechnicianRow key={tech.id} technician={tech} />
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
