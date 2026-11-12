import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireWorkshop } from '@/lib/auth-server';
import { isIssuedServiceSale, isOrderDeposit } from '@/lib/work-order-finance';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireWorkshop();
    const supabase = await createClient();
    
    // Soporte para API de params en Next.js 14 y Next.js 15
    const resolvedParams = await Promise.resolve(params);
    const workOrderId = resolvedParams.id;
    
    const { data: order, error: orderError } = await supabase.from('work_orders').select('id,assigned_mechanic_id,status,deposit_amount').eq('id',workOrderId).eq('organization_id',user.workshopId).maybeSingle();
    if (orderError) throw orderError;
    if (!order || (user.role === 'mechanic' && order.assigned_mechanic_id !== user.userId)) return NextResponse.json({error:'Orden no encontrada'}, {status:404});

    // 1. Obtener TODAS las ventas pendientes asociadas a esta orden de trabajo
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id,sale_number,status,is_deposit,notes')
      .eq('work_order_id', workOrderId)
      .eq('organization_id', user.workshopId)
      .neq('status', 'cancelled');
      
    if (salesError) throw salesError;
    const billable = !sales?.some(isIssuedServiceSale) && (order.status === 'completed' ||
      (['delivered', 'delivered_quote_rejected'].includes(order.status) && sales?.some(sale => isOrderDeposit(sale) && sale.status === 'paid')));
    const saleIds = (sales || []).map(s => s.id);
    const { data: saleItems, error: itemsError } = saleIds.length ? await supabase
      .from('sale_items').select('*, inventory_items(name, code)').in('sale_id', saleIds)
      : { data: [], error: null };
    if (itemsError) throw itemsError;

    // 3. Mapear al formato esperado por el frontend
    const mappedItems = (saleItems || [])
      .filter((item: any) => item.item_type === 'inventory' && item.inventory_item_id)
      .map((item: any) => ({
        inventoryItemId: item.inventory_item_id,
        name: item.inventory_items?.name || item.description || 'Producto',
        sku: item.inventory_items?.code || '',
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total || (item.quantity * item.unit_price),
        type: 'inventory'
      }));

    // 4. Fetch work_order_services (Mano de obra)
    const { data: services, error: servicesError } = await supabase
      .from('work_order_services')
      .select('*')
      .eq('work_order_id', workOrderId);

    if (servicesError) throw servicesError;
    if (services && services.length > 0) {
       const mappedServices = services.map((service: any) => ({
         inventoryItemId: service.id, // Using service ID here to satisfy UI requirements
         name: service.description || 'Servicio',
         sku: 'SRV',
         quantity: service.quantity || 1,
         price: service.unit_price || 0,
         total: service.total || ((service.quantity || 1) * (service.unit_price || 0)),
         type: 'service'
       }));
       mappedItems.push(...mappedServices);
    }
      
    return NextResponse.json({
      items: mappedItems,
      depositAmount: Number(order.deposit_amount || 0),
      laborCost: (services || []).reduce((sum, service) => sum + Number(service.total || 0), 0),
      billable: Boolean(billable),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching work order items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
