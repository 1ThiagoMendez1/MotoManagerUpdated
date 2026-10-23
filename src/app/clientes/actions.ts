'use server';

import { createAdminClient } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
        name
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
