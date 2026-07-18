import { createClient } from '@/lib/supabase/server';
import type { Customer, Motorcycle, Technician, InventoryItem, WorkOrder, Sale, Reminder } from './types';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { getCurrentUserServer } from './auth-server';

// Helper to get supabase client with workshop scope
async function getScopedClient() {
  const user = await getCurrentUserServer();
  const supabase = await createClient();
  if (!user || !user.workshopId) {
    return { supabase, workshopId: null, user: null };
  }
  return { supabase, workshopId: user.workshopId, user };
}

// --- CUSTOMERS ---
export const getCustomers = async (): Promise<Customer[]> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return [];

  const { data } = await supabase
    .from('clientes')
    .select('id, name, email, phone, cedula, is_frequent')
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    cedula: c.cedula,
    isFrequent: c.is_frequent || false,
  }));
};

// --- TECHNICIANS ---
export const getTechnicians = async (): Promise<Technician[]> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return [];

  try {
    // --- Auto-sync mechanics from workshop_members to tecnicos_activos ---
    // Use admin client to ensure we can read profiles and members regardless of RLS
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: members } = await supabaseAdmin
      .from('workshop_members')
      .select(`
        role,
        user_profiles (name)
      `)
      .eq('workshop_id', workshopId);

    if (members && members.length > 0) {
      const { data: existingTechs } = await supabaseAdmin
        .from('tecnicos_activos')
        .select('id, name, is_active')
        .eq('workshop_id', workshopId);

      const existingMap = new Map(existingTechs?.map((t: any) => [t.name, t]) || []);

      const mechanics = new Set(
        members
          .filter((m: any) => m.role === 'mechanic' || m.role === 'Técnico')
          .map((m: any) => m.user_profiles?.name)
          .filter(Boolean)
      );

      const toInsert: any[] = [];
      const toUpdateActive: string[] = [];
      const toUpdateInactive: string[] = [];

      mechanics.forEach((mechName: any) => {
        const existing = existingMap.get(mechName);
        if (!existing) {
          toInsert.push({ workshop_id: workshopId, name: mechName, is_active: true });
        } else if (!existing.is_active) {
          toUpdateActive.push(existing.id);
        }
      });

      existingMap.forEach((tech, name) => {
        if (!mechanics.has(name) && tech.is_active) {
          toUpdateInactive.push(tech.id);
        }
      });

      if (toInsert.length > 0) {
        await supabaseAdmin.from('tecnicos_activos').insert(toInsert);
      }
      if (toUpdateActive.length > 0) {
        await supabaseAdmin.from('tecnicos_activos').update({ is_active: true }).in('id', toUpdateActive);
      }
      if (toUpdateInactive.length > 0) {
        await supabaseAdmin.from('tecnicos_activos').update({ is_active: false }).in('id', toUpdateInactive);
      }
    }
  } catch (syncError) {
    console.error('Error in auto-sync technicians:', syncError);
  }

  const { data: technicians } = await supabase
    .from('tecnicos_activos')
    .select(`
      id, name, specialty, avatar_url,
      work_orders (
        id, work_order_number, issue_description, status, created_at, completed_at,
        motorcycle:motorcycles (
          id, make, model, year, plate, created_at,
          customer:clientes (id, name, email, phone)
        )
      )
    `)
    .eq('workshop_id', workshopId)
    .eq('is_active', true)
    .order('created_at', { ascending: true }); // Prefer older ones when deduplicating

  // Deduplicate before returning and delete duplicates from DB
  const uniqueTechnicians: any[] = [];
  const seenNames = new Set<string>();
  const duplicateIdsToDelete: string[] = [];

  for (const tech of (technicians || [])) {
    if (seenNames.has(tech.name)) {
      duplicateIdsToDelete.push(tech.id);
    } else {
      seenNames.add(tech.name);
      uniqueTechnicians.push(tech);
    }
  }

  if (duplicateIdsToDelete.length > 0) {
    // Delete duplicates in the background
    import('@supabase/supabase-js').then(({ createClient }) => {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      adminClient.from('tecnicos_activos').delete().in('id', duplicateIdsToDelete).then(({ error }) => {
        if (error) console.error('Failed to clean duplicate technicians', error);
      });
    });
  }

  return uniqueTechnicians.map((tech: any) => ({
    id: tech.id,
    name: tech.name,
    specialty: tech.specialty || '',
    avatarUrl: tech.avatar_url,
    workOrders: (tech.work_orders || []).map((wo: any) => ({
      id: wo.id,
      workOrderNumber: wo.work_order_number?.toString() || wo.id, // Handle if serial or just ID
      motorcycle: {
        id: wo.motorcycle.id,
        make: wo.motorcycle.make,
        model: wo.motorcycle.model,
        year: wo.motorcycle.year,
        plate: wo.motorcycle.plate,
        intakeDate: wo.motorcycle.created_at,
        customer: wo.motorcycle.customer,
      },
      technician: {
        id: tech.id,
        name: tech.name,
        specialty: tech.specialty,
      },
      issueDescription: wo.issue_description,
      createdDate: wo.created_at,
      completedDate: wo.completed_at,
      status: wo.status as 'Diagnosticando' | 'Reparado' | 'Entregado',
    })),
  }));
};

// --- MOTORCYCLES ---
export const getMotorcycles = async ({ query }: { query?: string } = {}): Promise<Motorcycle[]> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return [];

  let queryBuilder = supabase
    .from('motorcycles')
    .select(`
      id, make, model, year, plate, created_at, notes,
      customer:clientes (id, name, email, phone, cedula, is_frequent)
    `)
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });

  if (query) {
    // Supabase search is limited. Use 'or' with care.
    // Searching across relations (customer.name) is hard in one go without flattened view.
    // For now, let's search on motorcycle fields directly.
    queryBuilder = queryBuilder.or(`make.ilike.%${query}%,model.ilike.%${query}%,plate.ilike.%${query}%`);
    // Note: This won't filter by customer name easily in basic Supabase syntax.
    // We'd need to use !inner join or filter in JS.
    // For MVP, filtering by motorcycle props is robust enough.
  }

  const { data } = await queryBuilder;

  return (data || []).map((m: any) => ({
    id: m.id,
    make: m.make,
    model: m.model,
    year: m.year,
    plate: m.plate,
    intakeDate: m.created_at,
    customer: {
      ...m.customer,
      isFrequent: m.customer?.is_frequent || false
    },
    issueDescription: m.notes, // Mapping notes to issueDescription as decided
  }));
};

// --- INVENTORY ---
export const getInventory = async ({ query, category, page = 1, limit = 10 }: { query?: string; category?: string; page?: number; limit?: number; }): Promise<{ items: InventoryItem[], totalPages: number }> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return { items: [], totalPages: 0 };

  let req = supabase
    .from('inventory_items')
    .select('*', { count: 'exact' })
    .eq('workshop_id', workshopId);

  if (query) {
    req = req.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
  }
  if (category && category !== 'all') {
    req = req.eq('category', category);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count } = await req.range(from, to);

  const totalPages = count ? Math.ceil(count / limit) : 0;

  const typedItems = (data || []).map((i: any) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    quantity: i.quantity,
    price: i.price,
    minimumQuantity: i.min_quantity, // Mapped column
    location: i.location,
    category: i.category,
    supplierPrice: i.cost, // Mapped column
    supplier: i.supplier,
  }));

  return { items: typedItems, totalPages };
};
// --- WORK ORDERS ---
export const getWorkOrders = async ({ query, page = 1, limit = 20 }: { query?: string; page?: number; limit?: number } = {}): Promise<{ items: WorkOrder[], totalPages: number }> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return { items: [], totalPages: 0 };

  let req = supabase
    .from('work_orders')
    .select(`
      id, work_order_number, issue_description, solution_description, deposit_amount, status, created_at, completed_at,
      motorcycle:motorcycles (
        id, make, model, year, plate, created_at,
        customer:clientes (id, name, email, phone)
      ),
      technician:tecnicos_activos (id, name, specialty)
    `, { count: 'exact' })
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });

  if (query) {
    // Basic search
    req = req.or(`work_order_number.ilike.%${query}%,issue_description.ilike.%${query}%`)
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count } = await req.range(from, to);

  const totalPages = count ? Math.ceil(count / limit) : 0;

  const typedItems = (data || []).map((wo: any) => ({
    id: wo.id,
    workOrderNumber: wo.work_order_number?.toString() || wo.id,
    motorcycle: {
      id: wo.motorcycle.id,
      make: wo.motorcycle.make,
      model: wo.motorcycle.model,
      year: wo.motorcycle.year,
      plate: wo.motorcycle.plate,
      intakeDate: wo.motorcycle.created_at,
      customer: wo.motorcycle.customer,
    },
    technician: wo.technician,
    issueDescription: wo.issue_description,
    solutionDescription: wo.solution_description,
    depositAmount: wo.deposit_amount || 0,
    createdDate: wo.created_at,
    completedDate: wo.completed_at,
    status: wo.status as 'Diagnosticando' | 'Reparado' | 'Entregado',
    // Missing dates like diagnosticandoDate... relying on created/completed for now or status
  }));

  return { items: typedItems, totalPages };
};

// --- WORK ORDER DETAILS ---
export const getWorkOrderById = async (id: string): Promise<WorkOrder | null> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return null;

  const { data: wo } = await supabase
    .from('work_orders')
    .select(`
      id, work_order_number, issue_description, solution_description, deposit_amount, status, created_at, completed_at,
      motorcycle:motorcycles (
        id, make, model, year, plate, created_at,
        customer:clientes (id, name, email, phone)
      ),
      technician:tecnicos_activos (id, name, specialty),
      sales (
        id, total, date,
        saleItems:sale_items (
          id, quantity, price,
          inventoryItem:inventory_items (id, name, sku)
        )
      )
    `)
    .eq('id', id)
    .eq('workshop_id', workshopId)
    .single();

  if (!wo) return null;

  return {
    id: wo.id,
    workOrderNumber: wo.work_order_number?.toString() || wo.id,
    motorcycle: {
      id: wo.motorcycle.id,
      make: wo.motorcycle.make,
      model: wo.motorcycle.model,
      year: wo.motorcycle.year,
      plate: wo.motorcycle.plate,
      intakeDate: wo.motorcycle.created_at,
      customer: wo.motorcycle.customer,
    },
    technician: wo.technician,
    issueDescription: wo.issue_description,
    solutionDescription: wo.solution_description,
    depositAmount: wo.deposit_amount || 0,
    createdDate: wo.created_at,
    completedDate: wo.completed_at,
    status: wo.status as 'Diagnosticando' | 'Reparado' | 'Entregado',
    sales: (wo.sales || []).map((s: any) => ({
      id: s.id,
      total: s.total,
      date: s.date,
      saleItems: (s.saleItems || []).map((si: any) => ({
        id: si.id,
        quantity: si.quantity,
        price: si.price,
        inventoryItem: si.inventoryItem
      }))
    }))
  };
};

// --- SALES ---
export const getSales = async ({ dateFrom, dateTo, type, page = 1, limit = 20 }: { dateFrom?: string; dateTo?: string; type?: 'direct' | 'service' | 'all'; page?: number; limit?: number; } = {}): Promise<{ items: Sale[], totalPages: number }> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return { items: [], totalPages: 0 };

  let req = supabase
    .from('sales')
    .select(`
      id, sale_number, total, payment_method, date, work_order_id, customer_id,
      work_order:work_orders (
         id, work_order_number, issue_description, created_at,
         motorcycle:motorcycles (
           id, make, model, year, plate, created_at,
           customer:clientes (id, name, email, phone)
         ),
         technician:tecnicos_activos (id, name, specialty)
      ),
      customer:clientes (id, name, email, phone),
      sale_items (
        id, quantity, price,
        inventory_item:inventory_items (id, name, sku)
      )
    `, { count: 'exact' })
    .eq('workshop_id', workshopId)
    .order('date', { ascending: false });

  // Date filters
  if (dateFrom) req = req.gte('date', dateFrom);
  if (dateTo) req = req.lte('date', dateTo);

  // Type filter
  if (type === 'direct') {
    req = req.is('work_order_id', null);
  } else if (type === 'service') {
    req = req.not('work_order_id', 'is', null);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count } = await req.range(from, to);
  const totalPages = count ? Math.ceil(count / limit) : 0;

  const typedItems = (data || []).map((s: any) => ({
    id: s.id,
    saleNumber: s.sale_number?.toString() || s.id,
    workOrderId: s.work_order_id,
    workOrder: s.work_order ? {
      id: s.work_order.id,
      workOrderNumber: s.work_order.work_order_number?.toString(),
      createdDate: s.work_order.created_at, // Added createdDate
      motorcycle: {
        ...s.work_order.motorcycle,
        intakeDate: s.work_order.motorcycle.created_at,
        customer: s.work_order.motorcycle.customer,
      },
      technician: s.work_order.technician,
      status: 'Entregado' as 'Entregado'
    } : undefined,
    customerId: s.customer_id,
    customer: s.customer || undefined,
    paymentMethod: s.payment_method,
    items: (s.sale_items || []).map((si: any) => ({
      id: si.id,
      inventoryItemId: si.inventory_item?.id,
      quantity: si.quantity,
      price: si.price,
      name: si.inventory_item?.name,
      sku: si.inventory_item?.sku,
    })),
    date: s.date,
    total: s.total,
  }));

  return { items: typedItems, totalPages };
};

// --- SALES CHART DATA ---
export const getSalesDataForChart = async () => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return [];

  const today = new Date();
  const sixMonthsAgo = subDays(today, 180);

  // Fetch all sales directly for last 6 months (aggregating in JS simpler than RPC for now)
  const { data } = await supabase
    .from('sales')
    .select('total, date')
    .eq('workshop_id', workshopId)
    .gte('date', sixMonthsAgo.toISOString());

  // Group by month
  const salesByMonth: Record<string, number> = {};

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = subDays(today, i * 30);
    const key = format(d, 'LLL');
    salesByMonth[key] = 0;
  }

  (data || []).forEach((sale: any) => {
    const key = format(new Date(sale.date), 'LLL');
    if (salesByMonth[key] !== undefined) {
      salesByMonth[key] += sale.total;
    }
  });

  return Object.entries(salesByMonth).map(([month, sales]) => ({
    month,
    sales
  }));
};

// --- REMINDERS ---
export const getRemindersByMotorcycleId = async (motorcycleId: string): Promise<Reminder[]> => {
  const { supabase, workshopId } = await getScopedClient();
  if (!workshopId) return [];

  const { data } = await supabase
    .from('reminders')
    .select('id, service_type, due_date, status, sent_at, created_at')
    .eq('workshop_id', workshopId)
    .eq('motorcycle_id', motorcycleId)
    .order('created_at', { ascending: false });

  return (data || []).map((r: any) => ({
    id: r.id,
    serviceType: r.service_type,
    dueDate: r.due_date,
    status: r.status,
    sentAt: r.sent_at,
    createdAt: r.created_at,
  }));
};
