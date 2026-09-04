'use server';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sendLowStockNotification } from '@/lib/whatsapp';

const inventorySchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres."),
    category: z.string().min(2, "Categoría es requerida."),
    trackInventory: z.boolean().optional().default(true),
    supplier: z.string().optional(),
    quantity: z.coerce.number().optional().default(0),
    price: z.coerce.number().positive("El precio debe ser un número positivo."),
    supplierPrice: z.coerce.number().optional().default(0),
    minimumQuantity: z.coerce.number().int().optional().default(0),
    location: z.string().optional(),
    destination: z.string().optional().default('storefront'),
    stockStorefront: z.coerce.number().optional(),
    stockWarehouse: z.coerce.number().optional(),
});

export async function createInventoryItem(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const trackInventoryRaw = formData.get('trackInventoryVal');
    const trackInventory = trackInventoryRaw === 'true' || trackInventoryRaw === null; // default true
    
    const validatedFields = inventorySchema.safeParse({
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        trackInventory: trackInventory,
        supplier: formData.get('supplier'),
        quantity: formData.get('quantity'),
        price: formData.get('price'),
        supplierPrice: formData.get('supplierPrice'),
        minimumQuantity: formData.get('minimumQuantity'),
        location: formData.get('location') || '',
        destination: formData.get('destination') || undefined,
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;

    const { data: existingSku, error: skuError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('organization_id', user.workshopId)
        .eq('code', data.sku)
        .maybeSingle();

    if (skuError) return { message: 'Error al verificar el SKU del producto.' };
    if (existingSku) return { message: 'Ya existe un producto con este SKU en el inventario.' };

    const { data: existingName, error: nameError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('organization_id', user.workshopId)
        .ilike('name', data.name)
        .maybeSingle();

    if (nameError) return { message: 'Error al verificar el nombre del producto.' };
    if (existingName) return { message: 'Ya existe un producto con este nombre en el inventario.' };

    const { data: insertedItem, error } = await supabase
        .from('inventory_items')
        .insert({
            organization_id: user.workshopId,
            name: data.name,
            code: data.sku,
            category: data.category,
            description: JSON.stringify({ location: data.location || '', supplier: data.supplier || '' }),
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
            track_inventory: data.trackInventory,
            last_cost: data.supplierPrice || 0
        })
        .select()
        .single();

    if (!error && insertedItem && data.trackInventory !== false) {
        // Find the requested location (Vitrina or Bodega)
        const locationType = data.destination || 'storefront';
        const { data: targetLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', locationType)
            .limit(1)
            .maybeSingle();

        if (targetLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: targetLoc.id,
                quantity: data.quantity || 0
            });
            
            if ((data.quantity || 0) > 0) {
                await supabase.from('inventory_movements').insert({
                    organization_id: user.workshopId,
                    item_id: insertedItem.id,
                    from_location_id: null,
                    to_location_id: targetLoc.id,
                    quantity: data.quantity,
                    movement_type: 'purchase', // initial stock treated as purchase
                    created_by: user.userId,
                    notes: `Stock inicial en ${locationType === 'warehouse' ? 'Bodega' : 'Vitrina'}`
                });
            }
        }
    }

    if (error) {
        console.error('Error creating inventory item:', error);
        return { message: 'Error al crear el artículo.' };
    }

    revalidatePath('/inventory');
    return { success: true };
}

export async function updateInventoryItem(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();
    const id = formData.get('id') as string;

    if (!id) return { message: 'ID requerido' };

    const trackInventoryRaw = formData.get('trackInventoryVal');
    const trackInventory = trackInventoryRaw === 'true' || trackInventoryRaw === null; // default true
    
    const validatedFields = inventorySchema.safeParse({
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        trackInventory: trackInventory,
        supplier: formData.get('supplier'),
        quantity: formData.get('quantity'),
        price: formData.get('price'),
        supplierPrice: formData.get('supplierPrice'),
        minimumQuantity: formData.get('minimumQuantity'),
        location: formData.get('location') || '',
        destination: formData.get('destination') || undefined,
        stockStorefront: formData.get('stockStorefront') ?? undefined,
        stockWarehouse: formData.get('stockWarehouse') ?? undefined,
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;

    const { data: existingSku, error: skuError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('organization_id', user.workshopId)
        .eq('code', data.sku)
        .neq('id', id)
        .maybeSingle();

    if (skuError) return { message: 'Error al verificar el SKU del producto.' };
    if (existingSku) return { message: 'Ya existe otro producto con este SKU en el inventario.' };

    const { data: existingName, error: nameError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('organization_id', user.workshopId)
        .ilike('name', data.name)
        .neq('id', id)
        .maybeSingle();

    if (nameError) return { message: 'Error al verificar el nombre del producto.' };
    if (existingName) return { message: 'Ya existe otro producto con este nombre en el inventario.' };

    const { error } = await supabase
        .from('inventory_items')
        .update({
            name: data.name,
            code: data.sku,
            category: data.category,
            description: JSON.stringify({ location: data.location || '', supplier: data.supplier || '' }),
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
            track_inventory: data.trackInventory,
            last_cost: data.supplierPrice || 0
        })
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        return { message: 'Error al actualizar.' };
    }
    
    // Gestión del stock en ubicaciones (Vitrina / Bodega)
    if (data.trackInventory !== false) {
        // Asegurar que existan las ubicaciones de la organización
        let { data: locations } = await supabase
            .from('inventory_locations')
            .select('id, type, name')
            .eq('organization_id', user.workshopId);

        let vitrinaLoc = locations?.find(l => l.type === 'storefront');
        let bodegaLoc = locations?.find(l => l.type === 'warehouse');

        if (!vitrinaLoc) {
            const { data: newLoc } = await supabase
                .from('inventory_locations')
                .insert({ organization_id: user.workshopId, name: 'Vitrina', type: 'storefront' })
                .select('id, type, name')
                .single();
            if (newLoc) vitrinaLoc = newLoc;
        }

        if (!bodegaLoc) {
            const { data: newLoc } = await supabase
                .from('inventory_locations')
                .insert({ organization_id: user.workshopId, name: 'Bodega Principal', type: 'warehouse' })
                .select('id, type, name')
                .single();
            if (newLoc) bodegaLoc = newLoc;
        }

        // Obtener registros de stock actuales para este item
        const { data: currentStocks } = await supabase
            .from('inventory_item_stock')
            .select('id, location_id, quantity')
            .eq('item_id', id);

        const currentVitrinaStock = currentStocks?.find(s => s.location_id === vitrinaLoc?.id);
        const currentBodegaStock = currentStocks?.find(s => s.location_id === bodegaLoc?.id);

        const oldVitrinaQty = currentVitrinaStock ? Number(currentVitrinaStock.quantity) : 0;
        const oldBodegaQty = currentBodegaStock ? Number(currentBodegaStock.quantity) : 0;

        const stockStorefrontRaw = formData.get('stockStorefront');
        const stockWarehouseRaw = formData.get('stockWarehouse');
        const quantityRaw = formData.get('quantity');

        let targetVitrinaQty = oldVitrinaQty;
        let targetBodegaQty = oldBodegaQty;

        if (stockStorefrontRaw !== null || stockWarehouseRaw !== null) {
            targetVitrinaQty = stockStorefrontRaw !== null && stockStorefrontRaw !== '' ? Math.max(0, Number(stockStorefrontRaw)) : 0;
            targetBodegaQty = stockWarehouseRaw !== null && stockWarehouseRaw !== '' ? Math.max(0, Number(stockWarehouseRaw)) : 0;
        } else if (quantityRaw !== null && quantityRaw !== '') {
            const requestedTotal = Math.max(0, Number(quantityRaw));
            const currentTotal = oldVitrinaQty + oldBodegaQty;
            const diff = requestedTotal - currentTotal;
            if (diff !== 0) {
                if (oldBodegaQty > 0 && oldVitrinaQty === 0) {
                    targetBodegaQty = requestedTotal;
                } else if (oldVitrinaQty > 0 && oldBodegaQty === 0) {
                    targetVitrinaQty = requestedTotal;
                } else if (oldBodegaQty > 0 && oldVitrinaQty > 0) {
                    if (diff > 0) {
                        targetVitrinaQty = oldVitrinaQty + diff;
                    } else {
                        const absDiff = Math.abs(diff);
                        if (oldVitrinaQty >= absDiff) {
                            targetVitrinaQty = oldVitrinaQty - absDiff;
                        } else {
                            const remainder = absDiff - oldVitrinaQty;
                            targetVitrinaQty = 0;
                            targetBodegaQty = Math.max(0, oldBodegaQty - remainder);
                        }
                    }
                } else {
                    const isBodega = (data.location || '').toLowerCase().includes('bodega');
                    if (isBodega) {
                        targetBodegaQty = requestedTotal;
                    } else {
                        targetVitrinaQty = requestedTotal;
                    }
                }
            }
        }

        // Actualizar Vitrina si cambió
        if (vitrinaLoc && targetVitrinaQty !== oldVitrinaQty) {
            const diff = targetVitrinaQty - oldVitrinaQty;
            if (currentVitrinaStock) {
                await supabase
                    .from('inventory_item_stock')
                    .update({ quantity: targetVitrinaQty })
                    .eq('id', currentVitrinaStock.id);
            } else {
                await supabase
                    .from('inventory_item_stock')
                    .insert({
                        item_id: id,
                        location_id: vitrinaLoc.id,
                        quantity: targetVitrinaQty
                    });
            }

            await supabase.from('inventory_movements').insert({
                organization_id: user.workshopId,
                item_id: id,
                from_location_id: diff < 0 ? vitrinaLoc.id : null,
                to_location_id: diff > 0 ? vitrinaLoc.id : null,
                quantity: Math.abs(diff),
                movement_type: 'adjustment',
                created_by: user.userId,
                notes: `Ajuste manual de stock en Vitrina (${diff > 0 ? `+${diff}` : diff})`
            });
        }

        // Actualizar Bodega si cambió
        if (bodegaLoc && targetBodegaQty !== oldBodegaQty) {
            const diff = targetBodegaQty - oldBodegaQty;
            if (currentBodegaStock) {
                await supabase
                    .from('inventory_item_stock')
                    .update({ quantity: targetBodegaQty })
                    .eq('id', currentBodegaStock.id);
            } else {
                await supabase
                    .from('inventory_item_stock')
                    .insert({
                        item_id: id,
                        location_id: bodegaLoc.id,
                        quantity: targetBodegaQty
                    });
            }

            await supabase.from('inventory_movements').insert({
                organization_id: user.workshopId,
                item_id: id,
                from_location_id: diff < 0 ? bodegaLoc.id : null,
                to_location_id: diff > 0 ? bodegaLoc.id : null,
                quantity: Math.abs(diff),
                movement_type: 'adjustment',
                created_by: user.userId,
                notes: `Ajuste manual de stock en Bodega (${diff > 0 ? `+${diff}` : diff})`
            });
        }
    } else {
        // Si el artículo no controla stock, eliminar registros de stock existentes
        await supabase.from('inventory_item_stock').delete().eq('item_id', id);
    }

    revalidatePath('/inventory');
    return { success: true };
}

export async function deleteInventoryItem(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();
    const id = formData.get('id') as string;

    // Check usage in sales (sale_items)
    const { count } = await supabase
        .from('sale_items')
        .select('*', { count: 'exact', head: true })
        .eq('inventory_item_id', id);

    if (count && count > 0) {
        return { message: 'No se puede eliminar: Tiene ventas asociadas' };
    }

    const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        return { message: 'Error al eliminar.' };
    }

    revalidatePath('/inventory');
    return { success: true };
}

export async function notifyAdminLowStock() {
    const user = await requireWorkshop();
    const supabase = await createClient();

    // Find the low stock items first
    const { data: inventoryItems } = await supabase
        .from('inventory_items')
        .select('name, quantity, min_quantity')
        .eq('organization_id', user.workshopId);

    const lowStockItems = (inventoryItems || []).filter(item => item.quantity <= item.min_quantity);

    if (lowStockItems.length === 0) {
        return { message: 'No hay productos con bajo stock.' };
    }

    const lowStockItemsText = lowStockItems.map(item => `• ${item.name} (Quedan: ${item.quantity})`).join('\n');

    // Get the owner's phone number from organization_members
    const { data: ownerMember } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', user.workshopId)
        .eq('role', 'owner')
        .single();

    if (!ownerMember) {
        return { message: 'No se encontró al dueño de la organización.' };
    }

    // In a real app we might fetch user profile for phone. Since auth-server has `getUserById` mock, we bypass for now.
    // For WhatsApp we assume owner phone is retrieved from profiles table.
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email') // We need phone if it existed, we'll try mock for now
        .eq('id', ownerMember.user_id)
        .single();
        
    const ownerName = ownerProfile ? `${ownerProfile.first_name} ${ownerProfile.last_name}` : 'Propietario';
    
    // We mock the phone number for the owner if not found.
    const ownerPhone = '+1234567890'; 

    // Get technician's name
    const techName = 'Un técnico'; // Simplificado, idealmente viene del current user

    // Send the message safely
    try {
        const result = await sendLowStockNotification(ownerPhone, ownerName, techName, lowStockItemsText);
        if (!result.success) {
            return { message: 'Hubo un error al enviar el mensaje de WhatsApp.' };
        }
    } catch (notifyError) {
        console.error('Error sending low stock notification:', notifyError);
        return { message: 'Error de conexión al enviar WhatsApp.' };
    }

    return { success: true };
}

export async function transferStock(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();
    
    const itemId = formData.get('itemId') as string;
    const fromLocId = formData.get('fromLocationId') as string;
    let toLocId = formData.get('toLocationId') as string;
    const qty = parseInt(formData.get('quantity') as string, 10);

    if (!itemId || !fromLocId || !toLocId || isNaN(qty) || qty <= 0) {
        return { message: 'Datos inválidos para el traslado.' };
    }

    // Si el toLocId es un string mágico (ej. 'storefront'), buscamos su ID real
    if (toLocId === 'storefront' || toLocId === 'warehouse') {
        const { data: realLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', toLocId)
            .maybeSingle();
        
        if (realLoc) {
            toLocId = realLoc.id;
        } else {
            return { message: 'No se encontró la ubicación de destino.' };
        }
    }

    // Since transferring stock is a multi-step process (decrement from, increment to, write movement),
    // we should use a transaction via a Postgres function, OR just do it sequentially if we don't have one.
    // Wait, we have the "decrement_inventory" RPC! But we don't have an "increment_inventory" RPC.
    // Let's do it sequentially since we're in server action, but ideally this should be a transaction.
    
    // Check if source has enough
    const { data: sourceStock } = await supabase
      .from('inventory_item_stock')
      .select('quantity')
      .eq('item_id', itemId)
      .eq('location_id', fromLocId)
      .single();

    if (!sourceStock || sourceStock.quantity < qty) {
       return { message: 'Stock insuficiente en la ubicación de origen.' };
    }

    // Decrement from source
    const newQty = sourceStock.quantity - qty;
        if (newQty === 0) {
            await supabase.from("inventory_item_stock").delete().eq("item_id", itemId).eq("location_id", fromLocId);
        } else {
            const { error: decError } = await supabase
      .from('inventory_item_stock')
      .update({ quantity: sourceStock.quantity - qty })
      .eq('item_id', itemId)
      .eq('location_id', fromLocId);

    if (decError) return { message: 'Error descontando stock.' };
        }

    // Increment to dest
    const { data: destStock } = await supabase
      .from('inventory_item_stock')
      .select('quantity')
      .eq('item_id', itemId)
      .eq('location_id', toLocId)
      .maybeSingle();

    if (destStock) {
       await supabase
         .from('inventory_item_stock')
         .update({ quantity: destStock.quantity + qty })
         .eq('item_id', itemId)
         .eq('location_id', toLocId);
    } else {
       await supabase
         .from('inventory_item_stock')
         .insert({ item_id: itemId, location_id: toLocId, quantity: qty });
    }

    // Record movement
    await supabase.from('inventory_movements').insert({
      organization_id: user.workshopId,
      item_id: itemId,
      from_location_id: fromLocId,
      to_location_id: toLocId,
      quantity: qty,
      movement_type: 'transfer',
      created_by: user.userId
    });

    revalidatePath('/inventory');
    return { success: true };
}

export async function getKardexMovements(itemId: string) {
    const user = await requireWorkshop();
    
    // We use the service role client here to bypass any complex RLS recursion 
    // that might be caused by joins on profiles/organization_members.
    // We enforce security manually by filtering strictly by the user's workshopId.
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabaseAdmin
      .from('inventory_movements')
      .select('*, from_loc:inventory_locations!inventory_movements_from_location_id_fkey(name), to_loc:inventory_locations!inventory_movements_to_location_id_fkey(name), user:profiles(first_name, last_name)')
      .eq('item_id', itemId)
      .eq('organization_id', user.workshopId)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching kardex admin:', error);
        return { error: error.message };
    }
    
    let resolvedData = data || [];
    const saleIds = resolvedData.filter((m: any) => m.movement_type === 'sale' && m.reference_id).map((m: any) => m.reference_id);
    
    if (saleIds.length > 0) {
        const { data: salesData } = await supabaseAdmin
            .from('sales')
            .select('id, work_order_id')
            .in('id', saleIds);
            
        if (salesData) {
            const salesMap: Record<string, any> = {};
            salesData.forEach((s: any) => { salesMap[s.id] = s; });
            
            resolvedData = resolvedData.map((m: any) => {
                if (m.movement_type === 'sale' && m.reference_id && salesMap[m.reference_id]) {
                    m.movement_type = salesMap[m.reference_id].work_order_id ? 'service_sale' : 'direct_sale';
                }
                return m;
            });
        }
    }
    
    return { data: resolvedData };
}

export async function bulkTransferStock(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();
    
    const itemsJson = formData.get('items') as string;
    const toLocType = formData.get('toLocationType') as string;

    if (!itemsJson || !toLocType) {
        return { message: 'Datos inválidos para el traslado masivo.' };
    }

    let itemsToTransfer: { itemId: string, fromLocId: string, quantity: number }[] = [];
    try {
        itemsToTransfer = JSON.parse(itemsJson);
    } catch (e) {
        return { message: 'Error en el formato de los items.' };
    }

    if (itemsToTransfer.length === 0) {
        return { message: 'No hay items para trasladar.' };
    }

    // Buscar el ID real de la ubicación de destino
    const { data: realLoc } = await supabase
        .from('inventory_locations')
        .select('id')
        .eq('organization_id', user.workshopId)
        .eq('type', toLocType)
        .maybeSingle();
    
    let toLocId = toLocType;
    if (realLoc) {
        toLocId = realLoc.id;
    } else if (toLocType === 'storefront' || toLocType === 'warehouse') {
        return { message: 'No se encontró la ubicación de destino.' };
    }

    // Idealmente, esto debería ser una transacción. Como estamos en un server action y no tenemos una 
    // función RPC para bulk transfer, iteraremos secuencialmente. 
    // Para entornos reales con alta concurrencia, es imperativo crear un RPC en Postgres.
    
    let successCount = 0;
    for (const item of itemsToTransfer) {
        const { itemId, fromLocId, quantity: qty } = item;
        
        // 1. Verificar stock origen
        const { data: sourceStock } = await supabase
            .from('inventory_item_stock')
            .select('quantity')
            .eq('item_id', itemId)
            .eq('location_id', fromLocId)
            .single();

        if (!sourceStock || sourceStock.quantity < qty) {
            continue; // Skip this item if insufficient stock
        }

        // 2. Descontar origen
        const newQty = sourceStock.quantity - qty;
        if (newQty === 0) {
            await supabase.from("inventory_item_stock").delete().eq("item_id", itemId).eq("location_id", fromLocId);
        } else {
            const { error: decError } = await supabase
            .from('inventory_item_stock')
            .update({ quantity: sourceStock.quantity - qty })
            .eq('item_id', itemId)
            .eq('location_id', fromLocId);

            if (decError) continue;
        }

        // 3. Incrementar destino
        const { data: destStock } = await supabase
            .from('inventory_item_stock')
            .select('quantity')
            .eq('item_id', itemId)
            .eq('location_id', toLocId)
            .maybeSingle();

        if (destStock) {
            await supabase
                .from('inventory_item_stock')
                .update({ quantity: destStock.quantity + qty })
                .eq('item_id', itemId)
                .eq('location_id', toLocId);
        } else {
            await supabase
                .from('inventory_item_stock')
                .insert({ item_id: itemId, location_id: toLocId, quantity: qty });
        }

        // 4. Registrar movimiento
        await supabase.from('inventory_movements').insert({
            organization_id: user.workshopId,
            item_id: itemId,
            from_location_id: fromLocId,
            to_location_id: toLocId,
            quantity: qty,
            movement_type: 'transfer',
            created_by: user.userId
        });
        
        successCount++;
    }

    revalidatePath('/inventory');
    
    if (successCount === 0) {
        return { message: 'No se pudo trasladar ningún item (stock insuficiente o errores).' };
    }
    if (successCount < itemsToTransfer.length) {
        return { message: `Se trasladaron ${successCount} de ${itemsToTransfer.length} items.` };
    }

    return { success: true };
}
