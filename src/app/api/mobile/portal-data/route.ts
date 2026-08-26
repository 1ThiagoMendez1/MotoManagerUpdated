import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Falta el token de autorización' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // Para verificar el token, usamos el cliente anónimo de Supabase
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }

    // Ahora buscamos la información del cliente con el Service Role (Admin)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar el customer asociado a este user.id
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('auth_user_id', user.id)
      .limit(1)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'No se encontró el perfil de cliente' }, { status: 404 });
    }

    // 2. Buscar sus motocicletas
    const { data: motorcycles } = await supabaseAdmin
      .from('motorcycles')
      .select(`
        id, brand, model, license_plate, year,
        organizations (name)
      `)
      .eq('customer_id', customer.id);

    // 3. Buscar sus órdenes de trabajo
    const { data: workOrders } = await supabaseAdmin
      .from('work_orders')
      .select(`
        id, order_number, reported_symptoms, status, created_at,
        organizations (name),
        mechanic:profiles!work_orders_assigned_mechanic_id_fkey (first_name, last_name)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    // 4. Buscar sus citas
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        id, scheduled_start, status, notes
      `)
      .eq('customer_id', customer.id)
      .order('scheduled_start', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          phone: customer.phone,
          email: customer.email,
        },
        motorcycles: motorcycles || [],
        workOrders: workOrders || [],
        appointments: appointments || []
      }
    });

  } catch (error: any) {
    console.error('Portal Data Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
