'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface SalesFiltersProps {
  currentDateFrom: string;
  currentDateTo: string;
  currentType: 'direct' | 'service' | 'all';
}

export function SalesFilters({ currentDateFrom, currentDateTo, currentType }: SalesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/sales?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/sales');
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2">
        <label className="text-white/80 text-sm">Desde:</label>
        <input
          type="date"
          className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          value={currentDateFrom}
          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-white/80 text-sm">Hasta:</label>
        <input
          type="date"
          className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          value={currentDateTo}
          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-white/80 text-sm">Tipo:</label>
        <select
          className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:bg-gray-800 [&>option]:text-white"
          value={currentType}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="all">Todas</option>
          <option value="direct">Directas</option>
          <option value="service">Servicio</option>
        </select>
      </div>

      {(currentDateFrom || currentDateTo || currentType !== 'all') && (
        <button
          onClick={clearFilters}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-300 text-sm transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}