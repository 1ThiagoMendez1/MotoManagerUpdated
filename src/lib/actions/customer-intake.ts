'use server';

import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const confirmSchema = z.object({
  requestId: z.string().uuid(),
  plate: z.string().trim().transform(v => v.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{5,8}$/)),
  brand: z.string().trim().min(2).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
});

export async function confirmCustomerMotorcycle(formData: FormData) {
  const user = await requireWorkshop();
  if (!user.workshopId || !['owner','admin'].includes(user.role)) {
    return { error: 'Solo el propietario o administrador puede confirmar la moto.' };
  }
  const parsed = confirmSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Revisa placa, marca, modelo y año de la motocicleta.' };
  const { requestId, plate, brand, model, year } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('confirm_customer_intake', {
    p_request_id: requestId, p_plate: plate, p_brand: brand,
    p_model: model, p_year: year,
  });
  if (error) {
    console.warn('[qr-intake] Staff confirmation rejected:', error.code);
    return { error: error.code === '23505'
      ? 'La placa ya pertenece a otro cliente de este taller. Revisa antes de vincularla.'
      : 'No se pudo confirmar la moto. Comprueba los datos o recarga la bandeja.' };
  }
  revalidatePath('/customers/intake');
  revalidatePath('/customers');
  revalidatePath('/motorcycles');
  revalidatePath('/dashboard');
  return { success: true, motorcycleId: data };
}
