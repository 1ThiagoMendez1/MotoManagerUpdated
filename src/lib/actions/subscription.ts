'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';





import { revalidatePath } from 'next/cache'

export async function updateSubscriptionPlan(formData: FormData) {
    const user = await requireWorkshop()
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const newPlan = formData.get('plan') as string

    if (!['monthly', 'biannual', 'yearly'].includes(newPlan)) {
        return { error: 'Plan inválido' }
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (newPlan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else if (newPlan === 'biannual') endDate.setMonth(endDate.getMonth() + 6);
    else if (newPlan === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

    const { error } = await supabaseAdmin
        .from('workshops')
        .update({
            subscription_plan: newPlan,
            subscription_status: 'active',
            subscription_start_date: startDate.toISOString(),
            subscription_end_date: endDate.toISOString(),
        })
        .eq('id', user.workshopId)

    if (error) {
        return { error: 'Error al actualizar plan' }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}
