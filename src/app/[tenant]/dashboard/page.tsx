import { redirect } from 'next/navigation';

interface TenantDashboardProps {
  params: {
    tenant: string;
  };
}

export default function TenantDashboard({ params }: TenantDashboardProps) {
  // For now, redirect to the main dashboard
  // In a full implementation, this would show tenant-specific dashboard
  redirect('/');
}