import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const fakeEmail = `${cleanPhone}@clientes.motomanager.com.co`;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar el usuario
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      return NextResponse.json({ error: 'Error interno de autenticación' }, { status: 500 });
    }

    const existingUser = usersData.users.find(u => u.email === fakeEmail);

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 2. Verificar el OTP
    const metadata = existingUser.user_metadata || {};
    const storedOtp = metadata.otp_code;
    const expiresAt = metadata.otp_expires;

    if (!storedOtp || storedOtp !== code) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
    }

    if (Date.now() > expiresAt) {
      return NextResponse.json({ error: 'El código ha expirado' }, { status: 401 });
    }

    // 3. OTP válido. Generar una contraseña fuerte aleatoria para este inicio de sesión
    // Esto asegura que nadie pueda entrar con email/password adivinándolo
    const secureRandomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'X1!';

    // Actualizamos la contraseña del usuario y borramos el OTP
    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: secureRandomPassword,
      user_metadata: { ...metadata, otp_code: null, otp_expires: null }
    });

    // 4. Iniciar sesión usando la nueva contraseña para obtener la sesión (Token JWT)
    // Para esto necesitamos un cliente normal (no admin)
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: fakeEmail,
      password: secureRandomPassword
    });

    if (authError || !authData.session) {
      console.error('Error signInWithPassword:', authError);
      return NextResponse.json({ error: 'Error generando la sesión' }, { status: 500 });
    }

    // Devolver la sesión a la aplicación móvil
    return NextResponse.json({
      success: true,
      session: authData.session
    });

  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
