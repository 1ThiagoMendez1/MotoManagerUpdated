'use server';

import { z } from 'zod';
import prisma from './prisma';
import { revalidatePath } from 'next/cache';

const serviceSaleSchema = z.object({
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

export const createServiceSaleNew = async (prevState: any, formData: FormData) => {
  const tenantId = 'cmhb1y7ka003xjwuky2m6v4wo'; // Hardcoded for testing
  console.log('🔍 createServiceSaleNew called');
  console.log('🏢 tenantId:', tenantId);

  try {
    const itemsRaw = formData.get('items') as string;
    console.log('Raw items from service sale formData:', itemsRaw);
    const items = JSON.parse(itemsRaw || '[]');
    console.log('Parsed items for service sale:', items);
    const workOrderId = formData.get('workOrderId') as string;
    const laborCost = parseFloat(formData.get('laborCost') as string);
    const paymentMethod = formData.get('paymentMethod') as string;
    const date = new Date(formData.get('date') as string);

    const validatedFields = serviceSaleSchema.safeParse({
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

    // Generate unique sale number
    let saleNumber;
    let attemptsGen = 0;
    const maxAttemptsGen = 10;

    do {
      const lastSale = await prisma.sale.findFirst({
        where: { tenantId },
        orderBy: { saleNumber: 'desc' },
      });

      const nextNumber = lastSale ? (parseInt(lastSale.saleNumber.replace('V', '')) || 0) + 1 : 1;
      saleNumber = `V${nextNumber.toString().padStart(4, '0')}`;

      // Check if this sale number already exists
      const existingSale = await prisma.sale.findUnique({
        where: {
          tenantId_saleNumber: {
            tenantId,
            saleNumber,
          },
        },
      });

      if (!existingSale) {
        break; // Sale number is unique
      }

      attemptsGen++;
      if (attemptsGen >= maxAttemptsGen) {
        throw new Error('Unable to generate unique sale number after multiple attempts');
      }

      // Wait a bit before trying again
      await new Promise(resolve => setTimeout(resolve, 10));
    } while (true);

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

    // Create sale using raw SQL to avoid Prisma transaction issues
    console.log('🔄 Using raw SQL approach for service sale');

    // Create sale with raw SQL and return the ID
    const saleResult = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Sale" ("id", "tenantId", "saleNumber", "workOrderId", "paymentMethod", "date", "total")
      VALUES (gen_random_uuid(), ${tenantId}, ${saleNumber}, ${woId}, ${pm}, ${d}, ${total})
      RETURNING id
    `;

    const saleId = saleResult[0].id;
    console.log('Created service sale with ID:', saleId);

    // Force create sale items first, then get the sale
    console.log('Force creating sale items before retrieving sale...');
    for (const item of saleItems || []) {
      console.log('Force creating service item:', item);
      await prisma.$executeRaw`
        INSERT INTO "SaleItem" ("id", "tenantId", "saleId", "inventoryItemId", "quantity", "price")
        VALUES (gen_random_uuid(), ${tenantId}, ${saleId}, ${item.inventoryItemId}, ${item.quantity}, ${item.price})
        ON CONFLICT ("tenantId", "saleId", "inventoryItemId") DO UPDATE SET
          quantity = EXCLUDED.quantity,
          price = EXCLUDED.price
      `;
      console.log('Force service sale item created/updated for:', item.inventoryItemId);

      // Update inventory
      await prisma.inventoryItem.update({
        where: { id: item.inventoryItemId, tenantId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Now get the sale with items
    const createdSale = await prisma.sale.findUnique({
      where: {
        id: saleId,
        tenantId,
      },
      include: {
        saleItems: {
          include: {
            inventoryItem: true
          }
        },
        workOrder: {
          include: {
            motorcycle: {
              include: {
                customer: true
              }
            },
            technician: true
          }
        }
      }
    });

    if (!createdSale) {
      throw new Error('Failed to retrieve created sale');
    }

    console.log(`Final service sale has ${createdSale.saleItems.length} items`);

    // Update work order status to Entregado
    await prisma.workOrder.update({
      where: { id: woId, tenantId },
      data: {
        status: 'Entregado',
        entregadoDate: new Date(),
        completedDate: new Date(),
      },
    });

    // Items are already created above, just update inventory (already done)

    console.log('Service sale data after creation:', {
      id: createdSale.id,
      saleNumber: createdSale.saleNumber,
      saleItemsCount: createdSale.saleItems.length,
      saleItems: createdSale.saleItems.map(item => ({
        id: item.id,
        inventoryItemName: item.inventoryItem.name,
        quantity: item.quantity,
        price: item.price,
      }))
    });
    console.log('Sale data for receipt:', {
      id: createdSale.id,
      saleNumber: createdSale.saleNumber,
      itemsCount: createdSale.saleItems.length,
      items: createdSale.saleItems.map(item => ({
        name: item.inventoryItem.name,
        sku: item.inventoryItem.sku,
        quantity: item.quantity,
        price: item.price,
      }))
    });

    revalidatePath('/sales');
    return {
      success: true,
      sale: {
        id: createdSale.id,
        saleNumber: createdSale.saleNumber,
        date: createdSale.date.toISOString(),
        total: createdSale.total,
        paymentMethod: pm,
        workOrderId: createdSale.workOrder?.workOrderNumber || woId,
        customerName: createdSale.workOrder?.motorcycle.customer.name,
        motorcycleInfo: createdSale.workOrder ? {
          make: createdSale.workOrder.motorcycle.make,
          model: createdSale.workOrder.motorcycle.model,
          year: createdSale.workOrder.motorcycle.year,
          plate: createdSale.workOrder.motorcycle.plate,
        } : undefined,
        technicianName: createdSale.workOrder?.technician.name,
        laborCost: lc > 0 ? lc : undefined,
        items: createdSale.saleItems.map(item => ({
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
    console.error('Error creating service sale:', error);
    return {
      message: 'Error al crear la venta de servicio.',
    };
  }
};