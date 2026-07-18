import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSubscriptionRenewalReminder, sendSubscriptionSuspendedNotification } from '@/lib/whatsapp';

export async function GET(request: Request) {
  // Configurar cliente Supabase con Service Role para acceso total
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
  );

  try {
    // Calcular fecha objetivo: Hoy + 2 días (ignorando hora, solo fecha)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    // ==========================================
    // 1. RECORDATORIOS DE RENOVACIÓN (2 DÍAS ANTES)
    // ==========================================

    // Buscar talleres activos que vencen en 2 días y NO tienen token de pago recurrente (pago manual)
    const { data: workshopsToRemind, error: remindError } = await supabaseAdmin
      .from('workshops')
      .select(`
        id,
        name,
        slug,
        subscription_status,
        wompi_payment_method_token,
        workshop_members!inner(
            user_id,
            role
        )
      `)
      .eq('subscription_status', 'active')
      .gte('next_billing_date', targetDateStart)
      .lte('next_billing_date', targetDateEnd)
      .is('wompi_payment_method_token', null) // Solo a los que pagan manual
      .eq('workshop_members.role', 'owner');

    if (remindError) {
      throw remindError;
    }

    const reminderResults = [];

    if (workshopsToRemind && workshopsToRemind.length > 0) {
      for (const workshop of workshopsToRemind) {
        // Obtener el user_id del dueño
        const ownerId = workshop.workshop_members?.[0]?.user_id;
        
        if (!ownerId) {
          reminderResults.push({ workshop: workshop.name, status: 'failed', reason: 'No owner found' });
          continue;
        }

        // Buscar los datos del usuario dueño
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(ownerId);

        if (userError || !userData?.user) {
          reminderResults.push({ workshop: workshop.name, status: 'failed', reason: 'Failed to fetch owner details' });
          continue;
        }

        const phone = userData.user.user_metadata?.phone;
        const fullName = userData.user.user_metadata?.full_name || 'Propietario';

        if (!phone) {
          reminderResults.push({ workshop: workshop.name, status: 'failed', reason: 'Owner has no phone number' });
          continue;
        }

        const paymentLink = `https://${workshop.slug}.motomanager.com.co/dashboard/subscription`;

        const waResult = await sendSubscriptionRenewalReminder(
          phone,
          fullName,
          workshop.name,
          paymentLink
        );

        if (waResult.success) {
          reminderResults.push({ workshop: workshop.name, status: 'success' });
        } else {
          reminderResults.push({ workshop: workshop.name, status: 'failed', reason: waResult.error });
        }
      }
    }

    // ==========================================
    // 2. SUSPENSIÓN DE TALLERES VENCIDOS
    // ==========================================
    
    // Obtener fecha de ayer (o inicio de hoy) para comparar si ya vencieron
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    const { data: workshopsToExpire, error: expireError } = await supabaseAdmin
      .from('workshops')
      .select(`
        id,
        name,
        slug,
        subscription_status,
        workshop_members!inner(
            user_id,
            role
        )
      `)
      .eq('subscription_status', 'active')
      .lt('next_billing_date', todayStartISO)
      .eq('workshop_members.role', 'owner');

    if (expireError) {
      throw expireError;
    }

    const suspensionResults = [];

    if (workshopsToExpire && workshopsToExpire.length > 0) {
      for (const workshop of workshopsToExpire) {
        
        // 1. Cambiar estado a 'past_due' (vencido/suspendido)
        const { error: updateError } = await supabaseAdmin
          .from('workshops')
          .update({ subscription_status: 'past_due' })
          .eq('id', workshop.id);

        if (updateError) {
          suspensionResults.push({ workshop: workshop.name, status: 'failed', reason: 'Failed to update status to past_due' });
          continue;
        }

        // 2. Notificar por WhatsApp
        const ownerId = workshop.workshop_members?.[0]?.user_id;
        
        if (ownerId) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ownerId);
          const phone = userData?.user?.user_metadata?.phone;
          const fullName = userData?.user?.user_metadata?.full_name || 'Propietario';

          if (phone) {
            const paymentLink = `https://${workshop.slug}.motomanager.com.co/dashboard/subscription`;
            
            const waResult = await sendSubscriptionSuspendedNotification(
              phone,
              fullName,
              workshop.name,
              paymentLink
            );

            if (waResult.success) {
              suspensionResults.push({ workshop: workshop.name, status: 'success (suspended and notified)' });
            } else {
              suspensionResults.push({ workshop: workshop.name, status: 'success (suspended, NO notification)', reason: waResult.error });
            }
          } else {
            suspensionResults.push({ workshop: workshop.name, status: 'success (suspended, NO phone)' });
          }
        } else {
           suspensionResults.push({ workshop: workshop.name, status: 'success (suspended, NO owner ID)' });
        }
      }
    }

    return NextResponse.json({ 
      message: 'Cron job executed successfully',
      reminders: { processed: workshopsToRemind?.length || 0, results: reminderResults },
      suspensions: { processed: workshopsToExpire?.length || 0, results: suspensionResults }
    });

  } catch (error: any) {
    console.error('Error processing subscription reminders cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
