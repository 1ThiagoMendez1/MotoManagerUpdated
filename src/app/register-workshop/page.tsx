import { requireSuperAdmin } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import RegisterForm from './RegisterForm';

export default async function Page() {
    await requireSuperAdmin();

    return <RegisterForm />;
}
