'use client';

import { cn } from '@/lib/utils';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Pagination as PaginationContainer,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  } from '@/components/ui/pagination';

export function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const renderPaginationItems = () => {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i+1}>
              <PaginationLink href={createPageURL(i + 1)} isActive={currentPage === i+1}>
                {i + 1}
              </PaginationLink>
            </PaginationItem>
        ))
    }

    // More complex pagination for more pages
    const pages = [];
    pages.push(
      <PaginationItem key={1}>
        <PaginationLink href={createPageURL(1)} isActive={currentPage === 1}>1</PaginationLink>
      </PaginationItem>
    );

    if (currentPage > 3) {
      pages.push(<PaginationEllipsis key="start-ellipsis" />);
    }

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink href={createPageURL(i)} isActive={currentPage === i}>{i}</PaginationLink>
        </PaginationItem>
      );
    }
    
    if (currentPage < totalPages - 2) {
        pages.push(<PaginationEllipsis key="end-ellipsis" />);
    }

    pages.push(
      <PaginationItem key={totalPages}>
        <PaginationLink href={createPageURL(totalPages)} isActive={currentPage === totalPages}>{totalPages}</PaginationLink>
      </PaginationItem>
    );
    
    return pages;
  }

  if (totalPages <= 1) {
    return null;
  }

  return (
    <PaginationContainer>
      <PaginationContent className='text-white'>
        <PaginationItem>
          <PaginationPrevious href={createPageURL(currentPage - 1)} className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''} />
        </PaginationItem>
        {renderPaginationItems()}
        <PaginationItem>
          <PaginationNext href={createPageURL(currentPage + 1)} className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''} />
        </PaginationItem>
      </PaginationContent>
    </PaginationContainer>
  );
}
