'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const newCustomerTicketSchema = z.object({
  customerIdentifier: z.string().min(1, "Debes ingresar tu Email o Cédula para identificarte"),
  subject: z.string().min(3, "El asunto debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  tenantSlug: z.string()
});

export async function submitCustomerTicket(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const validatedFields = newCustomerTicketSchema.safeParse({
    customerIdentifier: formData.get('customerIdentifier'),
    subject: formData.get('subject'),
    description: formData.get('description'),
    tenantSlug: formData.get('tenantSlug'),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { customerIdentifier, subject, description, tenantSlug } = validatedFields.data;

  // 1. Get workshop ID from slug
  // We need to bypass RLS here because the customer is not logged in.
  // Actually, we should use the service role key or a secure RPC to fetch workshop and validate customer
  // Since we don't want to expose customer data, we'll use supabaseAdmin
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: workshop } = await supabaseAdmin
    .from('workshops')
    .select('id')
    .eq('slug', tenantSlug)
    .single();

  if (!workshop) {
    return { message: 'Taller no encontrado.' };
  }

  // 2. Validate Customer by Email or Cedula
  const { data: customer } = await supabaseAdmin
    .from('clientes')
    .select('id')
    .eq('workshop_id', workshop.id)
    .or(`email.eq.${customerIdentifier},cedula.eq.${customerIdentifier}`)
    .maybeSingle();

  if (!customer) {
    return { message: 'No encontramos ningún cliente registrado con ese email o cédula en este taller. Por favor verifica tus datos o contacta al taller directamente.' };
  }

  // 3. Create Ticket
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .insert({
      workshop_id: workshop.id,
      customer_id: customer.id,
      subject,
      description,
      status: 'Abierto',
      priority: 'Media'
    })
    .select('id')
    .single();

  if (error || !ticket) {
    console.error('Error creating public ticket:', error);
    return { message: 'Ocurrió un error inesperado al enviar el ticket.' };
  }

  // Success. Redirect to the ticket view.
  redirect(`/${tenantSlug}/tickets/${ticket.id}`);
}
