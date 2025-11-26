"use client";

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

export function SearchMotorcycles() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') || '');

  const handleSearch = (searchQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (searchQuery.trim()) {
      params.set('query', searchQuery.trim());
    } else {
      params.delete('query');
    }

    router.push(`/motorcycles?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('query');
    router.push(`/motorcycles?${params.toString()}`);
  };

  useEffect(() => {
    handleSearch(query);
  }, [query]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
        <Input
          type="text"
          placeholder="Buscar motocicletas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 w-64"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}