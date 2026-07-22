import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasPermission } from './permissions';
import { cookies } from 'next/headers';

export async function getCurrentUserServer() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Create admin client to bypass RLS infinite recursion issue on workshop_members
  const supabaseAdmin = await createAdminClient();

  // Get all workshop memberships to avoid .single() error when belonging to multiple
  const { data: memberships, error: memErr } = await supabaseAdmin
    .from('workshop_members')
    .select('workshop_id, role')
    .eq('user_id', user.id);

  console.log('DEBUG auth-server memberships for user:', user.email, memberships, memErr);

  if (!memberships || memberships.length === 0) {
    // Check if user is owner of a workshop directly in workshops table
    const { data: ownedWorkshops } = await supabaseAdmin
      .from('workshops')
      .select('id')
      .eq('owner_id', user.id);

    if (ownedWorkshops && ownedWorkshops.length > 0) {
      // Auto-fix missing membership link
      await supabaseAdmin.from('workshop_members').insert({
        user_id: user.id,
        workshop_id: ownedWorkshops[0].id,
        role: 'owner'
      }).select();

      return {
        userId: user.id,
        email: user.email!,
        role: 'owner',
        workshopId: ownedWorkshops[0].id,
        availableWorkshops: ownedWorkshops.map(w => w.id)
      };
    }

    return {
      userId: user.id,
      email: user.email!,
      role: 'user',
      workshopId: null,
    };
  }

  const cookieStore = await cookies();
  const activeWorkshopCookie = cookieStore.get('active_workshop_id')?.value;

  let activeMembership = memberships.find(m => m.workshop_id === activeWorkshopCookie);
  if (!activeMembership) {
    activeMembership = memberships[0];
  }

  return {
    userId: user.id,
    email: user.email!,
    role: activeMembership.role,
    workshopId: activeMembership.workshop_id,
    availableWorkshops: memberships.map(m => m.workshop_id)
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

    // Si es un usuario normal sin taller, mandarlo a /planes en vez de /register-workshop
    // porque /register-workshop está protegido solo para Super Admins y causaba un bucle.
    redirect('/planes');
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

  const supabaseAdmin = await createAdminClient();
  const { data: workshop } = await supabaseAdmin
    .from('workshops')
    .select('name, slug, subscription_status, subscription_plan, subscription_start_date, subscription_end_date, created_at')
    .eq('id', user.workshopId)
    .single();

  const { data: profile } = await supabaseAdmin
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