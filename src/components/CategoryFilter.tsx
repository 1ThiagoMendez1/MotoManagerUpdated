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
      className="px-3 py-2 bg-card backdrop-blur-md border border-border/50 rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [&>option]:bg-card [&>option]:text-foreground"
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