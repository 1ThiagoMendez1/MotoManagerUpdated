import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type { Customer, Motorcycle, Technician, InventoryItem, Appointment, WorkOrder, Sale } from './types';
import { subDays, format, startOfMonth } from 'date-fns';
import { getTenantId } from './tenant';

// --- CUSTOMERS ---
export const getCustomers = async (): Promise<Customer[]> => {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
    },
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
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  const technicians = await prisma.technician.findMany({
    where: {
      tenantId,
    },
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
export const getMotorcycles = async (): Promise<Motorcycle[]> => {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  const motorcycles = await prisma.motorcycle.findMany({
    where: {
      tenantId,
    },
    include: {
      customer: true,
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
  }));
};

// --- INVENTORY ---
export const getInventory = async ({ query, page = 1, limit = 10 }: { query?: string; page?: number; limit?: number; }): Promise<{items: InventoryItem[], totalPages: number}> => {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  const where: Prisma.InventoryItemWhereInput = {
    tenantId,
    ...(query ? {
      OR: [
        { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { sku: { contains: query, mode: Prisma.QueryMode.insensitive } },
      ],
    } : {}),
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
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
    },
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
export const getWorkOrders = async (): Promise<WorkOrder[]> => {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  const workOrders = await prisma.workOrder.findMany({
    where: {
      tenantId,
    },
    include: {
      motorcycle: {
        include: {
          customer: true,
        },
      },
      technician: true,
    },
  });
  return workOrders.map(wo => ({
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
    createdDate: wo.createdDate.toISOString(),
    diagnosticandoDate: wo.diagnosticandoDate ? wo.diagnosticandoDate.toISOString() : undefined,
    reparadoDate: wo.reparadoDate ? wo.reparadoDate.toISOString() : undefined,
    entregadoDate: wo.entregadoDate ? wo.entregadoDate.toISOString() : undefined,
    completedDate: wo.completedDate ? wo.completedDate.toISOString() : undefined,
    status: wo.status as 'Diagnosticando' | 'Reparado' | 'Entregado',
  }));
};

// --- SALES ---
export const getSales = async (): Promise<Sale[]> => {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  // First, get basic sales data
  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
    },
    include: {
      workOrder: {
        select: {
          id: true,
          workOrderNumber: true,
          issueDescription: true,
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
  });

  return sales.map(s => ({
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
      technician: {
        id: '',
        name: '',
        specialty: '',
      }, // Dummy technician since it's required by type but not used in sales page
      issueDescription: s.workOrder.issueDescription,
      createdDate: '', // Not needed for sales display
      completedDate: undefined,
      status: 'Entregado' as const, // Sales are always completed
    } : undefined,
    customerId: s.customerId,
    customer: s.customer || undefined,
    customerName: s.customerName || undefined,
    items: s.saleItems.map(si => ({
      id: si.id,
      inventoryItemId: si.inventoryItemId,
      quantity: si.quantity,
      price: si.price,
    })),
    date: s.date.toISOString(),
    total: s.total,
  }));
};

// --- SALES CHART DATA ---
export const getSalesDataForChart = async () => {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
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
      WHERE tenantId = ${tenantId} AND date >= ${monthStart} AND date < ${monthEnd}
    ` as { monthly_sales: number }[];

    const monthlySales = monthlyTotalResult[0]?.monthly_sales || 0;

    salesData.push({
      month: format(monthStart, 'LLL'),
      sales: monthlySales,
    });
  }

  return salesData;
};
