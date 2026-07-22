import { createClient } from '@/lib/supabase/server';
import { getCurrentUserServer } from '@/lib/auth-server';

async function getScopedClient() {
  const user = await getCurrentUserServer();
  const supabase = await createClient();
  if (!user || !user.workshopId) {
    return { supabase, workshopId: null, user: null };
  }
  return { supabase, workshopId: user.workshopId, user };
}

// Para que el Taller vea sus propios tickets
export const getWorkshopTickets = async () => {
  const user = await getCurrentUserServer();
  if (!user || !user.workshopId) return [];

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabaseAdmin = await createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      id, subject, description, status, created_at,
      creator:user_profiles!created_by (name),
      workshop:workshops (name)
    `)
    .eq('workshop_id', user.workshopId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workshop tickets:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    subject: t.subject,
    description: t.description,
    status: t.status,
    createdAt: t.created_at,
    creatorName: t.creator?.name || 'Desconocido',
    workshopName: t.workshop?.name || 'Taller',
  }));
};

// Para que el Super Admin vea TODOS los tickets
export const getAllTicketsForAdmin = async () => {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      id, subject, description, status, created_at,
      workshop:workshops (name),
      creator:user_profiles!created_by (name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin tickets:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    subject: t.subject,
    description: t.description,
    status: t.status,
    createdAt: t.created_at,
    workshopName: t.workshop?.name || 'Taller Desconocido',
    creatorName: t.creator?.name || 'Desconocido',
  }));
};
