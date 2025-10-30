'use client';

interface SalesPaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
  };
}

export function SalesPagination({ currentPage, totalPages, searchParams }: SalesPaginationProps) {
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();

    // Copy existing search params
    if (searchParams.dateFrom) params.set('dateFrom', searchParams.dateFrom);
    if (searchParams.dateTo) params.set('dateTo', searchParams.dateTo);
    if (searchParams.type) params.set('type', searchParams.type);

    params.set('page', page.toString());
    window.location.href = `/sales?${params.toString()}`;
  };

  return (
    <div className="mt-6 flex w-full justify-center">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>

        <span className="text-white/80 px-2">
          Página {currentPage} de {totalPages}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}