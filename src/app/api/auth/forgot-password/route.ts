import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetNotification } from '@/lib/whatsapp';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function generateTempPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: Request) {
  try {
    const { email, phone } = await req.json();

    if (!email || !phone) {
      return NextResponse.json({ error: 'Correo electrónico y teléfono son requeridos.' }, { status: 400 });
    }

    // 1. Encontrar el usuario en public.user_profiles
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      console.error('Error finding user profile:', profileError);
      return NextResponse.json({ error: 'No se encontró un usuario con ese correo o los datos no coinciden.' }, { status: 404 });
    }

    // 2. Verificar que el teléfono coincida (quitando espacios y posibles prefijos para una comparación flexible)
    const normalizedInputPhone = phone.replace(/\D/g, '');
    const normalizedProfilePhone = (userProfile.phone || '').replace(/\D/g, '');
    
    // Check if the input phone is contained in the profile phone or vice versa, to handle +57 differences
    if (!normalizedProfilePhone || (!normalizedProfilePhone.includes(normalizedInputPhone) && !normalizedInputPhone.includes(normalizedProfilePhone))) {
      return NextResponse.json({ error: 'El número de teléfono no coincide con el registrado.' }, { status: 400 });
    }

    // 3. Generar nueva contraseña temporal
    const tempPassword = generateTempPassword(10);

    // 4. Actualizar contraseña en auth.users usando el Admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userProfile.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Error updating auth password:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la contraseña.' }, { status: 500 });
    }

    // 5. Marcar que requiere cambio de contraseña (intenta actualizar, ignora si la columna no existe aún)
    const { error: flagError } = await supabaseAdmin
      .from('user_profiles')
      .update({ requires_password_change: true })
      .eq('id', userProfile.id);

    if (flagError) {
      console.warn('Advertencia: no se pudo actualizar requires_password_change. Asegúrate de haber ejecutado el script SQL:', flagError);
      // No fallamos la operación si la columna no existe, ya que el usuario aún puede entrar con la clave temporal
    }

    // 6. Enviar notificación por WhatsApp
    const whatsappResult = await sendPasswordResetNotification(
      userProfile.phone,
      userProfile.name || 'Usuario',
      email,
      tempPassword
    );

    if (!whatsappResult.success) {
      console.error('Error enviando WhatsApp:', whatsappResult.error);
      return NextResponse.json({ 
        message: 'Contraseña restablecida, pero hubo un error enviando el mensaje de WhatsApp. Por favor contacte soporte.' 
      }, { status: 200 }); // Still returning 200 because the password WAS reset
    }

    return NextResponse.json({ message: 'Credenciales temporales enviadas por WhatsApp.' }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in forgot-password:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
