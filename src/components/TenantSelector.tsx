'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Check } from 'lucide-react';
import { getTenantId, setTenantId } from '@/lib/tenant';

interface Tenant {
  id: string;
  name: string;
  domain?: string | null;
}

export default function TenantSelector() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const currentTenantId = getTenantId();

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch('/api/tenants');
        if (!response.ok) {
          throw new Error('Failed to fetch tenants');
        }
        const data = await response.json();
        setTenants(data);

        // If no tenant is selected and we have tenants, pre-select the first one
        if (!currentTenantId && data.length > 0) {
          setSelectedTenantId(data[0].id);
        } else {
          setSelectedTenantId(currentTenantId);
        }
      } catch (error) {
        console.error('Error fetching tenants:', error);
        setError('Error al cargar los tenants');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [currentTenantId]);

  const handleTenantSelect = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const handleConfirmSelection = async () => {
    if (!selectedTenantId) return;

    setIsSelecting(true);
    try {
      setTenantId(selectedTenantId);
      // Redirect to dashboard or refresh the page
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error setting tenant:', error);
      setError('Error al seleccionar el tenant');
    } finally {
      setIsSelecting(false);
    }
  };

  const getCurrentTenant = () => {
    return tenants.find(t => t.id === currentTenantId);
  };

  const getSelectedTenant = () => {
    return tenants.find(t => t.id === selectedTenantId);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando tenants...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (tenants.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Seleccionar Tenant
          </CardTitle>
          <CardDescription>
            No hay tenants disponibles. Contacta al administrador para crear uno.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentTenant = getCurrentTenant();
  const selectedTenant = getSelectedTenant();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Seleccionar Tenant
        </CardTitle>
        <CardDescription>
          Elige la organización con la que quieres trabajar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentTenant && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">
                Tenant actual: {currentTenant.name}
              </span>
            </div>
            {currentTenant.domain && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {currentTenant.domain}
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Seleccionar Tenant</label>
          <Select
            value={selectedTenantId || ''}
            onValueChange={handleTenantSelect}
            disabled={isSelecting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  <div className="flex flex-col">
                    <span>{tenant.name}</span>
                    {tenant.domain && (
                      <span className="text-xs text-gray-500">{tenant.domain}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTenant && selectedTenantId !== currentTenantId && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Cambiarás a: <strong>{selectedTenant.name}</strong>
              {selectedTenant.domain && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedTenant.domain}
                </Badge>
              )}
            </p>
          </div>
        )}

        <Button
          onClick={handleConfirmSelection}
          disabled={!selectedTenantId || selectedTenantId === currentTenantId || isSelecting}
          className="w-full"
        >
          {isSelecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cambiando...
            </>
          ) : (
            'Confirmar Selección'
          )}
        </Button>

        {tenants.length > 1 && (
          <p className="text-xs text-gray-500 text-center">
            Todos los datos están aislados por tenant para mantener la privacidad.
          </p>
        )}
      </CardContent>
    </Card>
  );
}