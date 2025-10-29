import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateTenantSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  domain: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            motorcycles: true,
            technicians: true,
            inventoryItems: true,
            appointments: true,
            workOrders: true,
            sales: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Error al obtener el tenant' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateTenantSchema.parse(body);

    const tenant = await prisma.tenant.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el tenant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if tenant has any data
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            motorcycles: true,
            technicians: true,
            inventoryItems: true,
            appointments: true,
            workOrders: true,
            sales: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Check if tenant has any associated data
    const hasData = Object.values(tenant._count).some(count => count > 0);

    if (hasData) {
      return NextResponse.json(
        { error: 'No se puede eliminar el tenant porque tiene datos asociados' },
        { status: 400 }
      );
    }

    await prisma.tenant.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Tenant eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el tenant' },
      { status: 500 }
    );
  }
}