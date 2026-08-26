import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAccessCodeNotification } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Falta el número de teléfono' }, { status: 400 });
    }

    // Usamos el Service Role para tener permisos de administrador en Auth y Base de Datos
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Validar que el cliente exista en la base de datos
    // Como los números en DB pueden variar (con o sin indicativo), limpiamos el string
    const cleanPhone = phone.replace(/\D/g, '');
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name, phone')
      .filter('phone', 'ilike', `%${cleanPhone.slice(-10)}%`)
      .limit(1)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'No encontramos un cliente con este número' }, { status: 404 });
    }

    // 2. Generar OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos
    const fakeEmail = `${cleanPhone}@clientes.motomanager.com.co`;

    // 3. Buscar si el usuario ya existe en Supabase Auth
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error listUsers:', usersError);
      return NextResponse.json({ error: 'Error interno de autenticación' }, { status: 500 });
    }

    const existingUser = usersData.users.find(u => u.email === fakeEmail);

    if (existingUser) {
      // Actualizar metadata con el nuevo OTP
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: { ...existingUser.user_metadata, otp_code: otp, otp_expires: expiresAt }
      });
      // Asegurarnos de que el customer tenga el auth_user_id enlazado
      await supabaseAdmin.from('customers').update({ auth_user_id: existingUser.id }).eq('id', customer.id);
    } else {
      // Crear nuevo usuario
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: fakeEmail,
        password: 'TempPassword123!', // Se cambiará al verificar el OTP
        email_confirm: true,
        user_metadata: {
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          otp_code: otp,
          otp_expires: expiresAt
        }
      });

      if (createError) throw createError;

      // Enlazar con la tabla customers
      if (newUser.user) {
        await supabaseAdmin.from('customers').update({ auth_user_id: newUser.user.id }).eq('id', customer.id);
      }
    }

    // 4. Enviar WhatsApp usando la función existente
    const waResponse = await sendAccessCodeNotification(cleanPhone, otp);

    if (!waResponse.success) {
      console.error('Error enviando WA:', waResponse.error);
      return NextResponse.json({ error: 'No se pudo enviar el mensaje por WhatsApp' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP enviado' });

  } catch (error: any) {
    console.error('Request OTP Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
