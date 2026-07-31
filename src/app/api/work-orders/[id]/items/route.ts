import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireWorkshop } from '@/lib/auth-server';

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
    
    // 1. Obtener TODAS las ventas pendientes asociadas a esta orden de trabajo
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id')
      .eq('work_order_id', workOrderId)
      .eq('organization_id', user.workshopId);
      
    if (salesError || !sales || sales.length === 0) {
      return NextResponse.json({ items: [] });
    }
    
    const saleIds = sales.map(s => s.id);
    
    // 2. Obtener los items (sale_items)
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('*, inventory_items(name, code)')
      .in('sale_id', saleIds);
      
    if (itemsError || !saleItems) {
      return NextResponse.json({ items: [] });
    }
    
    // 3. Mapear al formato esperado por el frontend
    const mappedItems = saleItems
      .filter((item: any) => item.item_type === 'inventory' && item.inventory_item_id)
      .map((item: any) => ({
        inventoryItemId: item.inventory_item_id,
        name: item.inventory_items?.name || item.description || 'Producto',
        sku: item.inventory_items?.code || '',
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total || (item.quantity * item.unit_price)
      }));
      
    return NextResponse.json({ items: mappedItems });
  } catch (error) {
    console.error('Error fetching work order items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
