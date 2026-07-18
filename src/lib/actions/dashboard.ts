'use server'

import { createClient } from '@/lib/supabase/server'
import { requireWorkshop } from '@/lib/auth-server'

export async function getDashboardData() {
  const user = await requireWorkshop()
  const supabase = await createClient()

  // 1. Ingresos del Mes (Revenue this month)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: salesThisMonth } = await supabase
    .from('sales')
    .select('total')
    .eq('workshop_id', user.workshopId)
    .gte('date', startOfMonth)

  const ingresosMes = (salesThisMonth || []).reduce((sum, sale) => sum + Number(sale.total), 0)

  // 2. Motos en Taller & 3. Órdenes Activas
  // These are basically the same in this context (work orders not Entregado)
  const { count: activeWorkOrdersCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('workshop_id', user.workshopId)
    .neq('status', 'Entregado')

  const { count: motosEnTallerCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('workshop_id', user.workshopId)
    .neq('status', 'Entregado')

  // 4. Stock Crítico
  // We can't do direct column comparison in Supabase select easily without a view or rpc, 
  // so we'll fetch all and filter, or just fetch items where quantity <= min_quantity?
  // We can use RPC or just fetch the ones we suspect or a raw sql view.
  // Wait, supabase allows filtering by another column using something else, but actually we can just fetch all inventory items (or just the ones where quantity < min_quantity if possible)
  // Since we can't do `.lte('quantity', 'min_quantity')` directly with standard postgrest, 
  // let's just fetch all and filter in memory, assuming inventory isn't huge.
  const { data: inventory } = await supabase
    .from('inventory_items')
    .select('id, quantity, min_quantity')
    .eq('workshop_id', user.workshopId)

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
      .eq('workshop_id', user.workshopId)
      .gte('date', `${dateStr}T00:00:00.000Z`)
      .lt('date', `${dateStr}T23:59:59.999Z`)
      
    const dayTotal = (dailySales || []).reduce((sum, sale) => sum + Number(sale.total), 0)
    
    revenueData.push({
      name: d.toLocaleDateString('es-CO', { weekday: 'short' }),
      ingresos: dayTotal,
      gastos: 0 // We don't have expenses tracking yet
    })
  }

  // 6. Top Selling Parts
  const { data: saleItems } = await supabase
    .from('sale_items')
    .select('inventory_item_id, quantity, inventory_items(name)')
    .eq('workshop_id', user.workshopId)
    
  const partsMap: Record<string, { name: string, ventas: number }> = {}
  if (saleItems) {
    saleItems.forEach((item: any) => {
      const name = item.inventory_items?.name || 'Desconocido'
      if (!partsMap[item.inventory_item_id]) {
        partsMap[item.inventory_item_id] = { name, ventas: 0 }
      }
      partsMap[item.inventory_item_id].ventas += item.quantity
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

  return {
    success: true,
    data: {
      ingresosMes,
      motosEnTallerCount: motosEnTallerCount || 0,
      activeWorkOrdersCount: activeWorkOrdersCount || 0,
      stockCriticoCount,
      revenueData,
      topPartsData,
      alerts
    }
  }
}
