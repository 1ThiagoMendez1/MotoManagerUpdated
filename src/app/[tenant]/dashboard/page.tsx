import { redirect } from 'next/navigation';

interface TenantDashboardProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function TenantDashboard({ params }: TenantDashboardProps) {
  const { tenant } = await params;
  redirect(`/${tenant}`);
}