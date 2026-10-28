import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/managed-client';
import { generateTemporaryPassword, hashMobileCode, normalizeMobilePhone } from '@/lib/mobile-otp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const input = await req.json().catch(() => null);
    const phone = normalizeMobilePhone(input?.phone);
    const code = input?.code;
    if (!phone || typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    if (!process.env.MOBILE_OTP_PEPPER || process.env.MOBILE_OTP_PEPPER.length < 32) {
      return NextResponse.json({ error: 'Autenticación móvil temporalmente no disponible' }, { status: 503 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Consumo transaccional: máximo cinco intentos, cinco minutos y un solo uso.
    const { data: userId, error } = await admin.rpc('consume_mobile_otp', {
      p_phone: phone,
      p_code_hash: hashMobileCode(phone, code),
    });
    if (error) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    if (!userId) return NextResponse.json({ error: 'Código inválido o vencido' }, { status: 401 });

    const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
    const email = phone + '@clientes.motomanager.com.co';
    if (accountError || account.user?.email?.toLowerCase() !== email) {
      return NextResponse.json({ error: 'Cuenta móvil no disponible' }, { status: 403 });
    }

    const password = generateTemporaryPassword();
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: {
        ...(account.user.user_metadata || {}),
        otp_code: null,
        otp_expires: null,
      },
    });
    if (updateError) return NextResponse.json({ error: 'No se pudo completar el acceso' }, { status: 503 });

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: authData, error: signInError } = await client.auth.signInWithPassword({
      email, password,
    });
    if (signInError || !authData.session) {
      return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 503 });
    }
    return NextResponse.json({ success: true, session: authData.session });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
