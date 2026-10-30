import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { hasPermission } from '@/lib/permissions';
import { cache } from 'react';
import { isSuperAdmin } from '@/lib/super-admin';
import { resolveWorkshopPlan } from '@/lib/workshop-plan';
import { getTrialState } from '@/lib/subscription-trial';

export const getCurrentUserServer = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Use admin client to bypass RLS issues (e.g. infinite recursion in policies)
      // Safe because we explicitly filter by user.id
      const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
      const { data: _orgMembers, error: orgError } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id, role, custom_permissions')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
        .limit(1);
      
      if (orgError) {
        console.error("[auth-server] Error fetching organization_members:", orgError);
      }
      const orgMember = _orgMembers?.[0] as any;

      return {
        userId: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        role: orgMember?.role || 'viewer',
        custom_permissions: orgMember?.custom_permissions || null,
        workshopId: orgMember?.organization_id || null,
        availableWorkshops: orgMember ? [orgMember.organization_id] : []
      };
    }
  } catch (e) {
    console.error('[auth-server] Error in getCurrentUserServer:', e);
  }

  return null;
});

export async function requireWorkshop(options: { allowExpired?: boolean } = {}) {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login');
  }
  if (!user.workshopId) {
    if (isSuperAdmin(user)) {
        redirect('/admin');
    }
    redirect('/no-workshop');
  }
  if (!options.allowExpired && !isSuperAdmin(user)) {
    const workshop = await getWorkshopDetails(user);
    if (workshop?.trial_expired) redirect('/dashboard/subscription');
  }
  return user;
}

export async function authorize(path: string) {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login');
  }
  if (!user.workshopId) {
    if (isSuperAdmin(user)) {
        redirect('/admin');
    }
    redirect('/no-workshop');
  }
  if (!isSuperAdmin(user)) {
    const workshop = await getWorkshopDetails(user);
    if (workshop?.trial_expired) redirect('/dashboard/subscription');
  }
  
  if (!hasPermission(user.role, path, user.custom_permissions)) {
    const workshopDetails = await getWorkshopDetails(user);
    if (workshopDetails) {
       redirect(`/${workshopDetails.slug}`);
    } else {
       redirect('/');
    }
  }
  
  return user;
}

export const getWorkshopDetails = cache(async (knownUser?: any) => {
  const user = knownUser || await getCurrentUserServer();
  if (!user || (!user.workshopId && !user.id)) {
    return null;
  }

  try {
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
    
    // If we only have knownUser from auth but not the workshopId, fetch it
    let workshopId = user.workshopId;
    let userRole = user.role;
    let customPermissions = user.custom_permissions;
    const actualUserId = user.userId || user.id;
    if (!workshopId && actualUserId) {
       const { data: _orgMembers } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id, role, custom_permissions')
        .eq('user_id', actualUserId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
        .limit(1);
       if (_orgMembers && _orgMembers.length > 0) {
           workshopId = _orgMembers[0].organization_id;
           userRole = _orgMembers[0].role;
           customPermissions = _orgMembers[0].custom_permissions;
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
      const settings = org.settings || {};
      const trial = getTrialState(settings);
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        subscription_status: org.status !== 'active' ? 'past_due' : trial.expired ? 'past_due' : (trial.isTrial || settings.plan === 'demo') ? 'trialing' : 'active',
        subscription_plan: resolveWorkshopPlan(settings), 
        subscription_start_date: trial.isTrial ? settings.trialStartDate : settings.startDate || settings.demoStartDate || null,
        subscription_end_date: trial.isTrial ? trial.endsAt : settings.endDate || settings.demoEndDate || null,
        is_trial: trial.isTrial,
        trial_expired: trial.expired,
        trial_days_remaining: trial.daysRemaining,
        created_at: org.created_at,
        has_seen_welcome: true,
        user_name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Usuario',
        user_role: userRole,
        custom_permissions: customPermissions
      };
    } else {
       console.warn(`[auth-server] getWorkshopDetails - No org found for id ${workshopId}`);
    }
  } catch (e) {
    console.error('[auth-server] Error fetching workshop details:', e);
  }

  return null;
});

export async function requireSuperAdmin() {
  const user = await getCurrentUserServer();
  // Temporarily we can say superAdmin is a specific role or email, 
  // but for now if they are not logged in, redirect them.
  if (!user) {
    redirect('/login');
  }
  if (!isSuperAdmin(user)) redirect('/dashboard');
  return { ...user, isSuperAdmin: true };
}

export async function createAdminClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

export async function getScopedClient(options: { allowExpired?: boolean } = {}) {
  const user = await requireWorkshop(options);
  return {
    supabase: await createClient(),
    supabaseAdmin: await createClient(),
    workshopId: user.workshopId,
    user
  };
}
