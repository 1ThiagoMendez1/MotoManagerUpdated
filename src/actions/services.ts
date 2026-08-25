'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ServiceItem {
  id: string;
  organization_id: string;
  code?: string;
  name: string;
  description?: string;
  default_duration_minutes?: number;
  default_price: number;
  tax_rate?: number;
  category?: string;
  status: string;
}

export async function getServices(organizationId: string): Promise<ServiceItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('service_catalog')
    .select('*')
    .eq('organization_id', organizationId)
    .neq('status', 'inactive')
    .order('name');

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  return data as ServiceItem[];
}

export async function createService(organizationId: string, payload: Partial<ServiceItem>): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('service_catalog')
    .insert({
      ...payload,
      organization_id: organizationId,
      status: 'active'
    });

  if (error) {
    console.error('Error creating service:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/services');
  return { success: true };
}

export async function updateService(id: string, organizationId: string, payload: Partial<ServiceItem>): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('service_catalog')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error updating service:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/services');
  return { success: true };
}

export async function deleteService(id: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('service_catalog')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error deleting service:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/services');
  return { success: true };
}

export async function importServicesBulk(organizationId: string, services: Partial<ServiceItem>[]): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createClient();
  
  const payload = services.map(s => ({
    ...s,
    organization_id: organizationId,
    status: 'active'
  }));

  const { error, count } = await supabase
    .from('service_catalog')
    .upsert(payload, { onConflict: 'organization_id,code', ignoreDuplicates: false })
    .select('id');

  if (error) {
    console.error('Error importing services bulk:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/services');
  return { success: true, count: count || payload.length };
}

export async function deleteServicesBulk(ids: string[], organizationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('service_catalog')
    .delete()
    .in('id', ids)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error deleting multiple services:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/services');
  return { success: true };
}
