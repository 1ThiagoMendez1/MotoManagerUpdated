'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface CategoryFilterProps {
  currentCategory: string;
}

export function CategoryFilter({ currentCategory }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (category === 'all' || !category) {
      params.delete('category');
    } else {
      params.set('category', category);
    }

    // Reset to page 1 when changing category
    params.delete('page');

    router.push(`/inventory?${params.toString()}`);
  };

  return (
    <select
      className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-md text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:bg-gray-800 [&>option]:text-white"
      value={currentCategory || 'all'}
      onChange={(e) => handleCategoryChange(e.target.value)}
    >
      <option value="all">Todas las categorías</option>
      <option value="Lubricantes">Lubricantes</option>
      <option value="Repuestos">Repuestos</option>
      <option value="Llantas">Llantas</option>
      <option value="Accesorios">Accesorios</option>
    </select>
  );
}