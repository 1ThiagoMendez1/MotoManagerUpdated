'use server';

import { requireSuperAdmin } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

// Usamos el Service Role para tener permisos de escritura saltando el RLS público
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Plan Update
export async function updatePlan(id: string, formData: FormData) {
  await requireSuperAdmin();
  
  const name = formData.get('name') as string;
  const price = parseInt(formData.get('price') as string, 10);
  const description = formData.get('description') as string;
  const badge = formData.get('badge') as string;
  const savings = formData.get('savings') as string;

  const updateData = {
    name,
    price,
    amount_in_cents: price * 100, // assuming COP logic
    description,
    badge: badge || null,
    savings: savings || null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin
    .from('subscription_plans')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/planes');
  revalidatePath('/');
  return { success: true };
}

// Feature CRUD
export async function addFeature(formData: FormData) {
  await requireSuperAdmin();
  
  const feature_name = formData.get('feature_name') as string;
  const order_index = parseInt(formData.get('order_index') as string, 10) || 0;
  
  const { error } = await supabaseAdmin
    .from('subscription_features')
    .insert([{
      feature_name,
      order_index,
      included_in_monthly: formData.get('included_in_monthly') === 'on',
      included_in_biannual: formData.get('included_in_biannual') === 'on',
      included_in_yearly: formData.get('included_in_yearly') === 'on',
    }]);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin');
  revalidatePath('/planes');
  return { success: true };
}

export async function updateFeature(id: string, formData: FormData) {
  await requireSuperAdmin();
  
  const { error } = await supabaseAdmin
    .from('subscription_features')
    .update({
      feature_name: formData.get('feature_name') as string,
      order_index: parseInt(formData.get('order_index') as string, 10) || 0,
      included_in_monthly: formData.get('included_in_monthly') === 'on',
      included_in_biannual: formData.get('included_in_biannual') === 'on',
      included_in_yearly: formData.get('included_in_yearly') === 'on',
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin');
  revalidatePath('/planes');
  return { success: true };
}

export async function deleteFeature(id: string) {
  await requireSuperAdmin();
  
  const { error } = await supabaseAdmin
    .from('subscription_features')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin');
  revalidatePath('/planes');
  return { success: true };
}
