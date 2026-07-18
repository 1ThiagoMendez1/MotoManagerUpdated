import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    // We can update the password directly with the standard client since the user is logged in
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la contraseña.' }, { status: 500 });
    }

    // Now update requires_password_change flag in user_profiles
    // We might need admin privileges depending on RLS on user_profiles
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceRoleKey) {
      const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({ requires_password_change: false })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile flag:', profileError);
        // We don't fail the request if this fails, the password was changed successfully
      }
    }

    return NextResponse.json({ message: 'Contraseña actualizada exitosamente.' }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in change-password:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
