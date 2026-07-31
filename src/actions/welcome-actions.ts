'use server';



import { revalidatePath } from "next/cache";

export async function dismissWelcomeMessage() {
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
        .from('user_profiles')
        .update({ has_seen_welcome: true })
        .eq('id', user.id);

    revalidatePath('/');
}
