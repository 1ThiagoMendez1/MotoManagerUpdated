import { authorize } from '@/lib/auth-server';
import ProfileClient from './ProfileClient';
import { getProfileData } from '@/lib/actions/profile';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  await authorize('/dashboard');
  const data = await getProfileData();
  return <ProfileClient initialData={data} />;
}
