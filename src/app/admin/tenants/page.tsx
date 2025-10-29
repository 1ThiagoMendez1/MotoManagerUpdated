'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2, Users, Bike, Wrench, Package, Calendar, FileText, ShoppingCart } from 'lucide-react';
import AddTenant from '@/components/forms/AddTenant';
import EditTenant from '@/components/forms/EditTenant';
import DeleteTenant from '@/components/forms/DeleteTenant';

interface Tenant {
  id: string;
  name: string;
  domain?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    customers: number;
    motorcycles: number;
    technicians: number;
    inventoryItems: number;
    appointments: number;
    workOrders: number;
    sales: number;
  };
}

type ViewMode = 'list' | 'add' | 'edit';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenants');
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }
      const data = await response.json();
      setTenants(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setError('Error al cargar los tenants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleAddTenant = () => {
    setViewMode('add');
  };

  const handleEditTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTenantId(null);
    fetchTenants(); // Refresh the list
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (viewMode === 'add') {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={handleBackToList}>
            ← Volver a la lista
          </Button>
        </div>
        <AddTenant />
      </div>
    );
  }

  if (viewMode === 'edit' && selectedTenantId) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={handleBackToList}>
            ← Volver a la lista
          </Button>
        </div>
        <EditTenant tenantId={selectedTenantId} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Administración de Tenants</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las organizaciones y sus datos de forma aislada.
          </p>
        </div>
        <Button onClick={handleAddTenant}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Tenant
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Cargando tenants...
          </CardContent>
        </Card>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4">No hay tenants registrados aún.</p>
            <Button onClick={handleAddTenant}>
              <Plus className="h-4 w-4 mr-2" />
              Crear el primer tenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tenants Registrados</CardTitle>
            <CardDescription>
              Lista de todas las organizaciones en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dominio</TableHead>
                  <TableHead>Estadísticas</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      {tenant.domain ? (
                        <Badge variant="secondary">{tenant.domain}</Badge>
                      ) : (
                        <span className="text-gray-400">Sin dominio</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {tenant._count && (
                          <>
                            {tenant._count.customers > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {tenant._count.customers}
                              </Badge>
                            )}
                            {tenant._count.motorcycles > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Bike className="h-3 w-3 mr-1" />
                                {tenant._count.motorcycles}
                              </Badge>
                            )}
                            {tenant._count.technicians > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Wrench className="h-3 w-3 mr-1" />
                                {tenant._count.technicians}
                              </Badge>
                            )}
                            {tenant._count.inventoryItems > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                {tenant._count.inventoryItems}
                              </Badge>
                            )}
                            {tenant._count.workOrders > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                {tenant._count.workOrders}
                              </Badge>
                            )}
                            {tenant._count.sales > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {tenant._count.sales}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTenant(tenant.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DeleteTenant
                          tenant={tenant}
                          onSuccess={fetchTenants}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}