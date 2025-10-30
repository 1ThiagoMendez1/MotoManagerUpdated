/*  */'use server';

import { z } from 'zod';
import prisma from './prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withAuth } from './tenant';

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

export const createCustomer = withAuth(async (prevState: any, formData: FormData) => {
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
    console.log('📋 Data to create:', { name, email, phone, cedula });

    console.log('🔧 About to call prisma.customer.create with data:', {
      name,
      email,
      phone,
      cedula,
    });

    // Create customer using Prisma
    const createdCustomer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        cedula,
      },
    });

    console.log('✅ Created customer fetched:', createdCustomer);

    console.log('✅ Customer created successfully');

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    return {
      message: 'Error al crear el cliente.',
    };
  }
});

export const updateCustomer = withAuth(async (prevState: any, formData: FormData) => {
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
      where: { id },
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

export const deleteCustomer = withAuth(async (formData: FormData) => {
  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del cliente es requerido.',
    };
  }

  try {
    await prisma.customer.delete({
      where: { id },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al eliminar el cliente.',
    };
  }
});

export const createMotorcycle = withAuth(async (prevState: any, formData: FormData) => {
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
    console.log('📋 Data to create:', { make, model, year, plate, customerEmail, customerName, customerPhone, customerCedula });

    // First, handle customer creation/update
    const customerResult = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        name: customerName,
        phone: customerPhone,
        cedula: customerCedula,
      },
      create: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        cedula: customerCedula,
      },
    });

    console.log('✅ Customer handled:', customerResult);

    // Create motorcycle
    const createdMotorcycle = await prisma.motorcycle.create({
      data: {
        make,
        model,
        year,
        plate,
        customerId: customerResult.id,
      },
    });

    console.log('✅ Motorcycle created:', createdMotorcycle);

    console.log('✅ Created motorcycle fetched:', createdMotorcycle);

    revalidatePath('/motorcycles');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al crear la motocicleta.',
    };
  }
});

export const getCustomerByCedula = withAuth(async (cedula: string) => {
  try {
    console.log('getCustomerByCedula called with:', { cedula });
    const customer = await prisma.customer.findFirst({
      where: {
        cedula,
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

export const createWorkOrder = withAuth(async (prevState: any, formData: FormData) => {
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
      orderBy: { id: 'desc' },
    });
    const nextNumber = lastWorkOrder ? (parseInt(lastWorkOrder.workOrderNumber.replace('ORD-', '')) || 0) + 1 : 1;
    const workOrderNumber = `ORD-${nextNumber.toString().padStart(2, '0')}`;

    // Create work order using Prisma
    const createdWorkOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        motorcycleId,
        technicianId,
        issueDescription,
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

export const createTechnician = withAuth(async (prevState: any, formData: FormData) => {
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

    // Create technician using Prisma
    const createdTechnician = await prisma.technician.create({
      data: {
        name,
        specialty,
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

export const updateTechnician = withAuth(async (prevState: any, formData: FormData) => {
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
      where: { id },
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

export const deleteTechnician = withAuth(async (formData: FormData) => {
  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del técnico es requerido.',
    };
  }

  try {
    await prisma.technician.delete({
      where: { id },
    });

    revalidatePath('/technicians');
    return { success: true };
  } catch (error) {
    return {
      message: 'Error al eliminar el técnico.',
    };
  }
});

export const createInventoryItem = withAuth(async (prevState: any, formData: FormData) => {
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
    console.log('📋 Data to create:', { name, sku, category, location, supplier, quantity, price, supplierPrice, minimumQuantity });

    // Create inventory item using Prisma
    const createdInventoryItem = await prisma.inventoryItem.create({
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

export const updateInventoryItem = withAuth(async (prevState: any, formData: FormData) => {
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
      where: { id },
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

export const deleteInventoryItem = withAuth(async (prevState: any, formData: FormData) => {
  const id = formData.get('id') as string;

  if (!id) {
    return {
      message: 'ID del artículo es requerido.',
    };
  }

  try {
    await prisma.inventoryItem.delete({
      where: { id },
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

export const createSale = withAuth(async (prevState: any, formData: FormData) => {
  console.log('🔍 createSale called with auth wrapper');
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
    console.log('📋 Data to create:', { woId, lc, pm, d, saleItems });

    // Generate sale number
    const lastSale = await prisma.sale.findFirst({
      orderBy: { id: 'desc' },
    });
    const nextNumber = lastSale ? (parseInt(lastSale.saleNumber.replace('V', '')) || 0) + 1 : 1;
    const saleNumber = `V${nextNumber.toString().padStart(4, '0')}`;

    const itemsTotal = saleItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    const total = itemsTotal + (lc || 0);

    // Check inventory availability
    for (const item of saleItems || []) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: item.inventoryItemId },
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
            saleId: sale.id,
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            price: item.price,
          },
        });
        console.log('Service sale item created:', createdItem);

        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
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
        where: { id: woId },
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
      where: { id: saleData.id },
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

export const createDirectSale = withAuth(async (prevState: any, formData: FormData) => {
  console.log('🔍 createDirectSale called');

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
      orderBy: { id: 'desc' },
    });
    const nextNumber = lastSale ? (parseInt(lastSale.saleNumber.replace('V', '')) || 0) + 1 : 1;
    const saleNumber = `V${nextNumber.toString().padStart(4, '0')}`;

    const total = saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Check inventory availability
    for (const item of saleItems) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: item.inventoryItemId },
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
        orderBy: { id: 'desc' },
      });

      const saleNumber = lastSale
        ? `V${String(parseInt(lastSale.saleNumber.slice(1)) + 1).padStart(4, '0')}`
        : 'V0001';

      // Create sale
      const sale = await tx.sale.create({
        data: {
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
            saleId: sale.id,
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            price: item.price,
          },
        });

        // Update inventory
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
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
        customerName: saleData.customerName || 'Cliente de Mostrador',
        items: [], // Will be populated from saleItems if needed
      }
    };
  } catch (error) {
    console.error('❌ Error creating direct sale:', error);
    return {
      message: 'Error al crear la venta directa.',
    };
  }
});

export const updateWorkOrderStatus = withAuth(async (prevState: any, formData: FormData) => {
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
      where: { id },
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
