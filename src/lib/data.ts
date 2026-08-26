import { createClient } from '@/lib/supabase/server';
import { requireWorkshop } from '@/lib/auth-server';
import type { Customer, Motorcycle, Technician, InventoryItem, WorkOrder, Sale, Reminder } from './types';

const mapPaymentMethodToUi = (dbMethod: string | null | undefined): string => {
  if (!dbMethod) return 'Efectivo';
  const method = dbMethod.toLowerCase();
  if (method === 'cash') return 'Efectivo';
  if (method === 'credit_card' || method === 'debit_card') return 'Tarjeta';
  if (method === 'nequi') return 'Nequi';
  if (method === 'daviplata') return 'DaviPlata';
  if (method === 'transfer') return 'Transferencia';
  if (method === 'wompi') return 'Wompi';
  return dbMethod.charAt(0).toUpperCase() + dbMethod.slice(1);
};

export const getCustomers = async (params: { query?: string, page?: number, limit?: number } = {}): Promise<{ items: Customer[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  let q = supabase.from('customers')
    .select('*', { count: 'exact' })
    .eq('organization_id', user.workshopId)
    .order('created_at', { ascending: false });
  
  if (params.query) {
    q = q.or(`first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,document_number.ilike.%${params.query}%`);
  }

  const { data, count } = await q.range(offset, offset + limit - 1);
  
  if (!data) return { items: [], totalPages: 0 };
  
  const items = data.map((c: any) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
    email: c.email || '',
    phone: c.phone,
    cedula: c.document_number,
    isFrequent: false
  }));

  return { items, totalPages: Math.ceil((count || 0) / limit) };
};

export const getTechnicians = async (params: { page?: number, limit?: number } = {}): Promise<{ items: Technician[], totalPages: number }> => {
  const user = await requireWorkshop();
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  const { data, count } = await supabaseAdmin.from('organization_members')
    .select('role, user_id, profiles ( id, first_name, last_name, avatar_path, phone )', { count: 'exact' })
    .eq('organization_id', user.workshopId)
    .range(offset, offset + limit - 1);
  
  if (!data) return { items: [], totalPages: 0 };
  
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const usersMap = new Map();
  if (authData && authData.users) {
     authData.users.forEach(u => usersMap.set(u.id, u.email));
  }

  const allItems = data.map((m: any) => ({
    id: m.profiles?.id || m.user_id,
    name: `${m.profiles?.first_name || ''} ${m.profiles?.last_name || ''}`.trim() || 'Técnico',
    specialty: m.role === 'mechanic' ? 'Técnico' : (m.role === 'service_advisor' ? 'Recepcionista' : m.role),
    email: usersMap.get(m.user_id) || '',
    phone: m.profiles?.phone || '',
    avatarUrl: m.profiles?.avatar_path
  })).filter(t => t.id && (t.specialty === 'Técnico' || t.specialty === 'mechanic'));

  return { items: allItems, totalPages: Math.ceil((count || 0) / limit) };
};

export const getMotorcycles = async (params: { query?: string, page?: number, limit?: number } = {}): Promise<{ items: Motorcycle[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  let q = supabase.from('motorcycles')
    .select('*, customers(*)', { count: 'exact' })
    .eq('organization_id', user.workshopId)
    .order('created_at', { ascending: false });
    
  if (params.query) {
    q = q.or(`brand.ilike.%${params.query}%,model.ilike.%${params.query}%,license_plate.ilike.%${params.query}%`);
  }

  const { data, count } = await q.range(offset, offset + limit - 1);
  
  if (!data) return { items: [], totalPages: 0 };
  
  const items = data.map((m: any) => ({
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

  return { items, totalPages: Math.ceil((count || 0) / limit) };
};

export const getInventory = async (params: { query?: string, category?: string, page?: number, limit?: number } = {}): Promise<{ items: InventoryItem[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  let q = supabase.from('inventory_items')
    .select('*, inventory_item_stock(*, inventory_locations(*))', { count: 'exact' })
    .eq('organization_id', user.workshopId)
    .order('created_at', { ascending: false });

  if (params.category && params.category !== 'all') {
    q = q.eq('category', params.category);
  }

  if (params.query) {
    q = q.or(`name.ilike.%${params.query}%,code.ilike.%${params.query}%`);
  }

  const { data, count } = await q.range(offset, offset + limit - 1);
  if (!data) return { items: [], totalPages: 0 };
  
  const items: InventoryItem[] = data.map((i: any) => {
    // Calculate total quantity across all locations
    const stockDetails = i.inventory_item_stock?.map((s: any) => ({
      locationId: s.location_id,
      locationName: s.inventory_locations?.name || 'Desconocida',
      quantity: Number(s.quantity) || 0,
      type: s.inventory_locations?.type || 'storefront'
    })) || [];
    
    // For older items that haven't been migrated, or if we fallback to i.quantity
    let totalQty = 0;
    if (i.track_inventory === false) {
       totalQty = 99999; // Direct purchase items have infinite stock conceptually
    } else {
       totalQty = stockDetails.length > 0 
        ? stockDetails.reduce((sum: number, s: any) => sum + s.quantity, 0)
        : (Number(i.quantity) || 0); // fallback for unmigrated
    }

    return {
      id: i.id,
      name: i.name,
      sku: i.code || i.id.substring(0,6),
      quantity: totalQty,
      price: Number(i.unit_price) || 0,
      minimumQuantity: i.min_quantity || 0,
      location: (() => {
        try {
          const parsed = JSON.parse(i.description || '{}');
          return parsed.location || '';
        } catch(e) {
          if (i.description && !i.description.startsWith('Proveedor:')) return i.description;
          return '';
        }
      })(),
      category: (i.category as any) || 'Repuestos',
      supplierPrice: Number(i.last_cost) || 0,
      supplier: (() => {
        try {
          const parsed = JSON.parse(i.description || '{}');
          return parsed.supplier || '';
        } catch(e) {
          if (i.description && i.description.startsWith('Proveedor:')) return i.description.replace('Proveedor: ', '').trim();
          return '';
        }
      })(),
      trackInventory: i.track_inventory !== false,
      lastCost: Number(i.last_cost) || 0,
      stockDetails
    };
  });
  return { items, totalPages: Math.ceil((count || 0) / limit) };
};

export const getWorkOrders = async (params: { query?: string, page?: number, statusFilter?: 'active' | 'completed', limit?: number } = {}): Promise<{ items: WorkOrder[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  let q = supabase.from('work_orders')
    .select('*, motorcycles(*), customers(*), sales(id, status), part_requests(id, status)', { count: 'exact' })
    .eq('organization_id', user.workshopId)
    .order('created_at', { ascending: false });

  if (user.role === 'mechanic') {
    q = q.eq('assigned_mechanic_id', user.userId);
  }

  if (params.statusFilter === 'active') {
    q = q.neq('status', 'delivered').neq('status', 'delivered_quote_rejected');
  } else if (params.statusFilter === 'completed') {
    q = q.in('status', ['delivered', 'delivered_quote_rejected']);
  }

  if (params.query) {
     q = q.or(`order_number.ilike.%${params.query}%`);
  }

  const { data, count } = await q.range(offset, offset + limit - 1);

  if (!data) return { items: [], totalPages: 0 };

  const { items: technicians } = await getTechnicians();

  const items: WorkOrder[] = data.map((wo: any) => {
    const hasCompletedSale = wo.sales && wo.sales.some((s: any) => s.status === 'paid');
    
    const pendingPartRequestsCount = wo.part_requests ? wo.part_requests.filter((pr: any) => pr.status === 'pending').length : 0;

    return {
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
            wo.status === 'delivered_quote_rejected' ? 'Moto entregada por cotización rechazada' :
            wo.status === 'received' ? 'Ingreso a revisión' :
            wo.status === 'diagnosis' ? 'Diagnosticando' :
            wo.status === 'completed' ? 'Reparado' :
            'Diagnosticando',
    quoteStatus: wo.quote_status === 'approved' ? 'Aprobada' : (wo.quote_status === 'rejected' ? 'Rechazada' : 'Pendiente'),
    quote_status: wo.quote_status,
    customerObservations: wo.customer_observations || '',
    pendingPartRequestsCount,
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
    };
  });

  return { items, totalPages: Math.ceil((count || 0) / limit) };
};

export const getWorkOrderById = async (id: string): Promise<WorkOrder | null> => {
  const user = await requireWorkshop();
  
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let query = supabaseAdmin.from('work_orders')
    .select('*, motorcycles(*, customers(*)), work_order_evidences(*), sales(*, created_by_profile:profiles!sales_created_by_fkey(first_name, last_name), sale_items(*, inventory_items(*))), work_order_services(*, service_catalog(*)), organizations(name)')
    .eq('id', id)
    .eq('organization_id', user.workshopId);

  if (user.role === 'mechanic') {
    query = query.eq('assigned_mechanic_id', user.userId);
  }

  const { data: _wo } = await query.single();

  const wo = _wo as any;

  if (!wo) return null;

  const { items: technicians } = await getTechnicians();

  let parsedDeposit = 0;
  let depositHistory: any[] = [];
  if (wo.sales && wo.sales.length > 0) {
      wo.sales.forEach((sale: any) => {
          if (sale.notes && sale.notes.includes('Abono de orden')) {
              parsedDeposit += Number(sale.total);
              depositHistory.push({
                  id: sale.id,
                  amount: sale.total,
                  method: sale.payment_method === 'cash' ? 'Efectivo' :
                          sale.payment_method === 'transfer' ? 'Transferencia' :
                          sale.payment_method === 'credit_card' ? 'Tarjeta' :
                          sale.payment_method === 'nequi' ? 'Nequi' :
                          sale.payment_method === 'daviplata' ? 'DaviPlata' :
                          sale.payment_method === 'wompi' ? 'Wompi' : 'Otros',
                  date: sale.created_at,
                  sale_number: sale.sale_number,
                  received_by: sale.created_by_profile ? `${sale.created_by_profile.first_name} ${sale.created_by_profile.last_name}`.trim() : 'Sistema'
              });
          }
      });
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
            wo.status === 'delivered_quote_rejected' ? 'Moto entregada por cotización rechazada' :
            wo.status === 'received' ? 'Ingreso a revisión' :
            wo.status === 'diagnosis' ? 'Diagnosticando' :
            wo.status === 'completed' ? 'Reparado' :
            'Diagnosticando',
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
    })) : [],
    work_order_services: wo.work_order_services ? wo.work_order_services.map((s: any) => ({
      id: s.id,
      service_id: s.service_id,
      description: s.description,
      quantity: s.quantity,
      unit_price: s.unit_price,
      total: s.total,
      service_catalog: s.service_catalog ? {
        id: s.service_catalog.id,
        name: s.service_catalog.name,
        category: s.service_catalog.category
      } : null
    })) : [],
    depositHistory: depositHistory
  };
};

export const getSales = async (params: { type?: string, limit?: number, query?: string, page?: number } = {}): Promise<{ items: Sale[], totalPages: number }> => {
  const user = await requireWorkshop();
  const supabase = await createClient();
  
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  let query = supabase.from('sales')
    .select('*, customers(*), sale_items(*, inventory_items(*)), work_orders(*, motorcycles(*, customers(*)))', { count: 'exact' })
    .eq('organization_id', user.workshopId)
    .not('sale_number', 'is', null);
    
  if (params.type === 'direct') {
    query = query.is('work_order_id', null);
  } else if (params.type === 'service') {
    query = (query as any).not('work_order_id', 'is', null);
  }

  if (params.query) {
    query = query.or(`sale_number.ilike.%${params.query}%`);
  }
  
  const [{ items: technicians }, { data, count }, orgResult] = await Promise.all([
    getTechnicians(),
    query.order('created_at', { ascending: false }).range(offset, offset + limit - 1),
    supabase.from('organizations').select('name').eq('id', user.workshopId).single()
  ]);

  const workshopName = orgResult.data?.name || 'MotoManager';

  if (!data) return { items: [], totalPages: 0 };

  const items: Sale[] = data.map((s: any) => {
    // Buscar mano de obra entre los sale_items
    const laborItem = s.sale_items?.find((si: any) => si.item_type === 'service');
    const laborCost = laborItem ? Number(laborItem.unit_price) : 0;

    const woRaw = s.work_orders;
    const woData = Array.isArray(woRaw) ? woRaw[0] : woRaw;

    // Parse deposit amount from work order's deposit_amount, customer_observations o de la venta
    let depositAmount = Number(woData?.deposit_amount) || Number(s.deposit_amount) || 0;
    
    if (depositAmount === 0 && woData?.customer_observations) {
      const match = woData.customer_observations.match(/Abono registrado:\s*(\d+(\.\d+)?)/);
      if (match) {
        depositAmount = parseFloat(match[1]);
      }
    }

    let workOrder = undefined;
    if (woData) {
      const mcRaw = woData.motorcycles;
      const mc = Array.isArray(mcRaw) ? mcRaw[0] : mcRaw;
      const custRaw = mc?.customers;
      const cust = Array.isArray(custRaw) ? custRaw[0] : custRaw;

      workOrder = {
        id: woData.id,
        workOrderNumber: `WO-${woData.order_number}`,
        issueDescription: woData.reported_symptoms,
        solutionDescription: woData.technical_diagnosis,
        status: woData.status === 'delivered' ? 'Entregado' : 
                woData.status === 'delivered_quote_rejected' ? 'Moto entregada por cotización rechazada' :
                woData.status === 'received' ? 'Ingreso a revisión' :
                woData.status === 'diagnosis' ? 'Diagnosticando' :
                woData.status === 'completed' ? 'Reparado' :
                'Diagnosticando',
        technician: technicians.find(t => t.id === woData.assigned_mechanic_id) || null,
        motorcycle: mc ? {
          id: mc.id,
          make: mc.brand || '',
          model: mc.model || '',
          year: mc.model_year || 0,
          plate: mc.license_plate || '',
          intakeDate: mc.created_at,
          customer: cust ? {
            id: cust.id,
            name: `${cust.first_name} ${cust.last_name}`,
            email: cust.email || '',
            phone: cust.phone,
            cedula: cust.document_number
          } : { id: '', name: 'Desconocido', email: '' }
        } : undefined
      } as any;
    }

    // Calcular porcentaje de descuento si existe
    const subtotal = Number(s.subtotal) || (Number(s.total) + (Number(s.discount_total) || 0));
    const totalItemsPrice = subtotal - laborCost;
    const discountTotal = Number(s.discount_total) || 0;
    let discountPercentage = 0;
    if (discountTotal > 0 && totalItemsPrice > 0) {
      discountPercentage = Math.round((discountTotal / totalItemsPrice) * 100);
    }

    const customerRaw = s.customers;
    const customerObj = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;

    return {
      id: s.id,
      saleNumber: `SALE-${s.sale_number || s.id.substring(0,6)}`,
      workOrderId: s.work_order_id,
      workOrder,
      depositAmount,
      customer: customerObj ? {
        id: customerObj.id,
        name: `${customerObj.first_name} ${customerObj.last_name}`,
        email: customerObj.email || '',
        phone: customerObj.phone,
        cedula: customerObj.document_number
      } : (workOrder?.motorcycle?.customer || undefined),
      customerName: customerObj 
        ? `${customerObj.first_name} ${customerObj.last_name}` 
        : (workOrder?.motorcycle?.customer?.name || 'Cliente de Mostrador'),
      workshopName,
      date: s.created_at,
      total: Number(s.total) || 0,
      subtotal,
      status: s.status,
      discountPercentage,
      discountTotal,
      laborCost,
      paymentMethod: mapPaymentMethodToUi(s.payment_method),
      items: s.sale_items?.map((si: any) => ({
          id: si.id,
          inventoryItemId: si.inventory_item_id || si.id,
          quantity: si.quantity,
          price: Number(si.unit_price),
          name: si.inventory_items?.name || si.description || 'Producto/Servicio',
          sku: si.inventory_items?.code || (si.item_type === 'service' ? 'SRV' : '-'),
          type: si.item_type
      })) || []
    };
  });

  return { items, totalPages: Math.ceil((count || 0) / limit) };
};

export const getSalesDataForChart = async () => {
    return []; // For now, mock
};

export const getRemindersByMotorcycleId = async (id: string): Promise<Reminder[]> => {
    return []; // For now, mock
};

export const getPurchases = async (organizationId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }
  return data || [];
};
