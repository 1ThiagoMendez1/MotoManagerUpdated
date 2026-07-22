'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';



import { revalidatePath } from 'next/cache'
import { z } from 'zod'


const technicianSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    specialty: z.string().min(3, "La especialidad debe tener al menos 3 caracteres."),
})

export async function createTechnician(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;

    const validatedFields = technicianSchema.safeParse({
        name: formData.get('name'),
        specialty: formData.get('specialty'),
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const { name, specialty } = validatedFields.data

    // Verificar que no exista ya un técnico con el mismo nombre en este taller
    const { data: existingTechnician, error: techError } = await supabase
        .from('tecnicos_activos')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .ilike('name', name)
        .maybeSingle()
        
    if (techError) return { message: 'Error al verificar la disponibilidad del nombre del técnico.' }

    if (existingTechnician) {
        return { message: 'Ya existe un técnico con este nombre en tu taller.' }
    }

    const { error } = await supabase
        .from('tecnicos_activos')
        .insert({
            workshop_id: user.workshopId,
            name,
            specialty,
        })

    if (error) {
        return { message: 'Error al crear técnico.' }
    }

    revalidatePath('/technicians')
    return { success: true }
}

export async function updateTechnician(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
    const id = formData.get('id') as string

    if (!id) return { message: 'ID requerido' }

    const validatedFields = technicianSchema.safeParse({
        name: formData.get('name'),
        specialty: formData.get('specialty'),
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const { name, specialty } = validatedFields.data

    // Verificar que no exista ya otro técnico con el mismo nombre en este taller
    const { data: existingTechnician, error: techError } = await supabase
        .from('tecnicos_activos')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .ilike('name', name)
        .neq('id', id)
        .maybeSingle()
        
    if (techError) return { message: 'Error al verificar la disponibilidad del nombre del técnico.' }

    if (existingTechnician) {
        return { message: 'Ya existe otro técnico con este nombre en tu taller.' }
    }

    const { error } = await supabase
        .from('tecnicos_activos')
        .update({ name, specialty })
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) {
        return { message: 'Error al actualizar.' }
    }

    revalidatePath('/technicians')
    return { success: true }
}

export async function deleteTechnician(formData: FormData) {
    const user = await requireWorkshop()
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
    const id = formData.get('id') as string

    // Check work orders
    const { count: woCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('technician_id', id)
        .eq('workshop_id', user.workshopId)

    if (woCount && woCount > 0) {
        return { message: 'No se puede eliminar: Tiene órdenes de trabajo asociadas' }
    }

    const { error } = await supabase
        .from('tecnicos_activos')
        .delete()
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) {
        return { message: 'Error al eliminar.' }
    }

    revalidatePath('/technicians')
    return { success: true }
}
