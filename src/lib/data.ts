import { createClient } from '@/lib/supabase/server';
import { requireWorkshop } from '@/lib/auth-server';
import type { Customer, Motorcycle, Technician, InventoryItem, WorkOrder, Sale, Reminder } from './types';

export const getCustomers = async (): Promise<Customer[]> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  const { data } = await supabase.from('customers').select('*').eq('organization_id', user.workshopId);
  if (!data) return [];
  return data.map((c: any) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
    email: c.email || '',
    phone: c.phone,
    cedula: c.document_number,
    isFrequent: false
  }));
};

export const getTechnicians = async (): Promise<Technician[]> => {
  const user = await requireWorkshop();
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabaseAdmin.from('organization_members')
    .select('role, user_id, profiles ( id, first_name, last_name, avatar_path, phone )')
    .eq('organization_id', user.workshopId);
  
  if (!data) return [];
  
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const usersMap = new Map();
  if (authData && authData.users) {
     authData.users.forEach(u => usersMap.set(u.id, u.email));
  }

  return data.map((m: any) => ({
    id: m.profiles?.id || m.user_id,
    name: `${m.profiles?.first_name || ''} ${m.profiles?.last_name || ''}`.trim() || 'Técnico',
    specialty: m.role === 'mechanic' ? 'Técnico' : (m.role === 'service_advisor' ? 'Recepcionista' : m.role),
    email: usersMap.get(m.user_id) || '',
    phone: m.profiles?.phone || '',
    avatarUrl: m.profiles?.avatar_path
  })).filter(t => t.id && (t.specialty === 'Técnico' || t.specialty === 'mechanic'));
};

export const getMotorcycles = async (): Promise<Motorcycle[]> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  const { data } = await supabase.from('motorcycles')
    .select('*, customers(*)')
    .eq('organization_id', user.workshopId);
  
  if (!data) return [];
  return data.map((m: any) => ({
    id: m.id,
    make: m.brand || '',
    model: m.model || '',
    year: m.model_year || 0,
    plate: m.license_plate || '',
    intakeDate: m.created_at,
    issueDescription: m.notes,
    customer: m.customers ? {
      id: m.customers.id,
      name: `${m.customers.first_name} ${m.customers.last_name}`,
      email: m.customers.email || '',
      phone: m.customers.phone,
      cedula: m.customers.document_number
    } : { id: '', name: 'Desconocido', email: '' }
  }));
};

export const getInventory = async (): Promise<{ items: InventoryItem[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  const { data } = await supabase.from('inventory_items').select('*').eq('organization_id', user.workshopId);
  if (!data) return { items: [], totalPages: 0 };
  
  const items: InventoryItem[] = data.map((i: any) => ({
    id: i.id,
    name: i.name,
    sku: i.code || i.id.substring(0,6),
    quantity: i.quantity,
    price: Number(i.unit_price) || 0,
    minimumQuantity: i.min_quantity || 0,
    location: i.description || '',
    category: (i.category as any) || 'Repuestos',
    supplierPrice: 0, // Not in DB yet
    supplier: '' // Not in DB yet
  }));
  return { items, totalPages: 1 };
};

export const getWorkOrders = async (): Promise<{ items: WorkOrder[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  const { data } = await supabase.from('work_orders')
    .select('*, motorcycles(*), customers(*)')
    .eq('organization_id', user.workshopId)
    .order('created_at', { ascending: false });

  if (!data) return { items: [], totalPages: 0 };

  const technicians = await getTechnicians();

  const items: WorkOrder[] = data.map((wo: any) => ({
    id: wo.id,
    workOrderNumber: `WO-${wo.order_number}`,
    motorcycle: wo.motorcycles ? {
      id: wo.motorcycles.id,
      make: wo.motorcycles.brand || '',
      model: wo.motorcycles.model || '',
      year: wo.motorcycles.model_year || 0,
      plate: wo.motorcycles.license_plate || '',
      intakeDate: wo.motorcycles.created_at,
      customer: wo.customers ? {
        id: wo.customers.id,
        name: `${wo.customers.first_name} ${wo.customers.last_name}`,
        email: wo.customers.email || '',
        phone: wo.customers.phone,
        cedula: wo.customers.document_number
      } : { id: '', name: 'Desconocido', email: '' }
    } : null as any,
    technician: technicians.find(t => t.id === wo.assigned_mechanic_id) || null,
    issueDescription: wo.reported_symptoms,
    solutionDescription: wo.technical_diagnosis,
    createdDate: wo.created_at,
    status: wo.status === 'delivered' ? 'Entregado' : 
            wo.status === 'received' ? 'Ingreso a revisión' :
            wo.status === 'diagnosis' ? 'Diagnosticando' : 
            'Reparado',
    quoteStatus: wo.quote_status === 'approved' ? 'Aprobada' : (wo.quote_status === 'rejected' ? 'Rechazada' : 'Pendiente'),
    quote_status: wo.quote_status,
    customerObservations: wo.customer_observations || '',
    depositAmount: (() => {
      let parsed = 0;
      if (wo.customer_observations) {
          const match = wo.customer_observations.match(/Abono registrado:\s*(\d+(\.\d+)?)/);
          if (match) {
              parsed = parseFloat(match[1]);
          }
      }
      return parsed;
    })()
  }));

  return { items, totalPages: 1 };
};

export const getWorkOrderById = async (id: string): Promise<WorkOrder | null> => {
  const user = await requireWorkshop();
  
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: _wo } = await supabaseAdmin.from('work_orders')
    .select('*, motorcycles(*, customers(*)), work_order_evidences(*), sales(*, sale_items(*, inventory_items(*))), organizations(name)')
    .eq('id', id)
    .eq('organization_id', user.workshopId)
    .single();

  const wo = _wo as any;

  if (!wo) return null;

  const technicians = await getTechnicians();

  let parsedDeposit = 0;
  if (wo.customer_observations) {
      const match = wo.customer_observations.match(/Abono registrado:\s*(\d+(\.\d+)?)/);
      if (match) {
          parsedDeposit = parseFloat(match[1]);
      }
  }

  return {
    id: wo.id,
    organizationId: user.workshopId,
    workshop: wo.organizations ? { name: wo.organizations.name } : null,
    workOrderNumber: `WO-${wo.order_number}`,
    motorcycle: wo.motorcycles ? {
      id: wo.motorcycles.id,
      make: wo.motorcycles.brand || '',
      model: wo.motorcycles.model || '',
      year: wo.motorcycles.model_year || 0,
      plate: wo.motorcycles.license_plate || '',
      intakeDate: wo.motorcycles.created_at,
      customer: wo.motorcycles.customers ? {
        id: wo.motorcycles.customers.id,
        name: `${wo.motorcycles.customers.first_name} ${wo.motorcycles.customers.last_name}`,
        email: wo.motorcycles.customers.email || '',
        phone: wo.motorcycles.customers.phone,
        cedula: wo.motorcycles.customers.document_number
      } : { id: '', name: 'Desconocido', email: '' }
    } : null as any,
    technician: technicians.find(t => t.id === wo.assigned_mechanic_id) || null,
    issueDescription: wo.reported_symptoms,
    solutionDescription: wo.technical_diagnosis,
    createdDate: wo.created_at,
    status: wo.status === 'delivered' ? 'Entregado' : 
            wo.status === 'received' ? 'Ingreso a revisión' :
            wo.status === 'diagnosis' ? 'Diagnosticando' : 
            'Reparado',
    quoteStatus: wo.quote_status === 'approved' ? 'Aprobada' : (wo.quote_status === 'rejected' ? 'Rechazada' : 'Pendiente'),
    quote_status: wo.quote_status,
    customerObservations: wo.customer_observations || '',
    depositAmount: parsedDeposit,
    images: wo.work_order_evidences ? wo.work_order_evidences.map((e: any) => ({
        id: e.id,
        imageUrl: e.image_url,
        description: e.description,
        createdAt: e.created_at
    })) : [],
    sales: wo.sales ? wo.sales.map((s: any) => ({
        id: s.id,
        saleItems: s.sale_items ? s.sale_items.map((si: any) => ({
            id: si.id,
            quantity: si.quantity,
            price: si.unit_price,
            inventoryItem: si.inventory_items ? {
                id: si.inventory_items.id,
                name: si.inventory_items.name
            } : { id: '', name: 'Desconocido' }
        })) : []
    })) : []
  };
};

export const getSales = async (params: any = {}): Promise<{ items: Sale[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  
  let query = supabase.from('sales')
    .select('*, customers(*), sale_items(*), work_orders(customer_observations)')
    .eq('organization_id', user.workshopId)
    .neq('status', 'pending');
    
  if (params.type === 'direct') {
    query = query.is('work_order_id', null);
  } else if (params.type === 'service') {
    query = query.not('work_order_id', 'is', null);
  }
  
  const { data } = await query
    .order('created_at', { ascending: false })
    .limit(params.limit || 1000);

  if (!data) return { items: [], totalPages: 0 };

  const items: Sale[] = data.map((s: any) => {
    // Parse deposit amount from work order's customer_observations
    let depositAmount = 0;
    const woData = s.work_orders;
    if (woData?.customer_observations) {
      const match = woData.customer_observations.match(/Abono registrado:\s*(\d+(\.\d+)?)/);
      if (match) {
        depositAmount = parseFloat(match[1]);
      }
    }

    return {
      id: s.id,
      saleNumber: `SALE-${s.sale_number || s.id.substring(0,6)}`,
      workOrderId: s.work_order_id,
      depositAmount,
      customer: s.customers ? {
        id: s.customers.id,
        name: `${s.customers.first_name} ${s.customers.last_name}`,
        email: s.customers.email || ''
      } : undefined,
      customerName: s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : 'Cliente de Mostrador',
      date: s.created_at,
      total: Number(s.total) || 0,
      paymentMethod: s.payment_method || 'efectivo',
      items: s.sale_items?.map((si: any) => ({
          id: si.id,
          inventoryItemId: si.inventory_item_id,
          quantity: si.quantity,
          price: Number(si.unit_price)
      })) || []
    };
  });

  return { items, totalPages: 1 };
};

export const getSalesDataForChart = async () => {
    return []; // For now, mock
};

export const getRemindersByMotorcycleId = async (id: string): Promise<Reminder[]> => {
    return []; // For now, mock
};
