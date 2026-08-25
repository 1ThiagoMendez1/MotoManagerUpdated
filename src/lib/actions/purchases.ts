'use server';

import { createClient } from '@/lib/supabase/server';
import { requireWorkshop } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const purchaseItemSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number().min(1),
  unitCost: z.number().min(0),
});

const purchaseSchema = z.object({
  invoiceNumber: z.string().optional(),
  supplierId: z.string().optional(),
  destination: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Debe agregar al menos un repuesto a la factura"),
  paymentMethod: z.string().min(1, "Selecciona un método de pago"),
  creditDays: z.coerce.number().min(0).optional(),
});

export async function createPurchase(prevState: any, formData: FormData) {
  const user = await requireWorkshop();
  const supabase = await createClient();

  const rawData = formData.get('data');
  if (!rawData) return { message: 'Faltan datos de la compra.' };

  let parsedData;
  try {
    parsedData = JSON.parse(rawData as string);
  } catch (e) {
    return { message: 'Formato de datos inválido.' };
  }

  const validatedFields = purchaseSchema.safeParse(parsedData);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const data = validatedFields.data;

  // Calculate totals
  let subtotal = 0;
  const itemsWithTotal = data.items.map(item => {
    const total = item.quantity * item.unitCost;
    subtotal += total;
    return { ...item, total };
  });

  const total = subtotal; // For now, no taxes in the UI

  // 1. Create Purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      organization_id: user.workshopId,
      supplier_id: (data.supplierId && data.supplierId.length === 36) ? data.supplierId : null,
      invoice_number: data.invoiceNumber || null,
      subtotal,
      tax_total: 0,
      total,
      status: 'pending', // Initial state
      created_by: user.userId,
      payment_method: data.paymentMethod,
      credit_days: data.paymentMethod === 'credit' ? data.creditDays || 0 : 0,
    })
    .select()
    .single();

  if (purchaseError || !purchase) {
    console.error('Error creating purchase:', purchaseError);
    return { message: 'Error al registrar la compra.' };
  }

  // 2. Create Purchase Items
  const itemsToInsert = itemsWithTotal.map(item => ({
    purchase_id: purchase.id,
    item_id: item.inventoryItemId,
    quantity: item.quantity,
    unit_cost: item.unitCost,
    total: item.total,
  }));

  const { error: itemsError } = await supabase
    .from('purchase_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error creating purchase items:', itemsError);
    return { message: 'Error al registrar los ítems de la compra.' };
  }

  // 3. Mark as Received (RPC processes stock and expenses)
  
  // Resolve destination location ID if provided as 'warehouse' or 'storefront'
  let p_location_id = null;
  if (data.destination) {
     const { data: loc } = await supabase
        .from('inventory_locations')
        .select('id')
        .eq('organization_id', user.workshopId)
        .eq('type', data.destination)
        .limit(1)
        .maybeSingle();
     if (loc) p_location_id = loc.id;
  }

  const { error: rpcError } = await supabase.rpc('process_purchase_receipt', {
    p_purchase_id: purchase.id,
    p_user_id: user.userId,
    p_location_id: p_location_id
  });

  if (rpcError) {
    console.error('Error processing purchase receipt:', rpcError);
    return { message: 'La factura se creó pero hubo un error ingresando el stock.' };
  }

  revalidatePath('/accounting');
  revalidatePath('/inventory');
  return { success: true };
}
