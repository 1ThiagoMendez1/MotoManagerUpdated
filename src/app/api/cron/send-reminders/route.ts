import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMaintenanceReminderNotification } from '@/lib/whatsapp';

// Este endpoint debería ser llamado por un Cron Job (ej. Vercel Cron, GitHub Actions, etc.)
// Se recomienda protegerlo con un secreto en los headers para que no cualquiera pueda llamarlo.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // Basic security check (optional, but recommended)
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  // Usamos el Service Role Key para poder leer todos los reminders sin importar el RLS del usuario actual (porque el cron no tiene sesión)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const today = new Date().toISOString();

    // 1. Buscar recordatorios pendientes cuya fecha sea de hoy o anterior
    const { data: pendingReminders, error: fetchError } = await supabaseAdmin
      .from('reminders')
      .select(`
        id,
        service_type,
        clientes (name, phone),
        motorcycles (make, model, plate),
        workshops (name)
      `)
      .eq('status', 'pending')
      .lte('due_date', today);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return NextResponse.json({ message: 'No pending reminders for today' });
    }

    const results = [];

    // 2. Procesar cada recordatorio
    for (const reminder of pendingReminders) {
      const customer = reminder.clientes as any;
      const motorcycle = reminder.motorcycles as any;
      const workshop = reminder.workshops as any;

      if (!customer?.phone) {
        results.push({ id: reminder.id, status: 'failed', reason: 'No phone number' });
        continue;
      }

      // Enviar WhatsApp
      const waResult = await sendMaintenanceReminderNotification(
        customer.phone,
        customer.name,
        motorcycle.make,
        motorcycle.model,
        motorcycle.plate,
        reminder.service_type,
        workshop?.name
      );

      if (waResult.success) {
        // Actualizar estado a 'sent'
        await supabaseAdmin
          .from('reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id);
        
        results.push({ id: reminder.id, status: 'success' });
      } else {
        results.push({ id: reminder.id, status: 'failed', reason: waResult.error });
      }
    }

    return NextResponse.json({ 
      message: `Processed ${pendingReminders.length} reminders`,
      results
    });

  } catch (error: any) {
    console.error('Error processing reminders cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
