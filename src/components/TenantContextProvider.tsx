'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTenantId, setTenantId } from '@/lib/tenant';

interface Tenant {
  id: string;
  name: string;
  domain?: string | null;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
        const currentTenantId = getTenantId();
        if (currentTenantId) {
          const tenant = data.find((t: Tenant) => t.id === currentTenantId);
          setCurrentTenant(tenant || null);
        }
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchTenant = async (tenantId: string) => {
    setTenantId(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);
    setCurrentTenant(tenant || null);
    // Refresh the page to apply tenant context
    window.location.reload();
  };

  const refreshTenants = async () => {
    setIsLoading(true);
    await fetchTenants();
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        tenants,
        isLoading,
        switchTenant,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}