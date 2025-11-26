import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type { Customer, Motorcycle, Technician, InventoryItem, Appointment, WorkOrder, Sale, ChatMessage } from './types';
import { subDays, format, startOfMonth } from 'date-fns';

// --- CUSTOMERS ---
export const getCustomers = async (): Promise<Customer[]> => {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      cedula: true,
      isFrequent: true,
    },
  });
  return customers.map(c => ({
    ...c,
    isFrequent: c.isFrequent || false,
  }));
};

// --- TECHNICIANS ---
export const getTechnicians = async (): Promise<Technician[]> => {
  const technicians = await prisma.technician.findMany({
    include: {
      workOrders: {
        include: {
          motorcycle: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: {
          createdDate: 'desc',
        },
      },
    },
  });
  return technicians.map(tech => ({
    id: tech.id,
    name: tech.name,
    specialty: tech.specialty,
    avatarUrl: tech.avatarUrl,
    workOrders: tech.workOrders.map(wo => ({
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      motorcycle: {
        id: wo.motorcycle.id,
        make: wo.motorcycle.make,
        model: wo.motorcycle.model,
        year: wo.motorcycle.year,
        plate: wo.motorcycle.plate,
        intakeDate: wo.motorcycle.intakeDate.toISOString(),
        customer: wo.motorcycle.customer,
      },
      technician: {
        id: tech.id,
        name: tech.name,
        specialty: tech.specialty,
      },
      issueDescription: wo.issueDescription,
      createdDate: wo.createdDate.toISOString(),
      completedDate: wo.completedDate ? wo.completedDate.toISOString() : undefined,
      status: wo.status as 'Diagnosticando' | 'Reparado' | 'Entregado',
    })),
  }));
};

// --- MOTORCYCLES ---
export const getMotorcycles = async ({ query }: { query?: string } = {}): Promise<Motorcycle[]> => {
  const where: Prisma.MotorcycleWhereInput = query ? {
    OR: [
      { make: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { model: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { plate: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { customer: {
        OR: [
          { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { cedula: { contains: query, mode: Prisma.QueryMode.insensitive } },
        ]
      }}
    ],
  } : {};

  const motorcycles = await prisma.motorcycle.findMany({
    where,
    include: {
      customer: true,
    },
    orderBy: {
      intakeDate: 'desc',
    },
  });
  return motorcycles.map(m => ({
    id: m.id,
    make: m.make,
    model: m.model,
    year: m.year,
    plate: m.plate,
    intakeDate: m.intakeDate.toISOString(),
    customer: {
      ...m.customer,
      isFrequent: false, // TODO
    },
    issueDescription: (m as any).issueDescription,
  }));
};

// --- INVENTORY ---
export const getInventory = async ({ query, category, page = 1, limit = 10 }: { query?: string; category?: string; page?: number; limit?: number; }): Promise<{items: InventoryItem[], totalPages: number}> => {
  const where: Prisma.InventoryItemWhereInput = {
    ...(query ? {
      OR: [
        { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { sku: { contains: query, mode: Prisma.QueryMode.insensitive } },
      ],
    } : {}),
    ...(category && category !== 'all' ? { category: category as any } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        price: true,
        minimumQuantity: true,
        location: true,
        category: true,
        supplierPrice: true,
        supplier: true,
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const typedItems = items.map(i => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    quantity: i.quantity,
    price: i.price,
    minimumQuantity: i.minimumQuantity,
    location: i.location,
    category: i.category,
    supplierPrice: i.supplierPrice,
    supplier: i.supplier,
  }));

  return { items: typedItems, totalPages };
};

// --- APPOINTMENTS ---
export const getAppointments = async (): Promise<Appointment[]> => {
  const appointments = await prisma.appointment.findMany({
    include: {
      motorcycle: {
        include: {
          customer: true,
        },
      },
      technician: true,
    },
  });
  return appointments.map(a => ({
    id: a.id,
    motorcycle: {
      id: a.motorcycle.id,
      make: a.motorcycle.make,
      model: a.motorcycle.model,
      year: a.motorcycle.year,
      plate: a.motorcycle.plate,
      intakeDate: a.motorcycle.intakeDate.toISOString(),
      customer: a.motorcycle.customer,
    },
    technician: a.technician,
    date: a.date.toISOString(),
    time: a.time,
    service: a.service,
    status: a.status as 'Programada' | 'Completada' | 'Cancelada',
  }));
};

// --- WORK ORDERS ---
export const getWorkOrders = async ({ query, page = 1, limit = 20 }: { query?: string; page?: number; limit?: number } = {}): Promise<{items: WorkOrder[], totalPages: number}> => {
  const where: Prisma.WorkOrderWhereInput = query ? {
    OR: [
      { workOrderNumber: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { motorcycle: {
        OR: [
          { make: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { model: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { plate: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { customer: {
            OR: [
              { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
            ]
          }}
        ]
      }},
      { technician: {
        name: { contains: query, mode: Prisma.QueryMode.insensitive }
      }},
      { issueDescription: { contains: query, mode: Prisma.QueryMode.insensitive } },
    ],
  } : {};

  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        motorcycle: {
          include: {
            customer: true,
          },
        },
        technician: true,
      },
      orderBy: {
        createdDate: 'desc',
      },
    }),
    prisma.workOrder.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  const typedItems = workOrders.map(wo => ({
    id: wo.id,
    workOrderNumber: wo.workOrderNumber,
    motorcycle: {
      id: wo.motorcycle.id,
      make: wo.motorcycle.make,
      model: wo.motorcycle.model,
      year: wo.motorcycle.year,
      plate: wo.motorcycle.plate,
      intakeDate: wo.motorcycle.intakeDate.toISOString(),
      customer: wo.motorcycle.customer,
    },
    technician: wo.technician,
    issueDescription: wo.issueDescription,
    solutionDescription: (wo as any).solutionDescription,
    depositAmount: (wo as any).depositAmount ?? 0,
    createdDate: wo.createdDate.toISOString(),
    diagnosticandoDate: wo.diagnosticandoDate ? wo.diagnosticandoDate.toISOString() : undefined,
    reparadoDate: wo.reparadoDate ? wo.reparadoDate.toISOString() : undefined,
    entregadoDate: wo.entregadoDate ? wo.entregadoDate.toISOString() : undefined,
    completedDate: wo.completedDate ? wo.completedDate.toISOString() : undefined,
    status: wo.status as 'Diagnosticando' | 'Reparado' | 'Entregado',
  }));

  return { items: typedItems, totalPages };
};

// --- SALES ---
export const getSales = async ({ dateFrom, dateTo, type, page = 1, limit = 20 }: { dateFrom?: string; dateTo?: string; type?: 'direct' | 'service' | 'all'; page?: number; limit?: number; } = {}): Promise<{items: Sale[], totalPages: number}> => {
  // Build where clause for filters
  const where: any = {};

  // Date range filter
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      where.date.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.date.lte = new Date(dateTo);
    }
  }

  // Type filter
  if (type === 'direct') {
    where.workOrderId = null;
  } else if (type === 'service') {
    where.workOrderId = { not: null };
  }
  // 'all' or undefined means no type filter

  // Excluir ventas internas usadas solo para acumular items de órdenes de trabajo
  // Esas ventas usan saleNumber tipo "WO-<timestamp>" y NO deben aparecer como facturas.
  where.saleNumber = {
    not: {
      startsWith: 'WO-',
    },
  };

  // Get paginated sales data
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            issueDescription: true,
            technician: {
              select: {
                id: true,
                name: true,
                specialty: true,
                avatarUrl: true,
              },
            },
            motorcycle: {
              select: {
                id: true,
                make: true,
                model: true,
                year: true,
                plate: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        saleItems: {
          select: {
            id: true,
            inventoryItemId: true,
            quantity: true,
            price: true,
            inventoryItem: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    }),
    prisma.sale.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  const typedItems = sales.map(s => ({
    id: s.id,
    saleNumber: s.saleNumber,
    workOrderId: s.workOrderId,
    workOrder: s.workOrder ? {
      id: s.workOrder.id,
      workOrderNumber: s.workOrder.workOrderNumber,
      motorcycle: {
        id: s.workOrder.motorcycle.id,
        make: s.workOrder.motorcycle.make,
        model: s.workOrder.motorcycle.model,
        year: s.workOrder.motorcycle.year,
        plate: s.workOrder.motorcycle.plate,
        intakeDate: '', // Not needed for sales display
        customer: s.workOrder.motorcycle.customer,
      },
      technician: s.workOrder.technician ? {
        id: s.workOrder.technician.id,
        name: s.workOrder.technician.name,
        specialty: s.workOrder.technician.specialty,
        avatarUrl: s.workOrder.technician.avatarUrl ?? undefined,
      } : null,
      issueDescription: s.workOrder.issueDescription,
      solutionDescription: (s.workOrder as any).solutionDescription,
      depositAmount: (s.workOrder as any).depositAmount ?? 0,
      createdDate: '', // Not needed for sales display
      completedDate: undefined,
      status: 'Entregado' as const, // Sales are always completed
    } : undefined,
    customerId: s.customerId,
    customer: s.customer || undefined,
    customerName: s.customerName || undefined,
    paymentMethod: s.paymentMethod,
    items: s.saleItems.map(si => ({
      id: si.id,
      inventoryItemId: si.inventoryItemId,
      quantity: si.quantity,
      price: si.price,
      name: si.inventoryItem.name,
      sku: si.inventoryItem.sku,
    })),
    date: s.date.toISOString(),
    total: s.total,
  }));

  return { items: typedItems, totalPages };
};

// --- SALES CHART DATA ---
export const getSalesDataForChart = async () => {
  const today = new Date();
  const salesData = [];

  for (let i = 5; i >= 0; i--) {
    const date = subDays(today, i * 30);
    const monthStart = startOfMonth(date);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthlyTotalResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(total), 0) as monthly_sales
      FROM "Sale"
      WHERE date >= ${monthStart} AND date < ${monthEnd}
    ` as { monthly_sales: number }[];

    const monthlySales = monthlyTotalResult[0]?.monthly_sales || 0;

    salesData.push({
      month: format(monthStart, 'LLL'),
      sales: monthlySales,
    });
  }

  return salesData;
};

export const getChatMessages = async (motorcycleId: string): Promise<ChatMessage[]> => {
  const messages = await prisma.chatMessage.findMany({
    where: { motorcycleId },
    orderBy: { sentAt: 'asc' },
  });

  return messages.map(m => ({
    id: m.id,
    motorcycleId: m.motorcycleId,
    sender: m.sender as "client" | "admin",
    message: m.message,
    isFromClient: m.isFromClient,
    sentAt: m.sentAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : undefined,
  }));
}
