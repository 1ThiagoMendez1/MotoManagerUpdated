import { notFound } from 'next/navigation';
import { getTenantId } from '@/lib/tenant';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: {
    tenant: string;
  };
}

export default function TenantLayout({ children, params }: TenantLayoutProps) {
  // This layout will handle tenant-specific routing
  // The middleware already handles tenant validation
  return <>{children}</>;
}

export async function generateStaticParams() {
  // In a real app, you might fetch available tenants here
  // For now, we'll let Next.js handle dynamic routes
  return [];
}