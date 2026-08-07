'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';


import { revalidatePath } from 'next/cache'
import { z } from 'zod'


const ticketSchema = z.object({
    subject: z.string().min(3, "El asunto es requerido."),
    description: z.string().min(10, "La descripción debe tener al menos 10 caracteres.")
})

export async function createTicket(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;

    const validatedFields = ticketSchema.safeParse({
        subject: formData.get('subject'),
        description: formData.get('description')
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const { subject, description } = validatedFields.data

    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

    const { error } = await supabaseAdmin
        .from('tickets')
        .insert({
            workshop_id: user.workshopId,
            created_by: user.userId,
            subject,
            description,
            status: 'Pendiente'
        })

    if (error) {
        console.error('Error creating ticket:', error)
        return { message: 'Error al crear el ticket: ' + error.message }
    }

    revalidatePath('/tickets')
    return { success: true }
}

export async function addTicketMessage(prevState: any, formData: FormData) {
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
    
    const ticketId = formData.get('ticketId') as string;
    const text = formData.get('message') as string;
    const sender = formData.get('isCustomer') === 'true' ? 'user' : 'agent';
    const guideNumber = formData.get('guideNumber') as string || '';
    const isInternal = formData.get('isInternal') === 'true';

    if (!ticketId || !text) return { success: false, message: 'Faltan datos requeridos.' };

    const messagePayload = {
      text,
      sender,
      guide_number: guideNumber,
      isInternal,
      id: crypto.randomUUID()
    };

    const { error } = await supabaseAdmin
        .from('ticket_messages')
        .insert({
            ticket_id: ticketId,
            message: JSON.stringify(messagePayload),
            sender_id: null // Assuming handled by payload
        });

    if (error) {
        console.error('Error adding ticket message:', error);
        return { success: false, message: 'Error al enviar el mensaje.' };
    }

    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
}

export async function updateAdminTicketStatus(ticketId: string, newStatus: string) {
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

    const { error } = await supabaseAdmin
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)

    if (error) {
        console.error('Error updating ticket:', error)
        return { success: false, message: 'Error al actualizar el ticket.' }
    }

    // Insert a system event to log the status change
    const messagePayload = {
      type: 'event',
      text: `Estado cambiado a ${newStatus}`,
      sender: 'system',
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
    };

    await supabaseAdmin
        .from('ticket_messages')
        .insert({
            ticket_id: ticketId,
            message: JSON.stringify(messagePayload),
            sender_id: null
        });

    revalidatePath('/admin/tickets')
    return { success: true }
}

export async function replyToTicketAdmin(ticketId: string, message: string) {
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

    const messagePayload = {
      text: message,
      sender: 'agent',
      guide_number: '',
      isInternal: false,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
    };

    const { error } = await supabaseAdmin
        .from('ticket_messages')
        .insert({
            ticket_id: ticketId,
            message: JSON.stringify(messagePayload),
            sender_id: null // null implies it's from the super admin
        })

    if (error) {
        console.error('Error replying to ticket:', error)
        return { success: false, message: 'Error al enviar el mensaje.' }
    }

    revalidatePath('/admin/tickets')
    return { success: true }
}

export async function getTicketMessagesAdmin(ticketId: string) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .select(`
        id, message, created_at, sender_id
    `)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching admin ticket messages:', error);
    return [];
  }

    return data.map((m: any) => {
    let parsed = { text: m.message, sender: 'agent', guide_number: '', isInternal: false, type: 'message' };
    try {
      if (m.message.startsWith('{')) {
        parsed = JSON.parse(m.message);
      }
    } catch(e) {}

    return {
      id: m.id,
      message: parsed.text || m.message,
      createdAt: m.created_at,
      senderId: m.sender_id,
      senderName: parsed.sender === 'user' ? (m.sender?.name || 'Cliente') : parsed.sender === 'system' ? 'Sistema' : 'Admin',
      senderEmail: m.sender?.email || '',
      is_internal: parsed.isInternal || false,
      type: parsed.type || 'message',
      raw_json: parsed
    };
  });
}

export async function replyToTicketWorkshop(ticketId: string, message: string) {
    const user = await requireWorkshop();
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;

    // Verify ownership
    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('workshop_id', user.workshopId)
        .single();

    if (ticketError || !ticket) {
        return { success: false, message: 'Ticket no encontrado o no autorizado.' };
    }

    const messagePayload = {
      text: message,
      sender: 'agent',
      guide_number: '',
      isInternal: false,
      id: crypto.randomUUID()
    };

    const { error } = await supabase
        .from('ticket_messages')
        .insert({
            ticket_id: ticketId,
            message: JSON.stringify(messagePayload),
            sender_id: user.userId
        });

    if (error) {
        console.error('Error replying to ticket:', error);
        return { success: false, message: 'Error al enviar el mensaje.' };
    }

    revalidatePath('/tickets');
    return { success: true };
}

export async function getTicketMessagesWorkshop(ticketId: string) {
    const user = await requireWorkshop();
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;

    // Verify ownership
    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('workshop_id', user.workshopId)
        .single();

    if (ticketError || !ticket) {
        console.error('Error fetching ticket or unauthorized:', ticketError);
        return [];
    }

    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    const { data, error } = await supabaseAdmin
        .from('ticket_messages')
        .select(`
            id, message, created_at, sender_id
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching ticket messages:', error);
        return [];
    }

    return data.map((m: any) => {
        let parsed = { text: m.message, sender: 'agent', guide_number: '', isInternal: false };
        try {
          if (m.message.startsWith('{')) {
            parsed = JSON.parse(m.message);
          }
        } catch(e) {}

        return {
            id: m.id,
            message: parsed.text || m.message,
            createdAt: m.created_at,
            senderId: m.sender_id,
            senderName: parsed.sender === 'user' ? (m.sender?.name || 'Cliente') : 'Admin',
            senderEmail: m.sender?.email || '',
            is_internal: parsed.isInternal || false,
            raw_json: parsed
        };
    });
}

export async function updateTicketStatus(prevState: any, formData: FormData) {
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
    const id = formData.get('id') as string;
    let updateData: any = {};
    if (formData.has('status')) updateData.status = formData.get('status');
    if (formData.has('priority')) updateData.priority = formData.get('priority');
    if (formData.has('assignedTo')) updateData.assigned_to = formData.get('assignedTo');
    
    if (updateData.assigned_to === 'none') updateData.assigned_to = null;

    const { error } = await supabaseAdmin
        .from('tickets')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating ticket status:', error);
        return { success: false, message: 'Error al actualizar el ticket.' };
    }

    revalidatePath(`/tickets/${id}`);
    return { success: true };
}
