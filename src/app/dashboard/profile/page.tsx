import { authorize } from '@/lib/auth-server';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  await authorize('/dashboard');
  return <ProfileClient />;
}
