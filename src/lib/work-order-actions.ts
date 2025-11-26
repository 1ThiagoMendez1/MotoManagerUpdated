"use server";

import prisma from './prisma';
import type { WorkOrder } from './types';
import { revalidatePath } from 'next/cache';
import { sendOrderItemAddedNotification } from './whatsapp';

export async function getWorkOrderById(id: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      motorcycle: { include: { customer: true } },
      technician: true,
      sales: {
        include: {
          saleItems: { include: { inventoryItem: true } },
        },
      },
    },
  });
  if (!workOrder) return null;
  return {
    ...workOrder,
    createdDate: workOrder.createdDate.toISOString(),
    sales: workOrder.sales.map(s => ({
      ...s,
      saleItems: s.saleItems.map(si => ({
        ...si,
        inventoryItem: {
          ...si.inventoryItem,
        },
      })),
    })),
  };
}

export async function addItemToWorkOrder(formData: FormData) {
  const workOrderId = formData.get('workOrderId') as string;
  const itemId = formData.get('inventoryItemId') as string;
  const quantity = parseInt(formData.get('quantity') as string, 10) || 1;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      sales: { include: { saleItems: true } },
      motorcycle: { include: { customer: true } },
      technician: true,
    },
  });

  let sale = workOrder?.sales[0];
  if (!sale) {
    sale = await prisma.sale.create({
      data: {
        workOrderId,
        total: 0,
        paymentMethod: 'Efectivo',
        saleNumber: `WO-${Date.now()}`,
      },
      include: { saleItems: true },
    });
  }

  const inventoryItem = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
  });

  if (!inventoryItem) throw new Error('Item no encontrado');

  await prisma.saleItem.create({
    data: {
      saleId: sale.id,
      inventoryItemId: itemId,
      quantity,
      price: inventoryItem.price,
    },
  });

  await prisma.sale.update({
    where: { id: sale.id },
    data: {
      total: {
        increment: inventoryItem.price * quantity,
      },
    },
  });

  // Enviar notificación por WhatsApp al cliente usando Evolution API
  try {
    // Aseguramos tener la orden con las relaciones necesarias
    const fullWorkOrder = workOrder ?? await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        motorcycle: { include: { customer: true } },
        technician: true,
      },
    });

    const customerPhone = fullWorkOrder?.motorcycle.customer.phone;
    const customerName = fullWorkOrder?.motorcycle.customer.name;

    if (fullWorkOrder && customerPhone && customerName) {
      await sendOrderItemAddedNotification(
        customerPhone,
        customerName,
        fullWorkOrder.workOrderNumber,
        inventoryItem.name,
        quantity,
        inventoryItem.price,
        fullWorkOrder.motorcycle.make,
        fullWorkOrder.motorcycle.model,
        fullWorkOrder.technician?.name ?? 'Sin asignar'
      );
    }
  } catch (error) {
    console.error('Error enviando notificación de item agregado vía Evolution API:', error);
  }

  revalidatePath('/work-orders/' + workOrderId);
}

export async function removeItemFromWorkOrder(formData: FormData) {
  const saleItemId = formData.get('saleItemId') as string;
  const workOrderId = formData.get('workOrderId') as string;

  await prisma.saleItem.delete({
    where: { id: saleItemId },
  });

  revalidatePath('/work-orders/' + workOrderId);
}