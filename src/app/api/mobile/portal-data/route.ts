import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/managed-client';
import { createAdminClient } from '@/lib/supabase/admin';
import { eligibleCustomerLinks } from '@/lib/customer-portal-access';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
const deny = () => NextResponse.json({ error: 'No existe una vinculación de cliente activa para esta cuenta.' }, { status: 403, headers });

/** Mobile and web clients must use the same authorization model.
 * A customer.auth_user_id match alone is NOT a workshop membership. */
export async function GET(req: Request) {
  try {
    const raw = req.headers.get('authorization') || '';
    if (!/^Bearer [A-Za-z0-9._~-]+$/i.test(raw) || raw.length > 8192) {
      return NextResponse.json({ error: 'Falta la autorización' }, { status: 401, headers });
    }
    const token = raw.slice(7);
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: { user }, error: userError } = await verifier.auth.getUser(token);
    if (userError || !user?.email_confirmed_at) {
      return NextResponse.json({ error: 'Sesión inválida o no verificada' }, { status: 401, headers });
    }

    const admin = createAdminClient();
    const { data: links, error: linkError } = await admin
      .from('workshop_customer_accounts')
      .select('organization_id, customer_id')
      .eq('user_id', user.id)
      .limit(100);
    if (linkError || !links?.length) return deny();

    const orgIds = [...new Set(links.map(link => link.organization_id))];
    const { data: activeWorkshops, error: workshopError } = await admin
      .from('organizations').select('id').in('id', orgIds).eq('status', 'active');
    if (workshopError || !eligibleCustomerLinks(links, activeWorkshops || [])) return deny();

    const activeIds = new Set((activeWorkshops || []).map(org => org.id));
    const allowed = new Set(links.filter(link => activeIds.has(link.organization_id))
      .map(link => link.organization_id + ':' + link.customer_id));
    const customerIds = [...new Set(links.filter(link => activeIds.has(link.organization_id))
      .map(link => link.customer_id))];
    if (!customerIds.length) return deny();

    const [customerResult, motorcycleResult, workOrderResult, appointmentResult] = await Promise.all([
      admin.from('customers')
        .select('id, organization_id, first_name, last_name, phone, email')
        .in('id', customerIds).limit(100),
      admin.from('motorcycles')
        .select('id, organization_id, customer_id, brand, model, license_plate, year:model_year, organizations(name)')
        .in('customer_id', customerIds).in('organization_id', [...activeIds]).limit(200),
      admin.from('work_orders')
        .select('id, organization_id, customer_id, order_number, reported_symptoms, status, created_at, organizations(name), mechanic:profiles!work_orders_assigned_mechanic_id_fkey(first_name, last_name)')
        .in('customer_id', customerIds).in('organization_id', [...activeIds])
        .order('created_at', { ascending: false }).limit(200),
      admin.from('appointments')
        .select('id, organization_id, customer_id, scheduled_start, status, notes')
        .in('customer_id', customerIds).in('organization_id', [...activeIds])
        .order('scheduled_start', { ascending: false }).limit(200),
    ]);
    if (customerResult.error || motorcycleResult.error || workOrderResult.error || appointmentResult.error) {
      return NextResponse.json({ error: 'No se pudo cargar el garaje.' }, { status: 503, headers });
    }

    const customers = (customerResult.data || []).filter(row =>
      allowed.has(row.organization_id + ':' + row.id));
    if (!customers.length) return deny();
    const first = customers[0];
    const authorizedRows = <T extends { organization_id: string | null; customer_id: string | null }>(rows: T[] | null) =>
      (rows || []).filter(row => allowed.has(row.organization_id + ':' + row.customer_id))
        .map(({ organization_id: _org, customer_id: _customer, ...visible }) => visible);

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          name: [first.first_name, first.last_name].filter(Boolean).join(' '),
          phone: first.phone,
          email: first.email,
        },
        motorcycles: authorizedRows(motorcycleResult.data),
        workOrders: authorizedRows(workOrderResult.data),
        appointments: authorizedRows(appointmentResult.data),
      },
    }, { headers });
  } catch {
    return NextResponse.json({ error: 'Servicio temporalmente no disponible' }, { status: 503, headers });
  }
}
