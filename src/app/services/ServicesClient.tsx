'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Loader2, Edit, Tag, Clock, DollarSign } from 'lucide-react';
import { getServices, ServiceItem } from '@/actions/services';
import ServiceFormModal from '@/components/forms/ServiceFormModal';
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
    (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Catálogo de Servicios</h1>
            <p className="text-muted-foreground">Administra los servicios que ofreces, sus precios y categorías para contabilidad.</p>
          </div>
          <Button 
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Servicio
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o categoría..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
                      <th className="px-6 py-4 font-medium">Servicio</th>
                      <th className="px-6 py-4 font-medium">Categoría</th>
                      <th className="px-6 py-4 font-medium text-center">Duración</th>
                      <th className="px-6 py-4 font-medium text-right">Precio Base</th>
                      <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredServices.map((service) => (
                      <tr key={service.id} className="hover:bg-muted/10 transition-colors group">
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
