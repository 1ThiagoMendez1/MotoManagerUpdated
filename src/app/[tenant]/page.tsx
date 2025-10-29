import { redirect } from 'next/navigation';

interface TenantPageProps {
  params: {
    tenant: string;
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenant } = await params;
  // Redirect to the main dashboard for the tenant
  redirect(`/${tenant}/dashboard`);
}