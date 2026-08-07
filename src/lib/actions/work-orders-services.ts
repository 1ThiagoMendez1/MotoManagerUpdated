'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addServiceToWorkOrder(workOrderId: string, serviceId: string, quantity: number = 1) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get service details to get the current unit_price
  const { data: service, error: serviceError } = await supabase
    .from('service_catalog')
    .select('*')
    .eq('id', serviceId)
    .single();

  if (serviceError || !service) {
    return { success: false, error: 'Service not found' };
  }

  const unit_price = service.default_price || 0;
  const total = unit_price * quantity;

  const { error } = await supabase
    .from('work_order_services')
    .insert({
      work_order_id: workOrderId,
      service_id: serviceId,
      description: service.name,
      quantity,
      unit_price,
      total,
      status: 'pending'
    });

  if (error) {
    console.error('Error adding service to work order:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return { success: true };
}

export async function removeServiceFromWorkOrder(workOrderId: string, workOrderServiceId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('work_order_services')
    .delete()
    .eq('id', workOrderServiceId)
    .eq('work_order_id', workOrderId);

  if (error) {
    console.error('Error removing service from work order:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return { success: true };
}
