'use server';

import { createAdminClient } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';

/**
 * Fetches all customer data by license plate: motorcycle, customer info,
 * pending quotations (work orders with quote_status), and existing appointments.
 */
export async function getCustomerPortalData(licensePlate: string) {
  if (!licensePlate || licensePlate.trim().length < 2) {
    return { success: false, message: 'Placa inválida.' };
  }

  const supabase = await createAdminClient();
  const normalizedPlate = licensePlate.replace(/[\s-]/g, '').toUpperCase();

  // Find motorcycle by normalized plate
  const { data: motorcycles, error: motoError } = await supabase
    .from('motorcycles')
    .select(`
      id,
      brand,
      model,
      license_plate,
      customer_id,
      customers (
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .ilike('license_plate', `%${normalizedPlate}%`);

  if (motoError || !motorcycles || motorcycles.length === 0) {
    return { success: false, message: 'No se encontró ninguna motocicleta con esa placa.' };
  }

  // Find exact match by normalizing
  const motorcycle = motorcycles.find((m: any) => {
    const dbPlate = (m.license_plate || '').replace(/[\s-]/g, '').toUpperCase();
    return dbPlate === normalizedPlate;
  }) || motorcycles[0];

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
    .order('scheduled_start', { ascending: false });

  return {
    success: true,
    data: {
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
        createdAt: apt.created_at,
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

  const supabase = await createAdminClient();

  // Get the organization_id from the motorcycle
  const { data: moto } = await supabase
    .from('motorcycles')
    .select('organization_id')
    .eq('id', motorcycleId)
    .single();

  if (!moto) {
    return { success: false, message: 'Motocicleta no encontrada.' };
  }

  // Build scheduled_start from date + time
  const scheduledStart = new Date(`${date}T${time}:00`);
  // Default appointment duration: 1 hour
  const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);

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
    });

  if (insertError) {
    console.error('Error creating appointment:', insertError);
    return { success: false, message: 'Error al crear la cita. Intenta de nuevo.' };
  }

  revalidatePath('/clientes');
  return { success: true, message: 'Cita agendada exitosamente.' };
}
