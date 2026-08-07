import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireWorkshop } from '@/lib/auth-server';

const getSupabaseAdmin = () => createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

const mapTicketData = (t: any) => ({
    ...t,
    createdAt: t.created_at,
    workshopName: t.organizations?.name || t.workshops?.name || t.organizations?.legal_name || 'Taller',
    customerName: t.customers?.name || t.clientes?.nombre || 'Cliente'
});

export const getWorkshopTickets = async () => {
    const user = await requireWorkshop();
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
        .from('tickets')
        .select(`
            *,
            organizations:workshop_id ( name )
        `)
        .eq('workshop_id', user.workshopId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching workshop tickets:', error);
        return [];
    }
    return (data || []).map(mapTicketData);
};

export const getAllTicketsForAdmin = async () => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('tickets')
        .select(`
            *,
            organizations:workshop_id ( name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all tickets for admin:', error.message, error.details, error.hint, error.code);
        return [];
    }
    return (data || []).map(mapTicketData);
};

export const getTicketById = async (id: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('tickets')
        .select(`
            *,
            organizations:workshop_id ( name )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching ticket by id:', error);
        return null;
    }
    return mapTicketData(data);
};

export const getPublicTicketById = async (id: string, tenant: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    
    let workshopId = null;
    const { data: orgData } = await supabaseAdmin
        .from('organizations') 
        .select('id')
        .eq('slug', tenant)
        .single();
    if (orgData) workshopId = orgData.id;

    if (!workshopId) {
        const { data: wsData } = await supabaseAdmin
            .from('workshops') 
            .select('id')
            .eq('slug', tenant)
            .single();
        if (wsData) workshopId = wsData.id;
    }

    if (!workshopId) return null;

    const { data, error } = await supabaseAdmin
        .from('tickets')
        .select(`
            *,
            organizations:workshop_id ( name )
        `)
        .eq('id', id)
        .eq('workshop_id', workshopId)
        .single();

    if (error) {
        console.error('Error fetching public ticket:', error);
        return null;
    }
    return mapTicketData(data);
};
