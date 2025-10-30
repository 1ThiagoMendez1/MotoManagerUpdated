// Este componente ya no es necesario ya que quitamos la lógica de tenants
// Se mantiene por compatibilidad pero no hace nada
'use client';

import React, { ReactNode } from 'react';

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  return <>{children}</>;
}

export function useTenant() {
  // Retorna un tenant dummy para compatibilidad
  return {
    currentTenant: null,
    tenants: [],
    isLoading: false,
    switchTenant: async () => {},
    refreshTenants: async () => {},
  };
}