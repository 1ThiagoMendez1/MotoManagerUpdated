'use server';

import { workshopCache } from '@/lib/cache/redis';
import { createAdminClient, requireWorkshop } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';

export async function getAppointments() {
  const user = await requireWorkshop();
  return workshopCache.remember(user, 'appointments', {}, async () => {
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
    throw new Error('No se pudo cargar la agenda.');
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
  });
}

export async function updateAppointmentStatus(id: string, status: string) {
  const user = await requireWorkshop();
  const supabase = await createAdminClient();

  const updateData: any = { status };
  // if (status === 'confirmed') {
  //   updateData.accepted_by = user.userId;
  // }

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
          const { sendCitaConfirmadaNotification, checkAndUpdateWhatsAppLimit } = await import('@/lib/whatsapp');
          
          const canSend = await checkAndUpdateWhatsAppLimit(user.workshopId);
          if (canSend) {
            sendCitaConfirmadaNotification(
              phone,
              customerName || 'Cliente',
              workshopName,
              appointmentDate
            ).catch(err => console.error('Error sending WhatsApp appointment confirmation:', err));
          } else {
            console.warn('WhatsApp notification skipped for appointment confirmation (Limit reached)');
          }
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

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || 'Cliente';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  return { firstName, lastName };
}

export async function createAppointment(data: {
  plate: string;
  customerName: string;
  customerPhone?: string;
  notes: string;
  scheduledStart: string;
}) {
  try {
    const user = await requireWorkshop();
    const supabase = await createAdminClient();

    const normalizedPlate = data.plate.trim().toUpperCase();
    const cleanCustomerName = data.customerName.trim();
    let customerPhone = data.customerPhone?.trim() || null;

    if (!normalizedPlate) {
      return { success: false, message: 'La placa de la moto es requerida.' };
    }
    if (!cleanCustomerName) {
      return { success: false, message: 'El nombre de la persona es requerido.' };
    }

    // 1. Buscar si la motocicleta ya existe en la organización del taller
    const { data: existingMotos } = await supabase
      .from('motorcycles')
      .select('id, customer_id, customers(id, first_name, last_name, phone)')
      .ilike('license_plate', normalizedPlate)
      .eq('organization_id', user.workshopId);

    let customerId: string | null = null;
    let motorcycleId: string | null = null;

    const existingMoto = existingMotos && existingMotos.length > 0 ? existingMotos[0] : null;

    if (existingMoto) {
      motorcycleId = existingMoto.id;
      customerId = existingMoto.customer_id;
      const custObj = Array.isArray(existingMoto.customers) ? existingMoto.customers[0] : existingMoto.customers;
      if (!customerPhone && custObj?.phone) {
        customerPhone = custObj.phone;
      }
    } else {
      // 2. Buscar o crear el cliente
      const { firstName, lastName } = splitName(cleanCustomerName);
      
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('organization_id', user.workshopId)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName || '');

      const existingCustomer = existingCustomers && existingCustomers.length > 0 ? existingCustomers[0] : null;

      if (existingCustomer) {
        customerId = existingCustomer.id;
        if (!customerPhone && existingCustomer.phone) {
          customerPhone = existingCustomer.phone;
        }
      } else {
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({
            organization_id: user.workshopId,
            first_name: firstName,
            last_name: lastName,
            phone: customerPhone || null,
          })
          .select('id')
          .single();

        if (custErr || !newCustomer) {
          console.error('Error creando cliente para la cita:', custErr);
          return { success: false, message: `Error creando cliente: ${custErr?.message || 'Error desconocido'}` };
        }
        customerId = newCustomer.id;
      }

      // 3. Crear la motocicleta
      const { data: newMoto, error: motoErr } = await supabase
        .from('motorcycles')
        .insert({
          organization_id: user.workshopId,
          customer_id: customerId,
          license_plate: normalizedPlate,
          brand: 'General',
          model: 'Moto',
          model_year: new Date().getFullYear(),
        })
        .select('id')
        .single();

      if (motoErr || !newMoto) {
        console.error('Error creando motocicleta para la cita:', motoErr);
        return { success: false, message: `Error creando motocicleta: ${motoErr?.message || 'Error desconocido'}` };
      }
      motorcycleId = newMoto.id;
    }

    const endDate = new Date(data.scheduledStart);
    endDate.setHours(endDate.getHours() + 1);

    // 4. Insertar la cita (solo con los campos de la cita)
    const { error: insertErr } = await supabase
      .from('appointments')
      .insert({
        organization_id: user.workshopId,
        customer_id: customerId,
        motorcycle_id: motorcycleId,
        notes: data.notes,
        scheduled_start: data.scheduledStart,
        scheduled_end: endDate.toISOString(),
        status: 'confirmed',
        created_by: user.userId,
      });

    if (insertErr) {
      console.error('Error creando cita:', insertErr);
      return { success: false, message: `Error insertando en la base de datos: ${insertErr.message}` };
    }

    // 5. Preparar notificación WhatsApp
    let whatsappUrl: string | null = null;
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', user.workshopId)
      .single();
    const workshopName = orgData?.name || 'Taller Motos';

    const startDateObj = new Date(data.scheduledStart);
    const dateFormatted = startDateObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeFormatted = startDateObj.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (customerPhone) {
      try {
        const { sendCitaConfirmadaNotification, checkAndUpdateWhatsAppLimit } = await import('@/lib/whatsapp');
        const canSend = await checkAndUpdateWhatsAppLimit(user.workshopId);
        if (canSend) {
          sendCitaConfirmadaNotification(
            customerPhone,
            cleanCustomerName,
            workshopName,
            startDateObj
          ).catch(err => console.error('Error enviando WhatsApp API:', err));
        }
      } catch (waErr) {
        console.error('Error con módulo WhatsApp:', waErr);
      }

      const cleanPhone = customerPhone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
      const msgText = `Hola *${cleanCustomerName}*, tu cita para la moto con placa *${normalizedPlate}* ha sido programada con éxito en *${workshopName}*.\n\n📅 *Fecha:* ${dateFormatted}\n⏰ *Hora:* ${timeFormatted}\n🛠️ *Motivo:* ${data.notes}\n\n¡Te esperamos!`;
      whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msgText)}`;
    }

    revalidatePath('/appointments');
    revalidatePath('/dashboard');
    return {
      success: true,
      message: 'Cita programada exitosamente.',
      whatsappUrl,
    };
  } catch (err: any) {
    console.error('Unhandled error in createAppointment:', err);
    return { success: false, message: `Excepción no manejada: ${err.message}` };
  }
}
