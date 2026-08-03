'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';



import { revalidatePath } from 'next/cache'
import { sendTemplateReminderNotification } from '@/lib/whatsapp';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


export async function getPendingReminders() {
  const user = await requireWorkshop();
  if (!user || !user.workshopId) return { success: false, error: 'No workshop selected' };
  const workshopId = user.workshopId;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('reminders')
    .select(`
      id,
      service_type,
      due_date,
      status,
      customers (first_name, last_name, phone),
      motorcycles (brand, model, license_plate)
    `)
    .eq('organization_id', workshopId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching pending reminders:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as any[] };
}

export async function createReminder(data: {
  customer_id: string;
  motorcycle_id: string;
  service_type: string;
  due_date: string; // Esperado en formato YYYY-MM-DD
}) {
  const user = await requireWorkshop();
  if (!user || !user.workshopId) return { success: false, error: 'No workshop selected' };
  const workshopId = user.workshopId;

  const supabase = await createAdminClient();

  // Aseguramos que la hora sea a las 10:00 AM (hora Colombia, UTC-5)
  // Si due_date viene como 'YYYY-MM-DD', agregamos la hora.
  const dateStr = data.due_date.includes('T') ? data.due_date : `${data.due_date}T10:00:00-05:00`;

  const { error } = await supabase
    .from('reminders')
    .insert([
      {
        organization_id: workshopId,
        customer_id: data.customer_id,
        motorcycle_id: data.motorcycle_id,
        service_type: data.service_type,
        due_date: new Date(dateStr).toISOString(),
        status: 'pending'
      }
    ]);

  if (error) {
    console.error('Error creating reminder:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function markReminderAsSent(reminderId: string) {
  const user = await requireWorkshop();
  if (!user || !user.workshopId) return { success: false, error: 'No workshop selected' };
  const workshopId = user.workshopId;

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('reminders')
    .update({ 
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', reminderId)
    .eq('organization_id', workshopId);

  if (error) {
    console.error('Error marking reminder as sent:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function addReminderFromWorkOrder(formData: FormData) {
  const user = await requireWorkshop();
  if (!user || !user.workshopId) return { success: false, error: 'No workshop selected' };
  const workshopId = user.workshopId;

  const supabase = await createAdminClient();

  const workOrderId = formData.get('workOrderId') as string;
  const serviceType = formData.get('serviceType') as string;
  const dueDate = formData.get('dueDate') as string; // Viene del input type="date" (YYYY-MM-DD)
  const dueTime = formData.get('dueTime') as string; // Viene del input type="time" (HH:mm)

  if (!workOrderId || !serviceType || !dueDate) {
    throw new Error('Faltan datos para crear el recordatorio');
  }

  // Obtenemos info de la orden, cliente y organización
  const { data: wo, error: fetchError } = await supabase
    .from('work_orders')
    .select('created_at, motorcycle_id, motorcycles ( customer_id, brand, model, license_plate )')
    .eq('id', workOrderId)
    .eq('organization_id', workshopId)
    .single();

  if (fetchError || !wo) {
    console.error('Error fetching work order:', fetchError);
    throw new Error('Orden de trabajo no encontrada');
  }

  const motorcycleId = wo.motorcycle_id;
  const customerId = (wo.motorcycles as any)?.customer_id;

  if (!motorcycleId || !customerId) {
    throw new Error('No se pudo determinar el cliente o motocicleta para el recordatorio');
  }

  // Combinamos fecha y hora indicadas (hora local Colombia UTC-5)
  const timeStr = dueTime || '10:00';
  const dateWithTime = new Date(`${dueDate}T${timeStr}:00-05:00`);

  const { error } = await supabase
    .from('reminders')
    .insert([
      {
        organization_id: workshopId,
        customer_id: customerId,
        motorcycle_id: motorcycleId,
        service_type: serviceType,
        due_date: dateWithTime.toISOString(),
        status: 'pending' // Queda pendiente para ser procesado por el Cron Job
      }
    ])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating reminder:', error);
    throw new Error(error.message);
  }

  revalidatePath('/work-orders/' + workOrderId);
  return { success: true };
}

