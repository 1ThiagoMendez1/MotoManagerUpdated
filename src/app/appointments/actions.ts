'use server';

import { createAdminClient, requireWorkshop } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';

export async function getAppointments() {
  const user = await requireWorkshop();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      status,
      notes,
      reason,
      created_at,
      created_by,
      accepted_by,
      creator:profiles!created_by(id, first_name, last_name),
      acceptor:profiles!accepted_by(id, first_name, last_name),
      customers (
        id,
        first_name,
        last_name,
        email,
        phone,
        document_number
      ),
      motorcycles (
        id,
        brand,
        model,
        license_plate
      )
    `)
    .eq('organization_id', user.workshopId)
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return (data || []).map((apt: any) => ({
    id: apt.id,
    scheduledStart: apt.scheduled_start,
    scheduledEnd: apt.scheduled_end,
    status: apt.status,
    notes: apt.notes,
    reason: apt.reason,
    createdAt: apt.created_at,
    createdBy: apt.created_by,
    acceptedBy: apt.accepted_by,
    creatorName: apt.creator ? `${apt.creator.first_name || ''} ${apt.creator.last_name || ''}`.trim() : null,
    acceptorName: apt.acceptor ? `${apt.acceptor.first_name || ''} ${apt.acceptor.last_name || ''}`.trim() : null,
    customer: apt.customers ? {
      id: apt.customers.id,
      name: `${apt.customers.first_name || ''} ${apt.customers.last_name || ''}`.trim(),
      email: apt.customers.email,
      phone: apt.customers.phone,
      cedula: apt.customers.document_number,
    } : null,
    motorcycle: apt.motorcycles ? {
      id: apt.motorcycles.id,
      brand: apt.motorcycles.brand,
      model: apt.motorcycles.model,
      licensePlate: apt.motorcycles.license_plate,
    } : null,
  }));
}

export async function updateAppointmentStatus(id: string, status: string) {
  const user = await requireWorkshop();
  const supabase = await createAdminClient();

  const updateData: any = { status };
  if (status === 'confirmed') {
    updateData.accepted_by = user.userId;
  }

  const { error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', user.workshopId);

  if (error) {
    console.error('Error updating appointment status:', error);
    return { success: false, message: 'No se pudo actualizar el estado de la cita.' };
  }

  // Si la cita fue confirmada, enviar notificación de WhatsApp
  if (status === 'confirmed') {
    try {
      const { data: aptData, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          scheduled_start,
          customers (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('id', id)
        .single();

      if (aptData && !fetchError) {
        const customerObj = Array.isArray(aptData.customers) ? aptData.customers[0] : aptData.customers;
        const phone = customerObj?.phone;
        const customerName = `${customerObj?.first_name || ''} ${customerObj?.last_name || ''}`.trim();

        // Obtener el nombre del taller por el workshopId del usuario autenticado
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', user.workshopId)
          .single();
        const workshopName = orgData?.name || 'Aguilas Doradas';
        const appointmentDate = aptData.scheduled_start;

        if (phone) {
          console.log(`Sending appointment confirmation to ${phone} for workshop ${workshopName} on ${appointmentDate}`);
          const { sendCitaConfirmadaNotification } = await import('@/lib/whatsapp');
          sendCitaConfirmadaNotification(
            phone,
            customerName || 'Cliente',
            workshopName,
            appointmentDate
          ).catch(err => console.error('Error sending WhatsApp appointment confirmation:', err));
        } else {
          console.log('No phone found for appointment, skipping WhatsApp notification.');
        }
      } else {
        console.error('Error fetching appointment data for WhatsApp:', fetchError);
      }
    } catch (fetchErr) {
      console.error('Error fetching details for WhatsApp appointment confirmation:', fetchErr);
    }
  }

  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  return { success: true, message: 'Estado de la cita actualizado exitosamente.' };
}
