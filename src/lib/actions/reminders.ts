'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';



import { revalidatePath } from 'next/cache'


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
      clientes (name, phone),
      motorcycles (make, model, plate)
    `)
    .eq('workshop_id', workshopId)
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
        workshop_id: workshopId,
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
    .eq('workshop_id', workshopId);

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

  if (!workOrderId || !serviceType || !dueDate) {
    throw new Error('Faltan datos para crear el recordatorio');
  }

  // Obtenemos customer_id y motorcycle_id desde la orden de trabajo
  const { data: wo, error: fetchError } = await supabase
    .from('work_orders')
    .select('motorcycle_id, motorcycles ( customer_id )')
    .eq('id', workOrderId)
    .eq('workshop_id', workshopId)
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

  // Aseguramos que se guarde configurado para las 10:00 AM hora local (UTC-5 para Colombia)
  const dateWithTime = new Date(`${dueDate}T10:00:00-05:00`);

  const { error } = await supabase
    .from('reminders')
    .insert([
      {
        workshop_id: workshopId,
        customer_id: customerId,
        motorcycle_id: motorcycleId,
        service_type: serviceType,
        due_date: dateWithTime.toISOString(),
        status: 'pending'
      }
    ]);

  if (error) {
    console.error('Error creating reminder:', error);
    throw new Error(error.message);
  }

  revalidatePath('/work-orders/' + workOrderId);
  return { success: true };
}
