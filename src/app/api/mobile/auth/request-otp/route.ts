import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/managed-client';
import { sendAccessCodeNotification } from '@/lib/whatsapp';
import { generateMobileCode, generateTemporaryPassword, hashMobileCode, normalizeMobilePhone } from '@/lib/mobile-otp';

export const dynamic = 'force-dynamic';

const genericSuccess = () => NextResponse.json({
  success: true,
  message: 'Si el número tiene una cuenta habilitada, recibirás un código por WhatsApp.',
});

export async function POST(req: Request) {
  try {
    const input = await req.json().catch(() => null);
    const cleanPhone = normalizeMobilePhone(input?.phone);
    if (!cleanPhone) return NextResponse.json({ error: 'Número inválido' }, { status: 400 });
    if (!process.env.MOBILE_OTP_PEPPER || process.env.MOBILE_OTP_PEPPER.length < 32) {
      return NextResponse.json({ error: 'Autenticación móvil temporalmente no disponible' }, { status: 503 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Control de reenvío ANTES de generar cuentas o códigos.
    const { data: cooldown, error: cooldownError } = await admin
      .from('mobile_otp_challenges')
      .select('resend_after')
      .eq('phone', cleanPhone)
      .maybeSingle();
    if (cooldownError) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    if (cooldown && new Date(cooldown.resend_after).getTime() > Date.now()) return genericSuccess();

    const { data: candidates, error: customerError } = await admin
      .from('customers')
      .select('id, first_name, last_name, phone, auth_user_id')
      .ilike('phone', '%' + cleanPhone.slice(-10) + '%')
      .limit(10);
    if (customerError || !candidates) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    const matches = candidates.filter(item => normalizeMobilePhone(item.phone) === cleanPhone);
    // Un número compartido por varios clientes debe resolverse con el taller;
    // nunca vincular arbitrariamente la primera ficha.
    if (matches.length !== 1) return genericSuccess();
    const customer = matches[0];

    const fakeEmail = cleanPhone + '@clientes.motomanager.com.co';
    let accountId: string | null = null;
    if (customer.auth_user_id) {
      const { data: account } = await admin.auth.admin.getUserById(customer.auth_user_id);
      // No rotar una cuenta de correo/QR real por medio del flujo móvil heredado.
      if (account?.user?.email?.toLowerCase() !== fakeEmail) return genericSuccess();
      accountId = account.user.id;
    } else {
      // Búsqueda paginada: listUsers() sin páginas omitía cuentas existentes.
      for (let page = 1; page <= 50 && !accountId; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
        const existing = data.users.find(item => item.email?.toLowerCase() === fakeEmail);
        if (existing) accountId = existing.id;
        if (data.users.length < 1000) break;
      }
      if (!accountId) {
        const { data, error } = await admin.auth.admin.createUser({
          email: fakeEmail,
          password: generateTemporaryPassword(),
          email_confirm: true,
          user_metadata: {
            name: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
          },
        });
        if (error || !data.user) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
        accountId = data.user.id;
      }
      const { error: bindError } = await admin.from('customers')
        .update({ auth_user_id: accountId })
        .eq('id', customer.id)
        .is('auth_user_id', null);
      if (bindError) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const otp = generateMobileCode();
    const { data: issued, error: issueError } = await admin.rpc('issue_mobile_otp', {
      p_phone: cleanPhone,
      p_auth_user: accountId,
      p_code_hash: hashMobileCode(cleanPhone, otp),
    });
    if (issueError) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    if (!issued) return genericSuccess();

    const result = await sendAccessCodeNotification(cleanPhone, otp);
    if (!result.success) return NextResponse.json({
      error: 'No se pudo entregar el código por WhatsApp. Intenta de nuevo más tarde.',
    }, { status: 503 });

    return genericSuccess();
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
