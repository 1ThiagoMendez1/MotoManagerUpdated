import { requireSuperAdmin } from '@/lib/auth-server';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireSuperAdmin();

    return <>{children}</>;
}
