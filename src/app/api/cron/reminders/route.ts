import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendTemplateReminderNotification } from '@/lib/whatsapp';
import { format } from 'date-fns';

// Configuración recomendada para Vercel Cron u otras llamadas automatizadas
export const dynamic = 'force-dynamic';
// export const maxDuration = 60; // Si estás en un plan Vercel pro, esto aumenta el tiempo máximo

export async function GET(request: Request) {
  try {
    // Validar autorización del cron (si se usa Vercel Cron, se usa un header especial)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();

    // Buscar recordatorios pendientes cuya fecha/hora de envío ya haya pasado o sea ahora
    const { data: reminders, error } = await supabaseAdmin
      .from('reminders')
      .select(`
        id,
        service_type,
        due_date,
        organization_id,
        customer_id,
        motorcycle_id,
        organizations ( name, address ),
        customers ( first_name, last_name, phone ),
        motorcycles ( brand, model, license_plate )
      `)
      .eq('status', 'pending')
      .lte('due_date', now)
      .limit(50); // Procesar en lotes de 50 para evitar timeouts

    if (error) {
      console.error('Error fetching due reminders:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending reminders to send.' });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of reminders) {
      try {
        const org = reminder.organizations as any;
        const customer = reminder.customers as any;
        const motorcycle = reminder.motorcycles as any;

        if (!org || !customer || !customer.phone || !motorcycle) {
          console.warn(`Recordatorio ${reminder.id} tiene datos incompletos.`);
          await supabaseAdmin.from('reminders').update({ status: 'error', notes: 'Datos incompletos' }).eq('id', reminder.id);
          errorCount++;
          continue;
        }

        const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Cliente';
        const motorcycleMakeModel = `${motorcycle.brand || ''} ${motorcycle.model || ''}`.trim() || 'Motocicleta';
        const motorcyclePlate = motorcycle.license_plate || 'Sin Placa';
        const workshopName = org.name || 'nuestro taller';
        const workshopAddress = org.address || 'Dirección no especificada';

        // Buscar la fecha de la última orden de trabajo para esta moto
        const { data: lastWo } = await supabaseAdmin
          .from('work_orders')
          .select('created_at')
          .eq('motorcycle_id', reminder.motorcycle_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastServiceDate = lastWo?.created_at ? format(new Date(lastWo.created_at), 'dd-MM-yyyy') : 'Fecha reciente';

        // Enviar mensaje
        const result = await sendTemplateReminderNotification(
          customer.phone,
          customerName,
          motorcycleMakeModel,
          motorcyclePlate,
          workshopName,
          lastServiceDate,
          reminder.service_type,
          workshopAddress
        );

        if (result.success) {
          await supabaseAdmin
            .from('reminders')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', reminder.id);
          sentCount++;
        } else {
          console.error(`Error enviando WhatsApp para recordatorio ${reminder.id}:`, result.error);
          // Opcional: si queremos que lo vuelva a intentar, lo dejamos en pending,
          // de lo contrario lo podemos marcar como error. Lo dejaremos pendiente o crearemos estado 'error'.
          errorCount++;
        }
      } catch (err) {
        console.error(`Excepción procesando recordatorio ${reminder.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Procesado: ${sentCount} enviados, ${errorCount} con errores.` 
    });
  } catch (error: any) {
    console.error('Error general en cron de recordatorios:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
