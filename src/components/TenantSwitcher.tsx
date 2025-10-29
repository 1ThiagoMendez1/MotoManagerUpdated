'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Check } from 'lucide-react';
import { useTenant } from './TenantContextProvider';

export default function TenantSwitcher() {
  const { currentTenant, tenants, isLoading, switchTenant } = useTenant();
  const [isSwitching, setIsSwitching] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(currentTenant?.id || null);

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const handleConfirmSwitch = async () => {
    if (!selectedTenantId || selectedTenantId === currentTenant?.id) return;

    setIsSwitching(true);
    try {
      await switchTenant(selectedTenantId);
    } catch (error) {
      console.error('Error switching tenant:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  const getSelectedTenant = () => {
    return tenants.find(t => t.id === selectedTenantId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando...</span>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Sin tenants</span>
      </div>
    );
  }

  const selectedTenant = getSelectedTenant();

  return (
    <div className="flex items-center gap-2">
      {currentTenant && (
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">{currentTenant.name}</span>
          {currentTenant.domain && (
            <Badge variant="secondary" className="text-xs">
              {currentTenant.domain}
            </Badge>
          )}
        </div>
      )}

      {tenants.length > 1 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedTenantId || ''}
            onValueChange={handleTenantSelect}
            disabled={isSwitching}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Cambiar..." />
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

          {selectedTenant && selectedTenantId !== currentTenant?.id && (
            <Button
              onClick={handleConfirmSwitch}
              disabled={isSwitching}
              size="sm"
              className="h-8"
            >
              {isSwitching ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                'Cambiar'
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}