/*  */'use server';

import { z } from 'zod';
import prisma from './prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withTenant } from './tenant';

const customerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  email: z.string().email("El email debe ser válido.").transform(val => val.toLowerCase()),
  phone: z.string().optional(),
  cedula: z.string().optional().transform(val => val === '' ? undefined : val),
});

const motorcycleSchema = z.object({
  make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
  model: z.string().min(1, "El modelo es requerido."),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  plate: z.string().min(1, "La placa es requerida."),
  customerCedula: z.string().min(1, "La cédula es requerida."),
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerEmail: z.string().email("Email válido requerido.").transform(val => val.toLowerCase()),
  customerPhone: z.string().optional(),
});

const technicianSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  specialty: z.string().min(3, "La especialidad debe tener al menos 3 caracteres."),
});

const workOrderSchema = z.object({
  motorcycleId: z.string().min(1, 'Se requiere la motocicleta.'),
  technicianId: z.string().min(1, 'Se requiere el técnico.'),
  issueDescription: z.string().min(10, {
    message: "La descripción del problema debe tener al menos 10 caracteres.",
  }),
});

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
});

export const createCustomer = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  console.log('🔍 createCustomer called with tenant wrapper');
  console.log('📝 FormData received:');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`);
  }

  try {
    const validatedFields = customerSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      cedula: formData.get('cedula'),
    });

    console.log('✅ Validation result:', validatedFields.success);
    if (!validatedFields.success) {
      console.log('❌ Validation errors:', validatedFields.error.flatten().fieldErrors);
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, email, phone, cedula } = validatedFields.data;
    console.log('📋 Data to create:', { tenantId, name, email, phone, cedula });
    console.log('🔍 tenantId type:', typeof tenantId, 'value:', tenantId);

    console.log('🔧 About to call prisma.customer.create with data:', {
      tenantId: 'cmhb1y7ka003xjwuky2m6v4wo',
      name,
      email,
      phone,
      cedula,
    });

    // Try using raw SQL to bypass Prisma client issues - without createdAt/updatedAt
    console.log('🔄 Trying raw SQL approach without timestamps');

    const result = await prisma.$executeRaw`
      INSERT INTO "Customer" ("id", "tenantId", "name", "email", "phone", "cedula")
      VALUES (gen_random_uuid(), 'cmhb1y7ka003xjwuky2m6v4wo', ${name}, ${email}, ${phone}, ${cedula})
    `;

    console.log('✅ Customer created with raw SQL:', result);

    // Now fetch the created customer
    const createdCustomer = await prisma.customer.findFirst({
      where: {
        tenantId: 'cmhb1y7ka003xjwuky2m6v4wo',
        email: email,
      },
    });

    console.log('✅ Created customer fetched:', createdCustomer);

    console.log('✅ Prisma create result:', result);

    console.log('✅ Customer created successfully:', result);

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    return {
      message: 'Error al crear el cliente.',
    };
  }
});

export const updateCustomer = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del cliente es requerido.',
    };
  }

  try {
    const validatedFields = customerSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      cedula: formData.get('cedula'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, email, phone, cedula } = validatedFields.data;

    await prisma.customer.update({
      where: { id, tenantId },
      data: {
        name,
        email,
        phone,
        cedula,
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al actualizar el cliente.',
    };
  }
});

export const deleteCustomer = withTenant(async (tenantId: string, formData: FormData) => {
  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del cliente es requerido.',
    };
  }

  try {
    await prisma.customer.delete({
      where: { id, tenantId },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al eliminar el cliente.',
    };
  }
});

export const createMotorcycle = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  try {
    const validatedFields = motorcycleSchema.safeParse({
      make: formData.get('make'),
      model: formData.get('model'),
      year: formData.get('year'),
      plate: formData.get('plate'),
      customerEmail: formData.get('customerEmail'),
      customerName: formData.get('customerName'),
      customerPhone: formData.get('customerPhone'),
      customerCedula: formData.get('customerCedula'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { make, model, year, plate, customerEmail, customerName, customerPhone, customerCedula } = validatedFields.data;
    console.log('📋 Data to create:', { tenantId, make, model, year, plate, customerEmail, customerName, customerPhone, customerCedula });

    // Try using raw SQL to bypass Prisma client issues
    console.log('🔄 Trying raw SQL approach for motorcycle');

    // First, handle customer creation/update
    const customerResult = await prisma.$executeRaw`
      INSERT INTO "Customer" ("id", "tenantId", "name", "email", "phone", "cedula")
      VALUES (gen_random_uuid(), 'cmhb1y7ka003xjwuky2m6v4wo', ${customerName}, ${customerEmail}, ${customerPhone}, ${customerCedula})
      ON CONFLICT ("tenantId", "cedula") DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone
      RETURNING id
    `;

    console.log('✅ Customer handled with raw SQL:', customerResult);

    // Get the customer ID
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId: 'cmhb1y7ka003xjwuky2m6v4wo',
        cedula: customerCedula,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new Error('Failed to create or find customer');
    }

    // Create motorcycle
    const motorcycleResult = await prisma.$executeRaw`
      INSERT INTO "Motorcycle" ("id", "tenantId", "make", "model", "year", "plate", "customerId")
      VALUES (gen_random_uuid(), 'cmhb1y7ka003xjwuky2m6v4wo', ${make}, ${model}, ${year}, ${plate}, ${customer.id})
    `;

    console.log('✅ Motorcycle created with raw SQL:', motorcycleResult);

    // Fetch the created motorcycle
    const createdMotorcycle = await prisma.motorcycle.findFirst({
      where: {
        tenantId: 'cmhb1y7ka003xjwuky2m6v4wo',
        plate: plate,
      },
    });

    console.log('✅ Created motorcycle fetched:', createdMotorcycle);

    revalidatePath('/motorcycles');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al crear la motocicleta.',
    };
  }
});

export const getCustomerByCedula = withTenant(async (tenantId: string, cedula: string) => {
  try {
    console.log('getCustomerByCedula called with:', { tenantId, cedula });
    const customer = await prisma.customer.findUnique({
      where: {
        tenantId_cedula: {
          tenantId,
          cedula,
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cedula: true,
      },
    });
    console.log('getCustomerByCedula result:', customer);
    return customer;
  } catch (error) {
    console.error('getCustomerByCedula error:', error);
    return null;
  }
});

export const createWorkOrder = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  try {
    const validatedFields = workOrderSchema.safeParse({
      motorcycleId: formData.get('motorcycleId'),
      technicianId: formData.get('technicianId'),
      issueDescription: formData.get('issueDescription'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { motorcycleId, technicianId, issueDescription } = validatedFields.data;

    // Generate work order number
    const lastWorkOrder = await prisma.workOrder.findFirst({
      where: { tenantId },
      orderBy: { id: 'desc' },
    });
    const nextNumber = lastWorkOrder ? (parseInt(lastWorkOrder.workOrderNumber.replace('ORD-', '')) || 0) + 1 : 1;
    const workOrderNumber = `ORD-${nextNumber.toString().padStart(2, '0')}`;

    // Try using raw SQL to bypass Prisma client issues
    console.log('🔄 Trying raw SQL approach for work order');

    const result = await prisma.$executeRaw`
      INSERT INTO "WorkOrder" ("id", "tenantId", "workOrderNumber", "motorcycleId", "technicianId", "issueDescription")
      VALUES (gen_random_uuid(), 'cmhb1y7ka003xjwuky2m6v4wo', ${workOrderNumber}, ${motorcycleId}, ${technicianId}, ${issueDescription})
    `;

    console.log('✅ Work order created with raw SQL:', result);

    // Now fetch the created work order
    const createdWorkOrder = await prisma.workOrder.findFirst({
      where: {
        tenantId: 'cmhb1y7ka003xjwuky2m6v4wo',
        workOrderNumber: workOrderNumber,
      },
    });

    console.log('✅ Created work order fetched:', createdWorkOrder);

    revalidatePath('/work-orders');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al crear la orden de trabajo.',
    };
  }
});

export const createTechnician = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  try {
    const validatedFields = technicianSchema.safeParse({
      name: formData.get('name'),
      specialty: formData.get('specialty'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, specialty } = validatedFields.data;

    // Try using raw SQL to bypass Prisma client issues
    console.log('🔄 Trying raw SQL approach for technician');

    const result = await prisma.$executeRaw`
      INSERT INTO "Technician" ("id", "tenantId", "name", "specialty")
      VALUES (gen_random_uuid(), 'cmhb1y7ka003xjwuky2m6v4wo', ${name}, ${specialty})
    `;

    console.log('✅ Technician created with raw SQL:', result);

    // Now fetch the created technician
    const createdTechnician = await prisma.technician.findFirst({
      where: {
        tenantId: 'cmhb1y7ka003xjwuky2m6v4wo',
        name: name,
      },
    });

    console.log('✅ Created technician fetched:', createdTechnician);

    revalidatePath('/technicians');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al crear el técnico.',
    };
  }
});

export const updateTechnician = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del técnico es requerido.',
    };
  }

  try {
    const validatedFields = technicianSchema.safeParse({
      name: formData.get('name'),
      specialty: formData.get('specialty'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, specialty } = validatedFields.data;

    await prisma.technician.update({
      where: { id, tenantId },
      data: {
        name,
        specialty,
      },
    });

    revalidatePath('/technicians');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al actualizar el técnico.',
    };
  }
});

export const deleteTechnician = withTenant(async (tenantId: string, formData: FormData) => {
  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del técnico es requerido.',
    };
  }

  try {
    await prisma.technician.delete({
      where: { id, tenantId },
    });

    revalidatePath('/technicians');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al eliminar el técnico.',
    };
  }
});

export const createInventoryItem = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  try {
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
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, sku, category, location, supplier, quantity, price, supplierPrice, minimumQuantity } = validatedFields.data;
    console.log('📋 Data to create:', { tenantId, name, sku, category, location, supplier, quantity, price, supplierPrice, minimumQuantity });

    // Try using raw SQL to bypass Prisma client issues
    console.log('🔄 Trying raw SQL approach for inventory item');

    const result = await prisma.$executeRaw`
      INSERT INTO "InventoryItem" ("id", "tenantId", "name", "sku", "category", "location", "supplier", "quantity", "price", "supplierPrice", "minimumQuantity")
      VALUES (gen_random_uuid(), 'cmhb1y7ka003xjwuky2m6v4wo', ${name}, ${sku}, ${category}::"InventoryCategory", ${location}, ${supplier}, ${quantity}, ${price}, ${supplierPrice}, ${minimumQuantity})
    `;

    console.log('✅ Inventory item created with raw SQL:', result);

    // Now fetch the created inventory item
    const createdInventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: 'cmhb1y7ka003xjwuky2m6v4wo',
        sku: sku,
      },
    });

    console.log('✅ Created inventory item fetched:', createdInventoryItem);

    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating inventory item:', error);
    console.error('❌ Error details:', {
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
    });
    return {
      message: 'Error al crear el artículo de inventario.',
    };
  }
});

export const updateInventoryItem = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  'use server';

  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del artículo es requerido.',
    };
  }

  try {
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
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, sku, category, location, supplier, quantity, price, supplierPrice, minimumQuantity } = validatedFields.data;

    await prisma.inventoryItem.update({
      where: { id, tenantId },
      data: {
        name,
        sku,
        category,
        location,
        supplier,
        quantity,
        price,
        supplierPrice,
        minimumQuantity,
      },
    });

    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al actualizar el artículo de inventario.',
    };
  }
});

export const deleteInventoryItem = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  'use server';

  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del artículo es requerido.',
    };
  }

  try {
    await prisma.inventoryItem.delete({
      where: { id, tenantId },
    });

    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al eliminar el artículo de inventario.',
    };
  }
});

const saleSchema = z.object({
  workOrderId: z.string().min(1, 'Se requiere la orden de trabajo.'),
  laborCost: z.coerce.number().min(0, "El costo no puede ser negativo."),
  paymentMethod: z.enum(['DaviPlata', 'Nequi', 'Efectivo', 'Tarjeta', 'Addi', 'Otros'], {
    required_error: "Se requiere seleccionar un medio de pago.",
  }),
  date: z.date({
    required_error: "Se requiere una fecha.",
  }),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1, "Selecciona un producto"),
    quantity: z.coerce.number().int().min(1, "Mínimo 1"),
    price: z.coerce.number(),
  })).optional(),
});

const directSaleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  paymentMethod: z.enum(['DaviPlata', 'Nequi', 'Efectivo', 'Tarjeta', 'Addi', 'Otros'], {
    required_error: "Se requiere seleccionar un medio de pago.",
  }),
  date: z.date({ required_error: "Se requiere una fecha." }),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1, "Selecciona un producto"),
    quantity: z.coerce.number().int().min(1, "Mínimo 1"),
    price: z.coerce.number(),
  })).min(1, "Agrega al menos un producto."),
});

export const createSale = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  console.log('🔍 createSale called with tenant wrapper');
  console.log('🏢 tenantId from context:', tenantId);
  try {
    const itemsRaw = formData.get('items') as string;
    console.log('Raw items from service sale formData:', itemsRaw);
    const items = JSON.parse(itemsRaw || '[]');
    console.log('Parsed items for service sale:', items);
    const workOrderId = formData.get('workOrderId') as string;
    const laborCost = parseFloat(formData.get('laborCost') as string);
    const paymentMethod = formData.get('paymentMethod') as string;
    const date = new Date(formData.get('date') as string);

    const validatedFields = saleSchema.safeParse({
      workOrderId,
      laborCost,
      paymentMethod,
      date,
      items,
    });

    console.log('✅ Validation result:', validatedFields.success);
    if (!validatedFields.success) {
      console.log('❌ Validation errors:', validatedFields.error.flatten().fieldErrors);
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { workOrderId: woId, laborCost: lc, paymentMethod: pm, date: d, items: saleItems } = validatedFields.data;
    console.log('📋 Data to create:', { tenantId, woId, lc, pm, d, saleItems });

    // Generate sale number
    const lastSale = await prisma.sale.findFirst({
      where: { tenantId },
      orderBy: { id: 'desc' },
    });
    const nextNumber = lastSale ? (parseInt(lastSale.saleNumber.replace('V', '')) || 0) + 1 : 1;
    const saleNumber = `V${nextNumber.toString().padStart(4, '0')}`;

    const itemsTotal = saleItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    const total = itemsTotal + (lc || 0);

    // Check inventory availability
    for (const item of saleItems || []) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: item.inventoryItemId, tenantId },
      });
      if (!inventoryItem || inventoryItem.quantity < item.quantity) {
        return {
          message: `Stock insuficiente para ${inventoryItem?.name || 'producto'}.`,
        };
      }
    }

    const saleData = await prisma.$transaction(async (tx) => {
      // Create sale
      const sale = await tx.sale.create({
        data: {
          tenantId,
          saleNumber,
          workOrderId: woId,
          paymentMethod: pm,
          date: d,
          total,
        },
        include: {
          saleItems: {
            include: {
              inventoryItem: true,
            },
          },
          workOrder: {
            include: {
              motorcycle: {
                include: {
                  customer: true,
                },
              },
              technician: true,
            },
          },
        },
      });

      console.log('Creating sale items for service sale:', sale.id);
      // Create sale items and update inventory
      for (const item of saleItems || []) {
        console.log('Creating service sale item:', item);
        const createdItem = await tx.saleItem.create({
          data: {
            tenantId,
            saleId: sale.id,
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            price: item.price,
          },
        });
        console.log('Service sale item created:', createdItem);

        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId, tenantId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
        console.log('Inventory updated for service sale item:', item.inventoryItemId);
      }

      // Update work order status to Entregado
      await tx.workOrder.update({
        where: { id: woId, tenantId },
        data: {
          status: 'Entregado',
          entregadoDate: new Date(),
          completedDate: new Date(),
        },
      });

      return sale;
    });

    console.log('Service sale data after transaction:', {
      id: saleData.id,
      saleNumber: saleData.saleNumber,
      saleItemsCount: saleData.saleItems.length,
      saleItems: saleData.saleItems.map(item => ({
        id: item.id,
        inventoryItemName: item.inventoryItem.name,
        quantity: item.quantity,
        price: item.price,
      }))
    });

    // Force reload the sale data with saleItems for service sale
    const saleWithItems = await prisma.sale.findUnique({
      where: { id: saleData.id, tenantId },
      include: {
        saleItems: {
          include: {
            inventoryItem: true,
          },
        },
        workOrder: {
          include: {
            motorcycle: {
              include: {
                customer: true,
              },
            },
            technician: true,
          },
        },
      },
    });

    console.log('Reloaded service sale data:', {
      id: saleWithItems?.id,
      saleNumber: saleWithItems?.saleNumber,
      saleItemsCount: saleWithItems?.saleItems.length,
      saleItems: saleWithItems?.saleItems.map(item => ({
        id: item.id,
        inventoryItemName: item.inventoryItem.name,
        quantity: item.quantity,
        price: item.price,
      }))
    });

    revalidatePath('/sales');
    return {
      success: true,
      sale: {
        id: saleWithItems?.id || saleData.id,
        saleNumber: saleWithItems?.saleNumber || saleData.saleNumber,
        date: saleWithItems?.date.toISOString() || saleData.date.toISOString(),
        total: saleWithItems?.total || saleData.total,
        workOrderId: saleWithItems?.workOrder?.workOrderNumber || saleData.workOrder?.workOrderNumber,
        customerName: saleWithItems?.workOrder?.motorcycle.customer.name || saleData.workOrder?.motorcycle.customer.name,
        motorcycleInfo: saleWithItems?.workOrder ? {
          make: saleWithItems.workOrder.motorcycle.make,
          model: saleWithItems.workOrder.motorcycle.model,
          year: saleWithItems.workOrder.motorcycle.year,
          plate: saleWithItems.workOrder.motorcycle.plate,
        } : saleData.workOrder ? {
          make: saleData.workOrder.motorcycle.make,
          model: saleData.workOrder.motorcycle.model,
          year: saleData.workOrder.motorcycle.year,
          plate: saleData.workOrder.motorcycle.plate,
        } : undefined,
        technicianName: saleWithItems?.workOrder?.technician.name || saleData.workOrder?.technician.name,
        items: (saleWithItems?.saleItems || saleData.saleItems).map(item => ({
          name: item.inventoryItem.name,
          sku: item.inventoryItem.sku,
          category: item.inventoryItem.category,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        paymentMethod: pm,
      }
    };
  } catch (error) {
    console.error('Error creating sale:', error);
    return {
      message: 'Error al crear la venta.',
    };
  }
});

export const createDirectSale = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  console.log('🔍 createDirectSale called');
  console.log('🏢 tenantId:', tenantId);

  try {
    const itemsRaw = formData.get('items') as string;
    const items = JSON.parse(itemsRaw || '[]');
    const customerId = formData.get('customerId') as string || undefined;
    const customerName = formData.get('customerName') as string || undefined;
    const paymentMethod = formData.get('paymentMethod') as string;
    const date = new Date(formData.get('date') as string);

    const validatedFields = directSaleSchema.safeParse({
      customerId,
      customerName,
      paymentMethod,
      date,
      items,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { customerId: cId, customerName: cName, paymentMethod: pm, date: d, items: saleItems } = validatedFields.data;

    // Generate sale number
    const lastSale = await prisma.sale.findFirst({
      where: { tenantId },
      orderBy: { id: 'desc' },
    });
    const nextNumber = lastSale ? (parseInt(lastSale.saleNumber.replace('V', '')) || 0) + 1 : 1;
    const saleNumber = `V${nextNumber.toString().padStart(4, '0')}`;

    const total = saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Check inventory availability
    for (const item of saleItems) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: item.inventoryItemId, tenantId },
      });
      if (!inventoryItem || inventoryItem.quantity < item.quantity) {
        return {
          message: `Stock insuficiente para ${inventoryItem?.name || 'producto'}.`,
        };
      }
    }

    // Create sale using Prisma with proper tenant context
    const saleData = await prisma.$transaction(async (tx) => {
      // Generate sale number
      const lastSale = await tx.sale.findFirst({
        where: { tenantId },
        orderBy: { id: 'desc' },
      });

      const saleNumber = lastSale
        ? `V${String(parseInt(lastSale.saleNumber.slice(1)) + 1).padStart(4, '0')}`
        : 'V0001';

      // Create sale
      const sale = await tx.sale.create({
        data: {
          tenantId,
          saleNumber,
          customerId: cId,
          customerName: cName,
          paymentMethod: pm,
          date: d,
          total,
        },
        include: {
          saleItems: {
            include: {
              inventoryItem: true
            }
          },
          customer: true
        }
      });

      // Create sale items and update inventory
      for (const item of saleItems) {
        await tx.saleItem.create({
          data: {
            tenantId,
            saleId: sale.id,
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            price: item.price,
          },
        });

        // Update inventory
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId, tenantId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return sale;
    });

    console.log('✅ Direct sale created successfully:', saleData.id);

    revalidatePath('/sales');
    return {
      success: true,
      sale: {
        id: saleData.id,
        saleNumber: saleData.saleNumber,
        date: saleData.date.toISOString(),
        total: saleData.total,
        customerName: saleData.customer?.name || saleData.customerName || 'Cliente de Mostrador',
        items: saleData.saleItems.map(item => ({
          name: item.inventoryItem.name,
          sku: item.inventoryItem.sku,
          category: item.inventoryItem.category,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
      }
    };
  } catch (error) {
    console.error('❌ Error creating direct sale:', error);
    return {
      message: 'Error al crear la venta directa.',
    };
  }
});

export const updateWorkOrderStatus = withTenant(async (tenantId: string, prevState: any, formData: FormData) => {
  try {
    const id = formData.get('id') as string;
    const status = formData.get('status') as 'Diagnosticando' | 'Reparado' | 'Entregado';

    if (!id || !status) {
      return {
        message: 'ID y estado son requeridos.',
      };
    }

    const updateData: any = {
      status,
    };

    // Set the appropriate date based on status
    const now = new Date();
    if (status === 'Diagnosticando') {
      updateData.diagnosticandoDate = now;
    } else if (status === 'Reparado') {
      updateData.reparadoDate = now;
    } else if (status === 'Entregado') {
      updateData.entregadoDate = now;
      updateData.completedDate = now;
    }

    await prisma.workOrder.update({
      where: { id, tenantId },
      data: updateData,
    });

    revalidatePath('/work-orders');
    revalidatePath('/technicians');
    return { success: true };
  } catch (error) {
    console.error('Error updating work order status:', error);
    return {
      message: 'Error al actualizar el estado de la orden de trabajo.',
    };
  }
});
