import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getCurrentUserServer() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: _orgMember } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .maybeSingle();
      const orgMember = _orgMember as any;

      return {
        userId: user.id,
        email: user.email,
        role: orgMember?.role || 'viewer',
        workshopId: orgMember?.organization_id || null,
        availableWorkshops: orgMember ? [orgMember.organization_id] : []
      };
    }
  } catch (e) {
    console.error('Error in getCurrentUserServer:', e);
  }

  return null;
}

export async function requireWorkshop() {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login');
  }
  if (!user.workshopId) {
    redirect('/register-workshop');
  }
  return user;
}

export async function authorize(path: string) {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login');
  }
  if (!user.workshopId) {
    redirect('/register-workshop');
  }
  return user;
}

export async function getWorkshopDetails() {
  const user = await getCurrentUserServer();
  if (!user || !user.workshopId) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data: _org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.workshopId)
      .single();
    const org = _org as any;
    
    if (org) {
      return {
        name: org.name,
        slug: org.slug,
        subscription_status: org.subscription_status || 'active',
        subscription_plan: 'premium', 
        has_seen_welcome: true,
        user_name: user.email,
        user_role: user.role
      };
    }
  } catch (e) {
    console.error('Error fetching workshop details:', e);
  }

  return null;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUserServer();
  // Temporarily we can say superAdmin is a specific role or email, 
  // but for now if they are not logged in, redirect them.
  if (!user) {
    redirect('/login');
  }
  return { ...user, isSuperAdmin: true };
}

export async function createAdminClient() {
  console.warn("createAdminClient used, returning standard createClient");
  return createClient();
}

export async function getScopedClient() {
  const user = await requireWorkshop();
  return {
    supabase: await createClient(),
    supabaseAdmin: await createClient(),
    workshopId: user.workshopId,
    user
  };
}