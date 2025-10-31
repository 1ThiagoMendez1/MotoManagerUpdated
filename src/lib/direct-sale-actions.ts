'use server';

import { z } from 'zod';
import prisma from './prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from './tenant';
import evolutionAPI from './whatsapp';

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
  discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
});

export const createDirectSaleNew = withAuth(async (prevState: any, formData: FormData) => {
  console.log('🔍 createDirectSaleNew called');

  try {
    const itemsRaw = formData.get('items') as string;
    const items = JSON.parse(itemsRaw || '[]');
    const customerId = formData.get('customerId') as string || undefined;
    const customerName = formData.get('customerName') as string || undefined;
    const paymentMethod = formData.get('paymentMethod') as string;
    const date = new Date(formData.get('date') as string);
    const discountPercentage = parseFloat(formData.get('discountPercentage') as string) || 0;

    const validatedFields = directSaleSchema.safeParse({
      customerId,
      customerName,
      paymentMethod,
      date,
      items,
      discountPercentage,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { customerId: cId, customerName: cName, paymentMethod: pm, date: d, items: saleItems, discountPercentage: dp } = validatedFields.data;

    const subtotal = saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = subtotal * ((dp || 0) / 100);
    const total = subtotal - discountAmount;

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

    // Create sale using raw SQL to avoid Prisma transaction issues
    console.log('🔄 Using raw SQL approach for direct sale');

    // Generate unique sale number
    let saleNumber;
    let attemptsGen = 0;
    const maxAttemptsGen = 10;

    do {
      const lastSale = await prisma.sale.findFirst({
        orderBy: { saleNumber: 'desc' },
      });

      const nextNumber = lastSale ? (parseInt(lastSale.saleNumber.replace('V', '')) || 0) + 1 : 1;
      saleNumber = `V${nextNumber.toString().padStart(4, '0')}`;

      // Check if this sale number already exists
      const existingSale = await prisma.sale.findFirst({
        where: {
          saleNumber,
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

    // Create sale with raw SQL and return the ID
    const saleResult = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Sale" ("id", "saleNumber", "customerId", "customerName", "paymentMethod", "date", "total")
      VALUES (gen_random_uuid(), ${saleNumber}, ${cId}, ${cName}, ${pm}, ${d}, ${total})
      RETURNING id
    `;

    const saleId = saleResult[0].id;
    console.log('Created sale with ID:', saleId);

    // Force create sale items first, then get the sale
    console.log('Force creating sale items before retrieving sale...');
    for (const item of saleItems) {
      console.log('Force creating item:', item);
      await prisma.$executeRaw`
        INSERT INTO "SaleItem" ("id", "saleId", "inventoryItemId", "quantity", "price")
        VALUES (gen_random_uuid(), ${saleId}, ${item.inventoryItemId}, ${item.quantity}, ${item.price})
        ON CONFLICT ("saleId", "inventoryItemId") DO UPDATE SET
          quantity = EXCLUDED.quantity,
          price = EXCLUDED.price
      `;
      console.log('Force sale item created/updated for:', item.inventoryItemId);

      // Update inventory
      await prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
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

    if (!createdSale) {
      throw new Error('Failed to retrieve created sale');
    }

    console.log(`Final sale has ${createdSale.saleItems.length} items`);

    if (!createdSale) {
      throw new Error('Failed to create sale');
    }

    // Items are already created above, just update inventory
    for (const item of saleItems) {
      // Update inventory (already done above, but keeping for consistency)
      await prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
      console.log('Inventory updated for:', item.inventoryItemId);
    }

    const saleData = createdSale;

    console.log('✅ Direct sale created successfully:', saleData.id);
    console.log('Sale data for receipt:', {
      id: saleData.id,
      saleNumber: saleData.saleNumber,
      subtotal: subtotal,
      discountPercentage: dp || 0,
      discountAmount: discountAmount,
      total: total,
      itemsCount: saleData.saleItems.length,
      items: saleData.saleItems.map(item => ({
        name: item.inventoryItem.name,
        sku: item.inventoryItem.sku,
        quantity: item.quantity,
        price: item.price,
      }))
    });

    // Send WhatsApp notification if customer has phone
    if (saleData.customer?.phone) {
      console.log('📱 Sending WhatsApp notification to customer');
      await evolutionAPI.sendSaleNotification(
        saleData.customer.phone,
        saleData.customer.name,
        saleData.saleNumber,
        total,
        saleData.saleItems.map(item => ({
          name: item.inventoryItem.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        dp || 0,
        discountAmount
      );
    } else {
      console.log('📱 No customer phone available, skipping WhatsApp notification');
    }

    revalidatePath('/sales');
    return {
      success: true,
      sale: {
        id: saleData.id,
        saleNumber: saleData.saleNumber,
        date: saleData.date.toISOString(),
        subtotal: subtotal,
        discountPercentage: dp || 0,
        discountAmount: discountAmount,
        total: total,
        paymentMethod: pm,
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