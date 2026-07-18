import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasPermission } from './permissions';

export async function getCurrentUserServer() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Get workshop membership
  // We assume 1 user = 1 workshop for now, or just pick the first one.
  // Ideally, store 'current_workshop_id' in a cookie or user preference if multiple.
  const { data: membership } = await supabase
    .from('workshop_members')
    .select('workshop_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    // User exists but has no workshop? Edge case. 
    // Maybe they haven't completed registration?
    // Return basic user info but no workshop context?
    // Or return null to force re-login/setup?
    // Let's return basic info and let consumers handle missing workshop if needed.
    return {
      userId: user.id,
      email: user.email!,
      role: 'user', // Default fallback
      workshopId: null,
    };
  }

  return {
    userId: user.id,
    email: user.email!,
    role: membership.role,
    workshopId: membership.workshop_id,
  };
}

export async function requireWorkshop() {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/planes');
  }
  if (!user.workshopId) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.userId)
      .single();

    if (profile?.is_super_admin) {
      redirect('/admin');
    }

    redirect('/register-workshop');
  }
  return user;
}

export async function authorize(path: string) {
  const user = await requireWorkshop();
  if (!hasPermission(user.role, path)) {
    redirect('/'); // Redirect to the main menu if not authorized
  }
  return user;
}

export async function getWorkshopDetails() {
  const user = await getCurrentUserServer();
  if (!user || !user.workshopId) return null;

  const supabase = await createClient();
  const { data: workshop } = await supabase
    .from('workshops')
    .select('name, slug, subscription_status, subscription_plan, subscription_start_date, subscription_end_date, created_at')
    .eq('id', user.workshopId)
    .single();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('has_seen_welcome, name')
    .eq('id', user.userId)
    .single();

  return { ...workshop, has_seen_welcome: profile?.has_seen_welcome, user_name: profile?.name, user_role: user.role };
}

export async function requireSuperAdmin() {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/planes');
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.userId)
    .single();

  if (!profile?.is_super_admin) {
    redirect('/'); // Redirect unauthorized users to home
  }

  return { ...user, isSuperAdmin: true };
}