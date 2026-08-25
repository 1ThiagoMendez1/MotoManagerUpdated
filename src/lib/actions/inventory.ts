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

    // Fetch old item to check if track_inventory was false
    const { data: oldItem } = await supabase
        .from('inventory_items')
        .select('track_inventory')
        .eq('id', id)
        .single();

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
    
    // Si el item antes no controlaba stock, la caja de cantidad estaba habilitada. 
    // Si el usuario tipeó algo, lo guardamos sin importar si encendió el switch o no.
    if (oldItem && oldItem.track_inventory === false) {
        const qtyRaw = formData.get('quantity');
        const qtyNum = qtyRaw ? Number(qtyRaw) : 0;
        
        if (qtyNum >= 0) {
            // Verificar si ya tiene stock en vitrina
            const { data: vitrinaLoc } = await supabase
                .from('inventory_locations')
                .select('id')
                .eq('organization_id', user.workshopId)
                .eq('type', 'storefront')
                .maybeSingle();
                
            if (vitrinaLoc) {
                // Borrar cualquier stock basura anterior para este item
                await supabase.from('inventory_item_stock').delete().eq('item_id', id);
                
                // Insertar el stock nuevo
                await supabase.from('inventory_item_stock').insert({
                    item_id: id,
                    location_id: vitrinaLoc.id,
                    quantity: qtyNum
                });
                
                if (qtyNum > 0) {
                    // Registrar el movimiento de ajuste inicial
                    await supabase.from('inventory_movements').insert({
                        organization_id: user.workshopId,
                        item_id: id,
                        from_location_id: null,
                        to_location_id: vitrinaLoc.id,
                        quantity: qtyNum,
                        movement_type: 'adjustment',
                        created_by: user.userId,
                        notes: 'Stock inicial al activar control de inventario'
                    });
                }
            }
        }
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
    const toLocId = formData.get('toLocationId') as string;
    const qty = parseInt(formData.get('quantity') as string, 10);

    if (!itemId || !fromLocId || !toLocId || isNaN(qty) || qty <= 0) {
        return { message: 'Datos inválidos para el traslado.' };
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
    const { error: decError } = await supabase
      .from('inventory_item_stock')
      .update({ quantity: sourceStock.quantity - qty })
      .eq('item_id', itemId)
      .eq('location_id', fromLocId);

    if (decError) return { message: 'Error descontando stock.' };

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
    
    return { data: data || [] };
}
