'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

// Tipos para las ventas por categoría
export interface CategorySaleSummary {
  category: string;
  total: number;
}

export async function getSalesByCategory(organizationId: string, startDate?: string, endDate?: string): Promise<CategorySaleSummary[]> {
  const supabase = await createClient();

  // We will build a raw query or use multiple queries and aggregate in JS
  // Fetch sale items linked to inventory and services
  let query = supabase
    .from('sale_items')
    .select(`
      total,
      item_type,
      sales!inner (
        organization_id,
        status,
        created_at
      ),
      inventory_items (
        category
      ),
      service_catalog (
        category
      )
    `)
    .eq('sales.organization_id', organizationId)
    .eq('sales.status', 'paid');

  if (startDate) {
    query = query.gte('sales.created_at', startDate);
  }
  if (endDate) {
    query = query.lte('sales.created_at', endDate);
  }

  const { data: saleItems, error: saleError } = await query;

  if (saleError) {
    console.error('Error fetching sales by category:', saleError);
    return [];
  }

  // Also fetch work_order_services (if they represent separate revenue not in sales, or if they are billed via sales. Assuming billed via sales based on the DB schema, but we can aggregate direct work_order_services just in case, or as requested for specialized workshop).
  // For the sake of this dashboard, let's aggregate saleItems first.
  const categoryTotals: Record<string, number> = {};

  saleItems?.forEach((item: any) => {
    let category = 'Otros';
    
    if (item.item_type === 'inventory' && item.inventory_items?.category) {
      category = item.inventory_items.category;
    } else if (item.item_type === 'service' && item.service_catalog?.category) {
      category = item.service_catalog.category;
    }

    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }
    categoryTotals[category] += Number(item.total);
  });

  const result: CategorySaleSummary[] = Object.keys(categoryTotals).map(key => ({
    category: key,
    total: categoryTotals[key]
  }));

  // Sort by total descending
  return result.sort((a, b) => b.total - a.total);
}

export async function getSalesByPaymentMethod(organizationId: string, startDate?: string, endDate?: string): Promise<{ method: string; total: number }[]> {
  const supabase = await createClient();
  let query = supabase
    .from('sales')
    .select('payment_method, total')
    .eq('organization_id', organizationId)
    .eq('status', 'paid');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching sales by payment method:', error);
    return [];
  }

  const methodTotals: Record<string, number> = {};
  data?.forEach((sale: any) => {
    const method = sale.payment_method || 'other';
    if (!methodTotals[method]) {
      methodTotals[method] = 0;
    }
    methodTotals[method] += Number(sale.total);
  });

  const uiMethods: Record<string, string> = {
    'cash': 'Efectivo',
    'credit_card': 'Tarjeta de Crédito',
    'debit_card': 'Tarjeta de Débito',
    'transfer': 'Transferencia Bancaria',
    'nequi': 'Nequi',
    'daviplata': 'DaviPlata',
    'wompi': 'Wompi',
    'other': 'Otro'
  };

  const result = Object.keys(methodTotals).map(key => ({
    method: uiMethods[key] || key,
    total: methodTotals[key]
  }));

  return result.sort((a, b) => b.total - a.total);
}

export interface TechnicianWorkSummary {
  id: string; // work order service id
  work_order_id: string;
  service_name: string;
  total: number;
  created_at: string;
}

export async function getTechnicianWork(
  organizationId: string, 
  technicianId: string, 
  startDate?: string, 
  endDate?: string
): Promise<TechnicianWorkSummary[]> {
  const supabase = await createClient();

  // The technician is assigned to the work_order.
  // Their completed work translates to sale_items of type 'service' on the paid sale.
  let query = supabase
    .from('sale_items')
    .select(`
      id,
      description,
      total,
      sales!inner (
        created_at,
        status,
        work_orders!inner (
          id,
          assigned_mechanic_id,
          organization_id
        )
      )
    `)
    .eq('item_type', 'service')
    .eq('sales.status', 'paid')
    .eq('sales.work_orders.assigned_mechanic_id', technicianId)
    .eq('sales.work_orders.organization_id', organizationId);

  if (startDate) {
    query = query.gte('sales.created_at', startDate);
  }
  if (endDate) {
    query = query.lte('sales.created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching technician work:', error);
    return [];
  }

  return (data || []).map((item: any) => {
    // Extract data from the nested relations
    let saleDate = item.sales?.created_at || new Date().toISOString();
    let workOrderId = item.sales?.work_orders?.id || '';

    // Handle array case if inner join returns array in Supabase JS client
    if (Array.isArray(item.sales)) {
      if (item.sales.length > 0) {
        saleDate = item.sales[0].created_at;
        workOrderId = item.sales[0].work_orders?.id || (Array.isArray(item.sales[0].work_orders) ? item.sales[0].work_orders[0]?.id : '');
      }
    } else if (item.sales && Array.isArray(item.sales.work_orders)) {
      workOrderId = item.sales.work_orders[0]?.id || '';
    }

    return {
      id: item.id,
      work_order_id: workOrderId,
      service_name: item.description || 'Servicio',
      total: Number(item.total),
      created_at: saleDate
    };
  });
}

export async function registerPayrollPayment(
  organizationId: string,
  technicianId: string,
  periodStart: string,
  periodEnd: string,
  totalServicesAmount: number,
  commissionPercentage: number,
  totalPaid: number
) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('payroll_payments')
    .insert({
      organization_id: organizationId,
      technician_id: technicianId,
      period_start: periodStart,
      period_end: periodEnd,
      total_services_amount: totalServicesAmount,
      commission_percentage: commissionPercentage,
      total_paid: totalPaid,
      status: 'paid'
    })
    .select()
    .single();

  if (error) {
    console.error('Error registering payroll payment:', error);
    throw new Error('No se pudo registrar el pago de nómina.');
  }

  revalidatePath('/accounting');
  return data;
}

export interface PayrollPaymentSummary {
  id: string;
  technician_id: string;
  technician_name: string;
  period_start: string;
  period_end: string;
  total_services_amount: number;
  commission_percentage: number;
  total_paid: number;
  created_at: string;
}

export async function getPayrollHistory(organizationId: string): Promise<PayrollPaymentSummary[]> {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('payroll_payments')
    .select(`
      *,
      profiles!payroll_payments_technician_id_fkey (
        first_name,
        last_name
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payroll history:', error);
    return [];
  }

  return data.map((p: any) => {
    const profile = p.profiles || {};
    return {
      id: p.id,
      technician_id: p.technician_id,
      technician_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Técnico',
      period_start: p.period_start,
      period_end: p.period_end,
      total_services_amount: Number(p.total_services_amount),
      commission_percentage: Number(p.commission_percentage),
      total_paid: Number(p.total_paid),
      created_at: p.created_at
    };
  });
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function getOrganizationTechnicians(organizationId: string) {
  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        user_id,
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .eq('role', 'mechanic');

    if (error) {
      console.error('Error fetching technicians:', error);
      return [];
    }

    return (data || []).map((m: any) => {
      const profile = m.profiles || {};
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      return {
        id: m.user_id,
        name: name || 'Usuario Sin Nombre'
      };
    });
  } catch (error) {
    console.error('Exception fetching technicians:', error);
    return [];
  }
}

export async function addExpense(
  organizationId: string,
  category: string,
  description: string,
  amount: number,
  date?: string,
  paymentMethod?: string
) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      organization_id: organizationId,
      category,
      description,
      amount,
      date: date || new Date().toISOString(),
      payment_method: paymentMethod || 'Efectivo',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding expense:', error);
    throw new Error(`No se pudo registrar el gasto: ${error.message}`);
  }

  revalidatePath('/accounting');
  return data;
}

export async function getExpenses(organizationId: string, startDate?: string, endDate?: string) {
  noStore();
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let query = supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('organization_id', organizationId)
    .order('date', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return data;
}

export interface DailyClosingSummary {
  totalIncome: number;
  totalExpenses: number;
  incomeByCategory: CategorySaleSummary[];
  incomeByPaymentMethod: { method: string; total: number }[];
  expensesByCategory: { category: string; total: number }[];
  technicianSummary: { name: string; totalServices: number; totalAmount: number }[];
  pendingOrdersCount: number;
  detailedExpenses: { id: string; category: string; description: string; amount: number; payment_method: string }[];
  cashBases: { id: string; amount: number; description: string; type: string }[];
  totalCashBase: number;
}

export async function getDailyClosingSummary(
  organizationId: string, 
  date: string,
  clientStartIso?: string,
  clientEndIso?: string
): Promise<DailyClosingSummary> {
  noStore();
  // Query sales
  let startIso, endIso;
  
  if (clientStartIso && clientEndIso) {
    startIso = clientStartIso;
    endIso = clientEndIso;
  } else {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    startIso = startDate.toISOString();

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    endIso = endDate.toISOString();
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [incomeByCategory, incomeByPaymentMethod, expenses, technicians, { data: payrollData }] = await Promise.all([
    getSalesByCategory(organizationId, startIso, endIso),
    getSalesByPaymentMethod(organizationId, startIso, endIso),
    getExpenses(organizationId, startIso, endIso),
    getOrganizationTechnicians(organizationId),
    supabaseAdmin
      .from('payroll_payments')
      .select('id, total_paid, created_at, profiles(first_name, last_name)')
      .eq('organization_id', organizationId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .eq('status', 'paid')
  ]);

  // Aggregate expenses
  const expenseTotals: Record<string, number> = {};
  let totalExpenses = 0;
  expenses.forEach(exp => {
    if (!expenseTotals[exp.category]) {
      expenseTotals[exp.category] = 0;
    }
    expenseTotals[exp.category] += Number(exp.amount);
    totalExpenses += Number(exp.amount);
  });

  const detailedExpenses = expenses.map(exp => ({
    id: exp.id,
    category: exp.category,
    description: exp.description,
    amount: Number(exp.amount),
    payment_method: exp.payment_method || 'Efectivo'
  }));

  // Add payroll payments to expenses
  if (payrollData) {
    payrollData.forEach((payment: any) => {
      const cat = 'Nómina de Técnicos';
      if (!expenseTotals[cat]) {
        expenseTotals[cat] = 0;
      }
      const amount = Number(payment.total_paid);
      expenseTotals[cat] += amount;
      totalExpenses += amount;
      
      const techName = payment.profiles ? `${payment.profiles.first_name} ${payment.profiles.last_name}` : 'Técnico';
      
      detailedExpenses.push({
        id: payment.id,
        category: cat,
        description: `Pago de comisiones a ${techName}`,
        amount: amount,
        payment_method: 'Efectivo'
      });
    });
  }

  const expensesByCategory = Object.keys(expenseTotals).map(key => ({
    category: key,
    total: expenseTotals[key]
  })).sort((a, b) => b.total - a.total);

  // Total income based on payment methods (this is the actual money received)
  const totalIncome = incomeByPaymentMethod.reduce((sum, method) => sum + method.total, 0);

  // Fetch discounts to adjust incomeByCategory
  const { data: salesForDiscount } = await supabaseAdmin
    .from('sales')
    .select('discount_total')
    .eq('organization_id', organizationId)
    .eq('status', 'paid')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const totalDiscount = salesForDiscount?.reduce((sum, sale) => sum + Number(sale.discount_total || 0), 0) || 0;

  if (totalDiscount > 0) {
      incomeByCategory.push({
          category: 'Descuentos',
          total: -totalDiscount
      });
  }

  // For tech work, we query sale_items linked to paid sales in this date range,
  // where the sale is linked to a work order assigned to a mechanic, and item_type = 'service'.
  const { data: allWork } = await supabaseAdmin
    .from('sale_items')
    .select(`
      total,
      sales!inner (
        status,
        created_at,
        work_orders!inner (
          organization_id,
          assigned_mechanic_id
        )
      )
    `)
    .eq('item_type', 'service')
    .eq('sales.status', 'paid')
    .eq('sales.work_orders.organization_id', organizationId)
    .gte('sales.created_at', startIso)
    .lte('sales.created_at', endIso);

  const techWorkTotals: Record<string, { count: number; total: number }> = {};
  if (allWork) {
    allWork.forEach((w: any) => {
      // Extract mechanicId, handling Supabase JS array vs object responses
      let mechanicId = null;
      if (w.sales) {
        const salesObj = Array.isArray(w.sales) ? w.sales[0] : w.sales;
        if (salesObj?.work_orders) {
          const woObj = Array.isArray(salesObj.work_orders) ? salesObj.work_orders[0] : salesObj.work_orders;
          mechanicId = woObj?.assigned_mechanic_id;
        }
      }

      if (mechanicId) {
        if (!techWorkTotals[mechanicId]) {
          techWorkTotals[mechanicId] = { count: 0, total: 0 };
        }
        techWorkTotals[mechanicId].count += 1;
        techWorkTotals[mechanicId].total += Number(w.total);
      }
    });
  }

  const technicianSummary = technicians
    .filter(t => techWorkTotals[t.id])
    .map(t => ({
      name: t.name,
      totalServices: techWorkTotals[t.id].count,
      totalAmount: techWorkTotals[t.id].total
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Check pending orders for the day
  const { count: pendingOrdersCount } = await supabaseAdmin
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .neq('status', 'completed')
    .neq('status', 'cancelled')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  
  // Fetch cash bases
  const { data: basesData } = await supabaseAdmin
    .from('cash_bases')
    .select('id, amount, description, type')
    .eq('organization_id', organizationId)
    .gte('date', startIso)
    .lte('date', endIso);
    
  const cashBases = (basesData || []).map((b: any) => ({
    id: b.id,
    amount: Number(b.amount),
    description: b.description || 'Base',
    type: b.type || 'addition'
  }));
  const totalCashBase = cashBases.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    totalIncome,
    totalExpenses,
    incomeByCategory,
    incomeByPaymentMethod,
    expensesByCategory,
    technicianSummary,
    pendingOrdersCount: pendingOrdersCount || 0,
    detailedExpenses,
    cashBases,
    totalCashBase
  };

}

export async function closeDay(
  organizationId: string,
  date: string,
  status: 'closed' | 'no_sales',
  summary: DailyClosingSummary
) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const netBalance = summary.totalIncome - summary.totalExpenses;

  const { data, error } = await supabaseAdmin
    .from('daily_closings')
    .insert({
      organization_id: organizationId,
      date,
      total_income: summary.totalIncome,
      total_expenses: summary.totalExpenses,
      net_balance: netBalance,
      status,
      details: summary
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // unique violation
      throw new Error('El cierre para este día ya fue realizado.');
    }
    console.error('Error closing day:', error);
    throw new Error('No se pudo realizar el cierre del día.');
  }

  revalidatePath('/accounting');
  return data;
}

export async function getDailyClosings(organizationId: string, limit = 30) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('daily_closings')
    .select(`
      *,
      profiles:created_by (
        first_name,
        last_name
      )
    `)
    .eq('organization_id', organizationId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching daily closings:', error);
    return [];
  }

  return data.map((item: any) => {
    const profile = item.profiles || {};
    return {
      ...item,
      creator_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Sistema'
    };
  });
}

export interface RealtimeFinancialData {
  sales: any[];
  expenses: any[];
  payroll: any[];
  cash_bases?: any[];
}

export async function getRealtimeFinancialDataRaw(
  organizationId: string, 
  startIso: string, 
  endIso: string
): Promise<RealtimeFinancialData> {
  noStore();
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Fetch sales
  const { data: sales, error: salesError } = await supabaseAdmin
    .from('sales')
    .select('id, total, status, created_at, payment_method, sale_items(item_type, total, inventory_items(category), service_catalog(category))')
    .eq('organization_id', organizationId)
    .in('status', ['paid', 'completed'])
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (salesError) {
    console.error('Error fetching realtime sales:', salesError);
  }

  // 2. Fetch expenses
  const { data: expenses, error: expensesError } = await supabaseAdmin
    .from('expenses')
    .select('id, amount, category, date, payment_method')
    .eq('organization_id', organizationId)
    .gte('date', startIso)
    .lte('date', endIso);

  if (expensesError) {
    console.error('Error fetching realtime expenses:', expensesError);
  }
  
  // 3. Fetch payroll
  const { data: payroll, error: payrollError } = await supabaseAdmin
    .from('payroll_payments')
    .select('id, total_paid, created_at')
    .eq('organization_id', organizationId)
    .eq('status', 'paid')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (payrollError) {
    console.error('Error fetching realtime payroll:', payrollError);
  }

  // 4. Fetch cash_bases
  let cash_bases: any[] = [];
  try {
    const { data: bases, error: basesError } = await supabaseAdmin
      .from('cash_bases')
      .select('id, amount, date, description, type')
      .eq('organization_id', organizationId)
      .gte('date', startIso)
      .lte('date', endIso);
    
    if (!basesError && bases) {
      cash_bases = bases;
    }
  } catch (e) {
    // Ignore error if table doesn't exist yet
  }

  return {
    sales: sales || [],
    expenses: expenses || [],
    payroll: payroll || [],
    cash_bases: cash_bases
  };
}

export async function setInitialCashBase(organizationId: string, date: string, amount: number, description: string = 'Apertura', type: string = 'addition') {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('cash_bases')
    .insert({ organization_id: organizationId, date, amount, description, type })
    .select()
    .single();

  if (error) {
    console.error('Error setting cash base:', error);
    throw new Error('No se pudo guardar el registro de la base.');
  }

  revalidatePath('/accounting');
  return data;
}

export async function getInitialCashBase(organizationId: string, date: string) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('cash_bases')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('date', date)
    .single();

  if (error) {
    return 0; // if not found, return 0
  }
  return Number(data.amount) || 0;
}
