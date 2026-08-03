'use server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const getSupabase = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};

export async function updatePlan(id: string, formData: FormData) {
    try {
        const supabase = getSupabase();
        const name = formData.get('name') as string;
        const price = formData.get('price') ? Number(formData.get('price')) : 0;
        const description = formData.get('description') as string;
        const badge = formData.get('badge') as string;
        const savings = formData.get('savings') as string;

        const { error } = await supabase.from('subscription_plans').update({
            name,
            price,
            description,
            badge,
            savings
        }).eq('id', id);

        if (error) return { success: false, error: error.message };
        
        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addFeature(formData: FormData) {
    try {
        const supabase = getSupabase();
        const feature_name = formData.get('feature_name') as string;
        const order_index = formData.get('order_index') ? Number(formData.get('order_index')) : 0;
        const included_in_basic = formData.get('included_in_basic') as string || 'No';
        const included_in_pro = formData.get('included_in_pro') as string || 'No';
        const included_in_full = formData.get('included_in_full') as string || 'No';

        const { error } = await supabase.from('subscription_features').insert({
            feature_name,
            order_index,
            included_in_basic,
            included_in_pro,
            included_in_full
        });

        if (error) return { success: false, error: error.message };
        
        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateFeature(id: string, formData: FormData) {
    try {
        const supabase = getSupabase();
        const feature_name = formData.get('feature_name') as string;
        const order_index = formData.get('order_index') ? Number(formData.get('order_index')) : 0;
        const included_in_basic = formData.get('included_in_basic') as string || 'No';
        const included_in_pro = formData.get('included_in_pro') as string || 'No';
        const included_in_full = formData.get('included_in_full') as string || 'No';

        const { error } = await supabase.from('subscription_features').update({
            feature_name,
            order_index,
            included_in_basic,
            included_in_pro,
            included_in_full
        }).eq('id', id);

        if (error) return { success: false, error: error.message };
        
        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteFeature(id: string) {
    try {
        const supabase = getSupabase();
        const { error } = await supabase.from('subscription_features').delete().eq('id', id);
        
        if (error) return { success: false, error: error.message };
        
        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

