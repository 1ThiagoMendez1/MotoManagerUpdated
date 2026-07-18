'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function dismissWelcomeMessage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
        .from('user_profiles')
        .update({ has_seen_welcome: true })
        .eq('id', user.id);

    revalidatePath('/');
}
