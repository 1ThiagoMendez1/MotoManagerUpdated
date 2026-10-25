'use server';

import { createAdminClient } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getOwnAvatarUrl } from './reputation-actions';

/** Solo clientes con correo confirmado; una placa o un ID nunca prueba titularidad. */
async function getVerifiedCustomerLinks() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email_confirmed_at) return null;
  const admin = await createAdminClient();
  const { data: links, error: linkError } = await admin
    .from('workshop_customer_accounts')
    .select('customer_id, organization_id')
    .eq('user_id', user.id);
  if (linkError || !links?.length) return null;
  return { userId: user.id, links, admin };
}


async function adminReviewLookup(admin: any, userId: string, orderIds: string[]) {
  return admin.from('customer_service_reviews')
    .select('work_order_id,rating,recommended,comment,publish_comment')
    .eq('reviewer_user_id', userId).in('work_order_id', orderIds).limit(100);
}

/**
 * Fetches all customer data by license plate: motorcycle, customer info,
 * pending quotations (work orders with quote_status), and existing appointments.
 */
export async function getCustomerPortalData(licensePlate: string) {
  if (!licensePlate || licensePlate.trim().length < 2) {
    return { success: false, message: 'Placa inválida.' };
  }

  const verified = await getVerifiedCustomerLinks();
  if (!verified) return { success: false, message: 'Para consultar datos privados, inicia sesión y verifica tu correo con el enlace de tu taller.' };
  const supabase = verified.admin;
  const normalizedPlate = licensePlate.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z0-9]{5,8}$/.test(normalizedPlate)) {
    return { success: false, message: 'Placa inválida.' };
  }
  const customerIds = Array.from(new Set(verified.links.map(link => link.customer_id)));

  // Find motorcycle by normalized plate
  const { data: motorcycles, error: motoError } = await supabase
    .from('motorcycles')
    .select(`
      id,
      brand,
      model,
      license_plate,
      organization_id,
      customer_id,
      customers (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      organizations (
        name,
        slug
      )
    `)
    .in('customer_id', customerIds)
    .limit(100);

  if (motoError || !motorcycles || motorcycles.length === 0) {
    return { success: false, message: 'No se encontró ninguna motocicleta con esa placa.' };
  }

  // Find exact match by normalizing
  const motorcycle = motorcycles.find((m: any) => {
    const dbPlate = (m.license_plate || '').replace(/[\s-]/g, '').toUpperCase();
    return dbPlate === normalizedPlate && verified.links.some(
      link => link.customer_id === m.customer_id && link.organization_id === m.organization_id
    );
  });
  if (!motorcycle) {
    return { success: false, message: 'No hay motocicletas vinculadas a tu cuenta con esa placa.' };
  }

  const customer = (motorcycle as any).customers;
  if (!customer) {
    return { success: false, message: 'No se encontró cliente asociado a esta motocicleta.' };
  }

  // Fetch work orders with quotations for this motorcycle
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select(`
      id,
      order_number,
      reported_symptoms,
      technical_diagnosis,
      quote_status,
      quote_responded_at,
      status,
      created_at,
      organizations (
        name
      ),
      mechanic:profiles!work_orders_assigned_mechanic_id_fkey (
        first_name,
        last_name
      )
    `)
    .eq('motorcycle_id', motorcycle.id)
    .eq('organization_id', (motorcycle as any).organization_id)
    .order('created_at', { ascending: false });

  const ids = (workOrders || []).map(item => item.id);
  const { data: reviews } = ids.length
    ? await adminReviewLookup(supabase, verified.userId, ids)
    : { data: [] as any[] };
  const reviewed = new Map<string, any>((reviews || []).map((review: any) => [review.work_order_id, review]));

  // Fetch appointments for this motorcycle
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      status,
      notes,
      created_at
    `)
    .eq('motorcycle_id', motorcycle.id)
    .eq('customer_id', customer.id)
    .eq('organization_id', (motorcycle as any).organization_id)
    .order('scheduled_start', { ascending: false });

  return {
    success: true,
    data: {
      workshopName: (motorcycle as any).organizations?.name || 'Portal del Cliente',
      workshopSlug: (motorcycle as any).organizations?.slug || '',
      avatarUrl: await getOwnAvatarUrl(),
      customer: {
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        email: customer.email,
        phone: customer.phone,
      },
      motorcycle: {
        id: motorcycle.id,
        brand: (motorcycle as any).brand,
        model: (motorcycle as any).model,
        year: null,
        licensePlate: (motorcycle as any).license_plate,
      },
      workOrders: (workOrders || []).map((wo: any) => ({
        id: wo.id,
        orderNumber: wo.order_number,
        reportedSymptoms: wo.reported_symptoms,
        technicalDiagnosis: wo.technical_diagnosis,
        quoteStatus: wo.quote_status,
        quoteRespondedAt: wo.quote_responded_at,
        status: wo.status,
        createdAt: wo.created_at,
        workshopName: wo.organizations?.name || 'Taller',
        mechanicName: wo.mechanic
          ? `${(wo.mechanic as any).first_name || ''} ${(wo.mechanic as any).last_name || ''}`.trim()
          : null,
        review: reviewed.has(wo.id) ? {
          rating: reviewed.get(wo.id).rating,
          recommended: reviewed.get(wo.id).recommended,
          comment: reviewed.get(wo.id).comment || '',
          publishComment: reviewed.get(wo.id).publish_comment === true,
        } : null,
      })),
      appointments: (appointments || []).map((apt: any) => ({
        id: apt.id,
        scheduledStart: apt.scheduled_start,
        scheduledEnd: apt.scheduled_end,
        status: apt.status,
        notes: apt.notes,
        createdAt: apt.created_at
      })),
    },
  };
}

/**
 * Creates a new appointment for a customer's motorcycle.
 */
export async function createCustomerAppointment(formData: FormData) {
  const motorcycleId = formData.get('motorcycleId') as string;
  const customerId = formData.get('customerId') as string;
  const serviceType = formData.get('serviceType') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;
  const notes = formData.get('notes') as string;

  if (!motorcycleId || !customerId || !serviceType || !date || !time) {
    return { success: false, message: 'Todos los campos son obligatorios.' };
  }

  const verified = await getVerifiedCustomerLinks();
  if (!verified) return { success: false, message: 'Debes verificar tu correo y vincular tu cuenta al taller.' };
  const supabase = verified.admin;

  const { data: moto } = await supabase
    .from('motorcycles')
    .select('organization_id, customer_id')
    .eq('id', motorcycleId)
    .eq('customer_id', customerId)
    .single();

  if (!moto || !verified.links.some(link =>
      link.organization_id === moto.organization_id && link.customer_id === customerId)) {
    return { success: false, message: 'No tienes permiso para agendar esta motocicleta.' };
  }

  if (!moto) {
    return { success: false, message: 'Motocicleta no encontrada.' };
  }

  // Build scheduled_start from date + time
  const scheduledStart = new Date(`${date}T${time}:00`);
  // Default appointment duration: 1 hour
  const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);

  const creatorId = verified.userId;

  const { error: insertError } = await supabase
    .from('appointments')
    .insert({
      organization_id: (moto as any).organization_id,
      customer_id: customerId,
      motorcycle_id: motorcycleId,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: 'pending',
      notes: serviceType + (notes ? ` — ${notes}` : ''),
      created_by: creatorId
    });

  if (insertError) {
    console.error('Error creating appointment:', insertError);
    return { success: false, message: 'Error al crear la cita. Intenta de nuevo.' };
  }

  revalidatePath('/clientes');
  return { success: true, message: 'Cita agendada exitosamente.' };
}

export async function cancelCustomerAppointment(appointmentId: string) {
  const verified = await getVerifiedCustomerLinks();
  if (!verified) return { success: false, message: 'Debes verificar tu cuenta.' };
  const supabase = verified.admin;

  // No se cancela una cita solo conociendo su UUID.
  const { data: appointment } = await supabase.from('appointments')
    .select('id, customer_id, organization_id, status')
    .eq('id', appointmentId)
    .single();
  if (!appointment || !verified.links.some(link =>
      link.customer_id === appointment.customer_id &&
      link.organization_id === appointment.organization_id)) {
    return { success: false, message: 'No tienes permiso para cancelar esta cita.' };
  }
  if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
    return { success: false, message: 'Esta cita ya no se puede cancelar.' };
  }

  const { error } = await supabase.from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('customer_id', appointment.customer_id)
    .eq('organization_id', appointment.organization_id)
    .in('status', ['pending', 'confirmed']);
  if (error) return { success: false, message: 'Error al cancelar la cita.' };
  revalidatePath('/clientes');
  return { success: true, message: 'Cita cancelada correctamente.' };
}


export type CustomerPortalOverview = {
  verified: boolean;
  avatarUrl?: string | null;
  workshops: Array<{ id: string; name: string }>;
  motorcycles: Array<{ id: string; brand: string; model: string; licensePlate: string; workshopName: string }>;
};

/** A verified customer's linked motorcycles, without asking them to retype plates.
 * Every returned pair must match a row in workshop_customer_accounts for auth.uid().
 */
export async function getCustomerPortalOverview(): Promise<CustomerPortalOverview> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const empty: CustomerPortalOverview = { verified: false, workshops: [], motorcycles: [] };
  if (authError || !user?.email_confirmed_at) return empty;

  const admin = await createAdminClient();
  const { data: links, error: linkError } = await admin
    .from('workshop_customer_accounts')
    .select('organization_id, customer_id')
    .eq('user_id', user.id)
    .limit(100);
  if (linkError) {
    console.error('[customer-overview] Failed to load account associations');
    return { ...empty, verified: true };
  }
  if (!links?.length) return { ...empty, verified: true, avatarUrl: await getOwnAvatarUrl() };

  const organizationIds = [...new Set(links.map(link => link.organization_id))];
  const customerIds = [...new Set(links.map(link => link.customer_id))];
  const [{ data: organizations, error: orgError }, { data: motorcycles, error: motoError }] = await Promise.all([
    admin.from('organizations').select('id, name').in('id', organizationIds).limit(100),
    admin.from('motorcycles').select('id, brand, model, license_plate, organization_id, customer_id')
      .in('customer_id', customerIds).limit(100),
  ]);
  if (orgError || motoError) {
    console.error('[customer-overview] Failed to load connected vehicles');
    return { ...empty, verified: true };
  }

  const workshopNames = new Map((organizations || []).map(org => [org.id, org.name]));
  // Restrict by BOTH IDs, not just the customer_id (which alone is insufficient in a multi-tenant app).
  const permittedPairs = new Set(links.map(link => link.organization_id + ':' + link.customer_id));
  const accessible = (motorcycles || []).filter(moto =>
    permittedPairs.has(moto.organization_id + ':' + moto.customer_id) &&
    workshopNames.has(moto.organization_id));
  return {
    verified: true,
    avatarUrl: await getOwnAvatarUrl(),
    workshops: (organizations || []).map(org => ({ id: org.id, name: org.name })),
    motorcycles: accessible.map(moto => ({
      id: moto.id, brand: moto.brand || '', model: moto.model || '',
      licensePlate: moto.license_plate || '',
      workshopName: workshopNames.get(moto.organization_id) || 'Mi taller',
    })),
  };
}
