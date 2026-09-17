import { authorize } from '@/lib/auth-server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { getTechnicians } from '@/lib/data';


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
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  await authorize('/technicians');
  const user = await requireWorkshop();
  const isAdminOrOwner = user.role === 'admin' || user.role === 'owner';
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page) || 1;
  let technicians: Technician[] = [];
  let totalPages = 0;
  let error: string | null = null;

  try {
    const result = await getTechnicians({ page });
    technicians = result.items;
    totalPages = result.totalPages;
    const { getWorkOrders } = await import('@/lib/data');
    const woResult = await getWorkOrders();
    const workOrders = woResult.items;
    
    technicians = technicians.map(tech => ({
      ...tech,
      workOrders: workOrders.filter(wo => wo.technician?.id === tech.id)
    }));
    
    console.log('Technicians page loaded technicians:', technicians.length);
  } catch (err) {
    console.error('Error fetching technicians:', err);
    error = 'Error al cargar los técnicos';
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <PageHeader
        icon={Users}
        iconBg="bg-blue-500/10 text-blue-500"
        title="Técnicos"
        description="Gestiona el personal técnico y mecánicos de tu taller."
        badge={
          <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
            {technicians.length} {technicians.length === 1 ? 'técnico' : 'técnicos'}
          </Badge>
        }
        actions={
          isAdminOrOwner ? (
            <DownloadTechniciansReportButton technicians={technicians} />
          ) : undefined
        }
      />

      <Tabs defaultValue="list" className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/60 p-1 rounded-lg border border-border/50">
            <TabsTrigger value="list" className="text-xs font-semibold px-3 py-1.5 rounded-md">
              Lista de Personal
            </TabsTrigger>
            {isAdminOrOwner && (
              <TabsTrigger value="analysis" className="text-xs font-semibold px-3 py-1.5 rounded-md">
                Rendimiento & Análisis
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/40">
              <h3 className="text-sm font-semibold text-foreground">Lista de Técnicos</h3>
              <p className="text-xs text-muted-foreground">
                Personal activo asignado a órdenes de trabajo y reparaciones.
              </p>
            </div>
            <div className="p-0">
              {error ? (
                <div className="text-center py-10 text-red-400 text-sm">
                  {error}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-muted/30 hover:bg-transparent">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase py-2.5">Nombre</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase py-2.5">Contacto</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase py-2.5">Especialidad</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase py-2.5 text-center">Órdenes de Trabajo</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {technicians.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs">
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
              {totalPages > 1 && (
                <div className="p-3 border-t border-border/40">
                  <Pagination totalPages={totalPages} />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {isAdminOrOwner && (
          <TabsContent value="analysis" className="mt-0">
            <Card className="border border-border/60 bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold">Rendimiento de Técnicos</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Análisis de la carga de trabajo, órdenes completadas y eficiencia de cada técnico.
                  </CardDescription>
                </div>
                <DownloadTechniciansReportButton technicians={technicians} />
              </CardHeader>
              <CardContent className="pt-4">
                {error ? (
                  <div className="text-center py-10 text-red-400 text-sm">
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
