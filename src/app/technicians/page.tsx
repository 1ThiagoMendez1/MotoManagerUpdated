import { getTechnicians } from '@/lib/data';
import { authorize, requireWorkshop } from '@/lib/auth-server';

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';
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
import type { Technician } from '@/lib/types';
import { TechnicianRow } from '@/components/TechnicianRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TechniciansChart } from '@/components/TechniciansChart';
import { DownloadTechniciansReportButton } from '@/components/DownloadTechniciansReportButton';

export default async function TechniciansPage() {
  await authorize('/technicians');
  const user = await requireWorkshop();
  const isAdminOrOwner = user.role === 'admin' || user.role === 'owner';
  let technicians: Technician[] = [];
  let error: string | null = null;

  try {
    technicians = await getTechnicians();
    console.log('Technicians page loaded technicians:', technicians);
  } catch (err) {
    console.error('Error fetching technicians:', err);
    error = 'Error al cargar los técnicos';
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Técnicos</h1>
          <p className="text-muted-foreground text-muted-foreground">Gestiona el personal de tu taller.</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-card/50 border border-border/50">
            <TabsTrigger value="list">Lista</TabsTrigger>
            {isAdminOrOwner && <TabsTrigger value="analysis">Análisis</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <Card className="glass-card relative overflow-hidden group text-foreground">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <CardHeader className="relative z-10">
              <CardTitle>Lista de Personal</CardTitle>
              <CardDescription className="text-muted-foreground">
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
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-foreground/90">Nombre</TableHead>
                      <TableHead className="text-foreground/90">Especialidad</TableHead>
                      <TableHead className="text-foreground/90 text-center">Órdenes de Trabajo</TableHead>
                      <TableHead>
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {technicians.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
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
        </TabsContent>

        {isAdminOrOwner && (
          <TabsContent value="analysis" className="mt-0">
            <Card className="glass-card relative overflow-hidden group text-foreground">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between relative z-10">
                <div className="space-y-1.5">
                  <CardTitle>Rendimiento de Técnicos</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Análisis de la carga de trabajo y órdenes de cada técnico.
                  </CardDescription>
                </div>
                <DownloadTechniciansReportButton technicians={technicians} />
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center py-10 text-red-400">
                    {error}
                  </div>
                ) : (
                  <TechniciansChart technicians={technicians} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
