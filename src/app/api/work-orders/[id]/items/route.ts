import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Authorization check could be added here (requireWorkshop)
    // For now assuming the route is protected by middleware or the query itself constraints to workshop via RLS if we had user context.
    // However, createClient() here is server-side, so it might not have the user session if not called from a context that passes cookies properly? 
    // In Next.js App Router, createClient() from @/lib/supabase/server uses cookies(), so it should have the session.

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        sales (
          sale_items (
            inventory_item_id,
            quantity,
            price,
            inventory_item:inventory_items (
              id,
              name,
              sku,
              price
            )
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !workOrder) {
      console.error('Work order not found or error:', error);
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // Agregar todos los ítems de todas las ventas asociadas a esta orden
    const itemsMap = new Map<
      string,
      {
        inventoryItemId: string;
        name: string;
        sku: string;
        quantity: number;
        price: number;
      }
    >();

    // Supabase returns null for empty relations sometimes, or empty array.
    if (workOrder.sales) {
      for (const sale of workOrder.sales) {
        if (sale.sale_items) {
          for (const saleItem of sale.sale_items) {
            const key = saleItem.inventory_item_id;
            const existing = itemsMap.get(key);

            // Allow mapping from inventory_item relation if available
            const invItem = saleItem.inventory_item as any;
            const name = invItem?.name || 'Unknown';
            const sku = invItem?.sku || '';
            const basePrice = invItem?.price || 0;

            const price = saleItem.price ?? basePrice;

            if (existing) {
              existing.quantity += saleItem.quantity;
            } else {
              itemsMap.set(key, {
                inventoryItemId: saleItem.inventory_item_id,
                name: name,
                sku: sku,
                quantity: saleItem.quantity,
                price,
              });
            }
          }
        }
      }
    }

    const items = Array.from(itemsMap.values());

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching work order items for service sale:', error);
    return NextResponse.json(
      { error: 'Error al obtener los ítems de la orden de trabajo' },
      { status: 500 }
    );
  }
}