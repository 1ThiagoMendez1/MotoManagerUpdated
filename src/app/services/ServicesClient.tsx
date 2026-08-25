'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Loader2, Edit, Tag, Clock, DollarSign, Trash2 } from 'lucide-react';
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
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Catálogo de Servicios</h1>
            <p className="text-muted-foreground">Administra los servicios que ofreces, sus precios y categorías para contabilidad.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <ImportServices 
              organizationId={organizationId} 
              onSuccess={loadServices}
            />
            <Button 
              onClick={() => {
                setEditingService(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1 sm:flex-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nombre o categoría..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={deletingBulk}
                className="w-full sm:w-auto"
              >
                {deletingBulk ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Eliminar ({selectedIds.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* List */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <p>No se encontraron servicios.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center">
                        <Checkbox 
                          checked={selectedIds.length === filteredServices.length && filteredServices.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Seleccionar todos"
                        />
                      </th>
                      <th className="px-6 py-4 font-medium">Código</th>
                      <th className="px-6 py-4 font-medium">Servicio</th>
                      <th className="px-6 py-4 font-medium">Categoría</th>
                      <th className="px-6 py-4 font-medium text-center">Duración</th>
                      <th className="px-6 py-4 font-medium text-right">Precio Base</th>
                      <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredServices.map((service) => (
                      <tr key={service.id} className={`hover:bg-muted/10 transition-colors group ${selectedIds.includes(service.id) ? 'bg-muted/5' : ''}`}>
                        <td className="px-6 py-4 text-center">
                          <Checkbox 
                            checked={selectedIds.includes(service.id)}
                            onCheckedChange={() => toggleSelectOne(service.id)}
                            aria-label={`Seleccionar ${service.name}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          {service.code ? (
                            <span className="font-mono text-xs px-2 py-1 bg-muted/30 rounded text-muted-foreground">{service.code}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-foreground">{service.name}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1 max-w-xs">{service.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {service.category ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-500">
                              <Tag className="w-3 h-3" />
                              {service.category}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sin categoría</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-muted-foreground">
                          {service.default_duration_minutes ? (
                            <span className="flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {service.default_duration_minutes} min
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-500">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(service.default_price)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingService(service);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
