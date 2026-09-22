import { authorize } from '@/lib/auth-server';

import TeamClient from './TeamClient';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  await authorize('/team');
  return <TeamClient />;
}
