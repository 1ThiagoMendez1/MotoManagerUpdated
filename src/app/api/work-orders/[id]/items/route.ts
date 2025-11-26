import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        sales: {
          include: {
            saleItems: {
              include: {
                inventoryItem: true,
              },
            },
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // Agregar todos los ítems de todas las ventas asociadas a esta orden
    const itemsMap = new Map<
      string,
      {
        inventoryItemId: string;
        name: string;
        sku: string;
        quantity: number;
        price: number;
      }
    >();

    for (const sale of workOrder.sales) {
      for (const saleItem of sale.saleItems) {
        const key = saleItem.inventoryItemId;
        const existing = itemsMap.get(key);

        const price = saleItem.price ?? saleItem.inventoryItem.price;

        if (existing) {
          existing.quantity += saleItem.quantity;
        } else {
          itemsMap.set(key, {
            inventoryItemId: saleItem.inventoryItemId,
            name: saleItem.inventoryItem.name,
            sku: saleItem.inventoryItem.sku,
            quantity: saleItem.quantity,
            price,
          });
        }
      }
    }

    const items = Array.from(itemsMap.values());

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching work order items for service sale:', error);
    return NextResponse.json(
      { error: 'Error al obtener los ítems de la orden de trabajo' },
      { status: 500 }
    );
  }
}