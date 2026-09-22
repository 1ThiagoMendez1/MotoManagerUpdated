'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2, Edit, Tag, Clock, Trash2, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ModuleToolbar } from '@/components/common/ModuleToolbar';
import { SelectionActionBar } from '@/components/common/SelectionActionBar';
import { getServices, ServiceItem, deleteServicesBulk } from '@/actions/services';
import ServiceFormModal from '@/components/forms/ServiceFormModal';
import { ImportServices } from '@/components/forms/ImportServices';
import { toast } from 'sonner';

interface ServicesClientProps {
  organizationId: string;
}

export default function ServicesClient({ organizationId }: ServicesClientProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.length} servicios?`)) return;

    setDeletingBulk(true);
    try {
      const res = await deleteServicesBulk(selectedIds, organizationId);
      if (res.success) {
        toast.success(`Se han eliminado ${selectedIds.length} servicios`);
        setSelectedIds([]);
        loadServices();
      } else {
        toast.error(res.error || 'Error al eliminar los servicios');
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado al eliminar');
    } finally {
      setDeletingBulk(false);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await getServices(organizationId);
      setServices(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar servicios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [organizationId]);

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.code && s.code.toLowerCase().includes(search.toLowerCase())) ||
    (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredServices.length && filteredServices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredServices.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <PageHeader
        icon={Wrench}
        iconBg="bg-indigo-500/10 text-indigo-500"
        title="Catálogo de Servicios"
        description="Administra los servicios que ofreces, sus precios y categorías para contabilidad."
        badge={
          <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
            {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <ImportServices 
              organizationId={organizationId} 
              onSuccess={loadServices}
            />
            <Button 
              onClick={() => {
                setEditingService(null);
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-3 text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nuevo Servicio
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <ModuleToolbar
        searchComponent={
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nombre o categoría..."
              className="pl-8 h-9 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      {/* Floating Bulk Action Bar */}
      <SelectionActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        titleSingular="servicio seleccionado"
        titlePlural="servicios seleccionados"
        actions={
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            disabled={deletingBulk}
            className="h-8 px-2.5 text-xs font-medium"
          >
            {deletingBulk ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3 mr-1" />
            )}
            Eliminar ({selectedIds.length})
          </Button>
        }
      />

      {/* Services List Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-48 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Cargando servicios...</span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Wrench className="w-5 h-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">No se encontraron servicios</p>
            <p className="text-xs text-muted-foreground mt-0.5">Prueba cambiando los criterios de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-semibold text-muted-foreground uppercase bg-muted/40 border-b border-border/60">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">
                    <Checkbox 
                      checked={selectedIds.length === filteredServices.length && filteredServices.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold">Código</th>
                  <th className="px-3.5 py-2.5 font-semibold">Servicio</th>
                  <th className="px-3.5 py-2.5 font-semibold">Categoría</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Duración</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Precio Base</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredServices.map((service) => (
                  <tr 
                    key={service.id} 
                    className={`hover:bg-muted/30 transition-colors group ${selectedIds.includes(service.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-3.5 py-2.5 text-center">
                      <Checkbox 
                        checked={selectedIds.includes(service.id)}
                        onCheckedChange={() => toggleSelectOne(service.id)}
                        aria-label={`Seleccionar ${service.name}`}
                      />
                    </td>
                    <td className="px-3.5 py-2.5">
                      {service.code ? (
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-muted rounded border border-border/60 text-muted-foreground font-semibold">
                          {service.code}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">-</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <p className="font-semibold text-foreground text-xs">{service.name}</p>
                      {service.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 max-w-sm">{service.description}</p>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {service.category ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          <Tag className="w-2.5 h-2.5" />
                          {service.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-[11px]">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center text-muted-foreground">
                      {service.default_duration_minutes ? (
                        <span className="inline-flex items-center justify-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          {service.default_duration_minutes}m
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">-</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(service.default_price)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 opacity-80 group-hover:opacity-100 hover:bg-muted"
                        onClick={() => {
                          setEditingService(service);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ServiceFormModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        organizationId={organizationId}
        initialData={editingService}
        onSuccess={() => {
          setIsModalOpen(false);
          loadServices();
        }}
      />
    </div>
  );
}
