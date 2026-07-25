import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { hasPermission } from '@/lib/permissions';

export async function getCurrentUserServer() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Use admin client to bypass RLS issues (e.g. infinite recursion in policies)
      // Safe because we explicitly filter by user.id
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: _orgMembers, error: orgError } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .limit(1);
      
      if (orgError) {
        console.error("[auth-server] Error fetching organization_members:", orgError);
      }
      const orgMember = _orgMembers?.[0] as any;

      if (!orgMember) {
        console.warn(`[auth-server] User ${user.email} has no assigned organization_members.`);
      }

      return {
        userId: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        role: orgMember?.role || 'viewer',
        workshopId: orgMember?.organization_id || null,
        availableWorkshops: orgMember ? [orgMember.organization_id] : []
      };
    }
  } catch (e) {
    console.error('[auth-server] Error in getCurrentUserServer:', e);
  }

  return null;
}

export async function requireWorkshop() {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login');
  }
  if (!user.workshopId) {
    const { data: authData } = await (await createClient()).auth.getUser();
    const isSuperAdmin = authData?.user?.user_metadata?.is_super_admin === true || authData?.user?.email?.toLowerCase().startsWith('admin@') || authData?.user?.email?.toLowerCase() === 'juanurian31@gmail.com';
    if (isSuperAdmin) {
        redirect('/admin');
    }
    redirect('/no-workshop');
  }
  return user;
}

export async function authorize(path: string) {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login');
  }
  if (!user.workshopId) {
    const { data: authData } = await (await createClient()).auth.getUser();
    const isSuperAdmin = authData?.user?.user_metadata?.is_super_admin === true || authData?.user?.email?.toLowerCase().startsWith('admin@') || authData?.user?.email?.toLowerCase() === 'juanurian31@gmail.com';
    if (isSuperAdmin) {
        redirect('/admin');
    }
    redirect('/no-workshop');
  }
  
  if (!hasPermission(user.role, path)) {
    const workshopDetails = await getWorkshopDetails(user);
    if (workshopDetails) {
       redirect(`/${workshopDetails.slug}`);
    } else {
       redirect('/');
    }
  }
  
  return user;
}

export async function getWorkshopDetails(knownUser?: any) {
  const user = knownUser || await getCurrentUserServer();
  if (!user || (!user.workshopId && !user.id)) {
    console.warn(`[auth-server] getWorkshopDetails - User or user.workshopId is missing. user:`, user);
    return null;
  }

  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // If we only have knownUser from auth but not the workshopId, fetch it
    let workshopId = user.workshopId;
    let userRole = user.role;
    if (!workshopId && user.id) {
       const { data: _orgMembers } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .limit(1);
       if (_orgMembers && _orgMembers.length > 0) {
           workshopId = _orgMembers[0].organization_id;
           userRole = _orgMembers[0].role;
       }
    }

    if (!workshopId) {
        console.warn(`[auth-server] getWorkshopDetails - Could not resolve workshopId for user ${user.id}`);
        return null;
    }

    const { data: _org, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', workshopId)
      .single();
      
    if (error) {
      console.error(`[auth-server] getWorkshopDetails - Error fetching org ${workshopId}:`, error);
    }
    
    const org = _org as any;
    
    if (org) {
      return {
        name: org.name,
        slug: org.slug,
        subscription_status: org.subscription_status || 'active',
        subscription_plan: 'premium', 
        has_seen_welcome: true,
        user_name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Usuario',
        user_role: userRole
      };
    } else {
       console.warn(`[auth-server] getWorkshopDetails - No org found for id ${workshopId}`);
    }
  } catch (e) {
    console.error('[auth-server] Error fetching workshop details:', e);
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
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
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