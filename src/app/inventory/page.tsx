import { authorize } from '@/lib/auth-server';
import { getInventory } from '@/lib/data';

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';

import InventoryClient from './InventoryClient';

const ITEMS_PER_PAGE = 10;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const user = await authorize('/inventory');
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';
  const category = resolvedSearchParams.category || '';
  const currentPage = Number(resolvedSearchParams.page) || 1;

  const { items: inventory, totalPages } = await getInventory({
    organizationId: user.workshopId,
    query,
    category,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  return (
    <InventoryClient 
      inventory={inventory} 
      totalPages={totalPages} 
    />
  );
}
