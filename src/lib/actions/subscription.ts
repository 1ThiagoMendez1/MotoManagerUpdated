'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';





import { revalidatePath } from 'next/cache'

export async function updateSubscriptionPlan(formData: FormData) {
    const user = await requireWorkshop();
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    const newPlan = (formData.get('plan') as string) || 'basic';
    const billingCycle = (formData.get('billingCycle') as string) || (formData.get('cycle') as string) || 'monthly';
    const paidAmount = Number(formData.get('paidAmount') || 0);

    const validPlans = ['basic', 'pro', 'full', 'monthly', 'biannual', 'yearly'];
    if (!validPlans.includes(newPlan)) {
        return { error: 'Plan inválido' };
    }

    const normalizedPlan = newPlan === 'monthly' ? 'basic' : newPlan;

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingCycle === 'biannual') {
        endDate.setMonth(endDate.getMonth() + 6);
    } else if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
        endDate.setMonth(endDate.getMonth() + 1);
    }

    // 1. Fetch current organization settings to merge
    const { data: currentOrg } = await supabaseAdmin
        .from('organizations')
        .select('settings')
        .eq('id', user.workshopId)
        .single();

    const currentSettings = currentOrg?.settings || {};
    const updatedSettings = {
        ...currentSettings,
        plan: normalizedPlan,
        billingCycle,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        demoStartDate: startDate.toISOString(),
        demoEndDate: endDate.toISOString(),
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        paidAmount,
        lastPaymentDate: startDate.toISOString(),
    };

    // Update organizations
    const { error: orgError } = await supabaseAdmin
        .from('organizations')
        .update({
            settings: updatedSettings,
            status: 'active'
        })
        .eq('id', user.workshopId);

    // Also update workshops if the table/view exists
    try {
        await supabaseAdmin
            .from('workshops')
            .update({
                subscription_plan: normalizedPlan,
                subscription_status: 'active',
                subscription_start_date: startDate.toISOString(),
                subscription_end_date: endDate.toISOString(),
            })
            .eq('id', user.workshopId);
    } catch (e) {
        console.warn('Could not update workshops table:', e);
    }

    if (orgError) {
        console.error('Error updating organization subscription:', orgError);
        return { error: 'Error al actualizar plan' };
    }

    revalidatePath('/', 'layout');
    revalidatePath('/dashboard/subscription');
    return { success: true };
}
