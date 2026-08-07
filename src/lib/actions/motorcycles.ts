'use server';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const motorcycleSchema = z.object({
    make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
    model: z.string().min(1, "El modelo es requerido."),
    year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    plate: z.string().min(1, "La placa es requerida."),
    vin: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()), z.string().optional()),
    engineDisplacementCc: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().optional()),
    color: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()), z.string().optional()),
    currentMileage: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().optional()),
    engineNumber: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()), z.string().optional()),
    chassisNumber: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()), z.string().optional()),
    customerCedula: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
        z.string().optional()
    ),
    customerName: z.string().min(1, "El nombre del cliente es requerido."),
    customerEmail: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim().toLowerCase()),
        z.string().email("Email válido requerido.").optional()
    ),
    customerPhone: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
        z.string().optional()
    ),
    issueDescription: z.string().min(10, "La descripción del problema debe tener al menos 10 caracteres."),
});

// Helper para separar nombres
function splitName(fullName: string) {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'N/A';
    return { firstName, lastName };
}

export async function createMotorcycle(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const formDataObj = {
        make: formData.get('make'),
        model: formData.get('model'),
        year: formData.get('year'),
        plate: formData.get('plate'),
        vin: formData.get('vin'),
        engineDisplacementCc: formData.get('engineDisplacementCc'),
        color: formData.get('color'),
        currentMileage: formData.get('currentMileage'),
        engineNumber: formData.get('engineNumber'),
        chassisNumber: formData.get('chassisNumber'),
        customerEmail: formData.get('customerEmail'),
        customerName: formData.get('customerName'),
        customerPhone: formData.get('customerPhone'),
        customerCedula: formData.get('customerCedula'),
        issueDescription: formData.get('issueDescription'),
    };

    const validatedFields = motorcycleSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { make, model, year, plate, vin, engineDisplacementCc, color, currentMileage, engineNumber, chassisNumber, customerEmail, customerName, customerPhone, customerCedula, issueDescription } = validatedFields.data;

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    const { data: existingPlates } = await supabaseAdmin
        .from('motorcycles')
        .select('id, organization_id')
        .ilike('license_plate', plate.trim());

    if (existingPlates && existingPlates.length > 0) {
        const inSameWorkshop = existingPlates.find(p => p.organization_id === user.workshopId);
        if (inSameWorkshop) {
            return { message: 'Ya existe una motocicleta con esta placa en el taller.' };
        } else {
            return { message: 'Esta motocicleta ya está registrada en otro taller.' };
        }
    }

    // 1. Find or Create Customer
    let customer: { id: string } | null = null;
    const { firstName, lastName } = splitName(customerName);

    if (customerCedula) {
        const { data: customerByCedula } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('document_number', customerCedula)
            .maybeSingle();
        if (customerByCedula) customer = customerByCedula;
    }

    if (!customer && customerEmail) {
        const { data: customerByEmail } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('email', customerEmail)
            .maybeSingle();
        if (customerByEmail) customer = customerByEmail;
    }

    if (customer) {
        // Update existing customer info
        await supabase.from('customers').update({
            first_name: firstName,
            last_name: lastName,
            ...(customerEmail ? { email: customerEmail } : {}),
            ...(customerPhone ? { phone: customerPhone } : {}),
            ...(customerCedula ? { document_number: customerCedula } : {}),
        }).eq('id', customer.id);
    } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
                organization_id: user.workshopId,
                first_name: firstName,
                last_name: lastName,
                email: customerEmail || null,
                document_number: customerCedula || null,
                phone: customerPhone || null
            })
            .select('id')
            .single();

        if (createError) {
            console.error("Error creating customer for motorcycle:", createError);
            return { message: "Error al crear cliente: " + createError.message };
        }
        customer = newCustomer;
    }

    if (!customer) return { message: 'No se pudo asignar el cliente' };

    // 2. Create Motorcycle
    const { error: motoError } = await supabase
        .from('motorcycles')
        .insert({
            organization_id: user.workshopId,
            customer_id: customer.id,
            brand: make,
            model,
            model_year: year,
            license_plate: plate,
            vin: vin || null,
            engine_displacement_cc: engineDisplacementCc || null,
            color: color || null,
            current_mileage: currentMileage || null,
            engine_number: engineNumber || null,
            chassis_number: chassisNumber || null,
            notes: issueDescription
        });

    if (motoError) {
        console.error('Error creating motorcycle:', motoError);
        return { message: 'Error al crear motocicleta: ' + motoError.message };
    }

    revalidatePath('/motorcycles');
    revalidatePath('/customers');
    revalidatePath('/sales');
    revalidatePath('/work-orders');
    revalidatePath('/', 'layout');
    return { success: true };
}
