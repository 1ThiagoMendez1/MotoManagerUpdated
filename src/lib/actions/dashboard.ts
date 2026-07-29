'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';

export async function getDashboardData() {
  const user = await requireWorkshop()
  const supabase = await createAdminClient()
  const workshop = await getWorkshopDetails(user)

  // 1. Ingresos del Mes (Revenue this month)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: salesThisMonth, error: e1 } = await supabase
    .from('sales')
    .select('total')
    .eq('organization_id', user.workshopId)
    .gte('created_at', startOfMonth)

  if (e1) console.error('Dashboard Error (sales):', e1)

  const ingresosMes = (salesThisMonth || []).reduce((sum, sale) => sum + Number(sale.total), 0)

  // 2. Motos en Taller & 3. Órdenes Activas
  const { data: wosData, error: e2 } = await supabase
    .from('work_orders')
    .select('id, status, motorcycle_id, sales(id, status)')
    .eq('organization_id', user.workshopId);
    
  if (e2) console.error('Dashboard Error (WOs for stats):', e2)

  const activeWorkOrders = (wosData || []).filter(wo => {
    const salesArr = wo.sales ? (Array.isArray(wo.sales) ? wo.sales : [wo.sales]) : [];
    const hasCompletedSale = salesArr.some((s: any) => s.status === 'paid');
    return !hasCompletedSale && wo.status !== 'delivered';
  });

  const activeWorkOrdersCount = activeWorkOrders.length;
  const motosEnTallerSet = new Set(activeWorkOrders.map(wo => wo.motorcycle_id).filter(Boolean));
  const motosEnTallerCount = motosEnTallerSet.size;

  // 4. Stock Crítico
  const { data: inventory, error: e4 } = await supabase
    .from('inventory_items')
    .select('id, quantity, min_quantity')
    .eq('organization_id', user.workshopId)

  if (e4) console.error('Dashboard Error (inventory):', e4)

  const stockCriticoCount = (inventory || []).filter(item => item.quantity <= (item.min_quantity || 5)).length

  // 5. Flujo de Caja (Semanal)
  // Last 7 days revenue
  const revenueData = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    
    // sum sales for this date
    const { data: dailySales } = await supabase
      .from('sales')
      .select('total')
      .eq('organization_id', user.workshopId)
      .gte('created_at', `${dateStr}T00:00:00.000Z`)
      .lt('created_at', `${dateStr}T23:59:59.999Z`)
      
    const dayTotal = (dailySales || []).reduce((sum, sale) => sum + Number(sale.total), 0)
    
    revenueData.push({
      name: d.toLocaleDateString('es-CO', { weekday: 'short' }),
      ingresos: dayTotal,
      gastos: 0 // We don't have expenses tracking yet
    })
  }

  // 6. Top Selling Parts
  const { data: salesWithItems, error: e5 } = await supabase
    .from('sales')
    .select('id, sale_items(inventory_item_id, quantity, inventory_items(name))')
    .eq('organization_id', user.workshopId)
    
  if (e5) console.error('Dashboard Error (sale items):', e5)
    
  const partsMap: Record<string, { name: string, ventas: number }> = {}
  if (salesWithItems) {
    salesWithItems.forEach((sale: any) => {
      if (!sale.sale_items) return;
      // Depending on Supabase relations, sale_items might be an array
      const items = Array.isArray(sale.sale_items) ? sale.sale_items : [sale.sale_items];
      items.forEach((item: any) => {
        if (!item.inventory_item_id) return;
        const name = item.inventory_items?.name || 'Desconocido'
        if (!partsMap[item.inventory_item_id]) {
          partsMap[item.inventory_item_id] = { name, ventas: 0 }
        }
        partsMap[item.inventory_item_id].ventas += Number(item.quantity)
      });
    })
  }
  
  const topPartsData = Object.values(partsMap)
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 5)

  // Alertas del taller
  const alerts = []
  if (stockCriticoCount > 0) {
    alerts.push({ text: `Hay ${stockCriticoCount} repuesto(s) con stock crítico.`, time: "Reciente", urgent: true, link: "/inventory" })
  }
  if (activeWorkOrdersCount && activeWorkOrdersCount > 0) {
    alerts.push({ text: `Tienes ${activeWorkOrdersCount} orden(es) activa(s) en proceso.`, time: "Reciente", urgent: false, link: "/work-orders" })
  }
  if (alerts.length === 0) {
    alerts.push({ text: "Todo está al día en tu taller.", time: "Ahora", urgent: false })
  }

  console.log('DEBUG DASHBOARD:', { ingresosMes, motosEnTallerCount, activeWorkOrdersCount, stockCriticoCount, workshopId: user.workshopId, workshopName: workshop?.name });

  return {
    success: true,
    data: {
      ingresosMes,
      motosEnTallerCount: motosEnTallerCount || 0,
      activeWorkOrdersCount: activeWorkOrdersCount || 0,
      stockCriticoCount,
      revenueData,
      topPartsData,
      alerts,
      workshopName: workshop?.name || 'Mi Taller'
    }
  }
}
