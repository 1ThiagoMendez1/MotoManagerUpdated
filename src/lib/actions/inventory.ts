'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWorkshop } from '@/lib/auth-server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { sendLowStockNotification } from '@/lib/whatsapp'

const inventorySchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    sku: z.string().min(3, { message: "El SKU debe tener al menos 3 caracteres." }).transform(val => val.toUpperCase()),
    category: z.enum(['Lubricantes', 'Repuestos', 'Llantas', 'Accesorios']),
    location: z.string().min(1, "La ubicación es requerida."),
    supplier: z.string().min(1, "El proveedor es requerido."),
    quantity: z.coerce.number().int().positive("La cantidad debe ser un número positivo."),
    price: z.coerce.number().positive("El precio debe ser un número positivo."),
    supplierPrice: z.coerce.number().positive("El precio de proveedor debe ser un número positivo."),
    minimumQuantity: z.coerce.number().int().positive("La cantidad mínima debe ser un número positivo."),
})

export async function createInventoryItem(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const validatedFields = inventorySchema.safeParse({
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        location: formData.get('location'),
        supplier: formData.get('supplier'),
        quantity: formData.get('quantity'),
        price: formData.get('price'),
        supplierPrice: formData.get('supplierPrice'),
        minimumQuantity: formData.get('minimumQuantity'),
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const data = validatedFields.data

    const { data: existingSku } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .eq('sku', data.sku)
        .maybeSingle()
    if (existingSku) return { message: 'Ya existe un producto con este SKU en el inventario.' }

    const { data: existingName } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .ilike('name', data.name)
        .maybeSingle()
    if (existingName) return { message: 'Ya existe un producto con este nombre en el inventario.' }

    const { error } = await supabase
        .from('inventory_items')
        .insert({
            workshop_id: user.workshopId,
            name: data.name,
            sku: data.sku,
            category: data.category,
            location: data.location,
            supplier: data.supplier,
            quantity: data.quantity,
            price: data.price,
            // supplierPrice -> cost in DB
            cost: data.supplierPrice,
            min_quantity: data.minimumQuantity,
        })

    if (error) {
        console.error('Error creating inventory item:', error)
        return { message: 'Error al crear el artículo.' }
    }

    revalidatePath('/inventory')
    return { success: true }
}

export async function updateInventoryItem(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()
    const id = formData.get('id') as string

    if (!id) return { message: 'ID requerido' }

    const validatedFields = inventorySchema.safeParse({
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        location: formData.get('location'),
        supplier: formData.get('supplier'),
        quantity: formData.get('quantity'),
        price: formData.get('price'),
        supplierPrice: formData.get('supplierPrice'),
        minimumQuantity: formData.get('minimumQuantity'),
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const data = validatedFields.data

    const { data: existingSku } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .eq('sku', data.sku)
        .neq('id', id)
        .maybeSingle()
    if (existingSku) return { message: 'Ya existe otro producto con este SKU en el inventario.' }

    const { data: existingName } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .ilike('name', data.name)
        .neq('id', id)
        .maybeSingle()
    if (existingName) return { message: 'Ya existe otro producto con este nombre en el inventario.' }

    const { error } = await supabase
        .from('inventory_items')
        .update({
            name: data.name,
            sku: data.sku,
            category: data.category,
            location: data.location,
            supplier: data.supplier,
            quantity: data.quantity,
            price: data.price,
            cost: data.supplierPrice,
            min_quantity: data.minimumQuantity,
        })
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) {
        return { message: 'Error al actualizar.' }
    }

    revalidatePath('/inventory')
    return { success: true }
}

export async function deleteInventoryItem(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()
    const id = formData.get('id') as string

    // Check usage in sales (sale_items)
    const { count } = await supabase
        .from('sale_items')
        .select('*', { count: 'exact', head: true })
        .eq('inventory_item_id', id)
        .eq('workshop_id', user.workshopId)

    if (count && count > 0) {
        return { message: 'No se puede eliminar: Tiene ventas asociadas' }
    }

    const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) {
        return { message: 'Error al eliminar.' }
    }

    revalidatePath('/inventory')
    return { success: true }
}

export async function notifyAdminLowStock() {
    const user = await requireWorkshop();
    const supabase = await createClient();

    // Find the low stock items first
    const { data: inventoryItems } = await supabase
        .from('inventory_items')
        .select('name, quantity, min_quantity')
        .eq('workshop_id', user.workshopId);

    const lowStockItems = (inventoryItems || []).filter(item => item.quantity <= item.min_quantity);

    if (lowStockItems.length === 0) {
        return { message: 'No hay productos con bajo stock.' };
    }

    const lowStockItemsText = lowStockItems.map(item => `• ${item.name} (Quedan: ${item.quantity})`).join('\n');

    // Get the owner's phone number
    // First find the owner's user_id from workshop_members
    const { data: ownerMember } = await supabase
        .from('workshop_members')
        .select('user_id')
        .eq('workshop_id', user.workshopId)
        .eq('role', 'owner')
        .single();

    if (!ownerMember) {
        return { message: 'No se encontró al dueño del taller.' };
    }

    const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ownerAuth, error: authError } = await supabaseAdmin.auth.admin.getUserById(ownerMember.user_id);
    
    if (authError || !ownerAuth.user) {
        return { message: 'No se pudo obtener la información del dueño.' };
    }

    const ownerPhone = ownerAuth.user.user_metadata?.phone;
    const ownerName = ownerAuth.user.user_metadata?.full_name || 'Propietario';

    if (!ownerPhone) {
        return { message: 'El dueño no tiene un número de teléfono registrado.' };
    }

    // Get technician's name
    const { data: techAuth } = await supabaseAdmin.auth.admin.getUserById(user.userId);
    const techName = techAuth.user?.user_metadata?.full_name || 'Un técnico';

    // Send the message
    const result = await sendLowStockNotification(ownerPhone, ownerName, techName, lowStockItemsText);

    if (!result.success) {
        return { message: 'Hubo un error al enviar el mensaje de WhatsApp.' };
    }

    return { success: true };
}
