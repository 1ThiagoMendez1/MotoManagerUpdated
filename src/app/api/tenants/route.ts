import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createTenantSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('El email debe tener un formato válido').min(1, 'El email es requerido'),
  phone: z.string().optional(),
  domain: z.string().optional(),
});

export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Error al obtener los tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTenantSchema.parse(body);

    const tenant = await prisma.tenant.create({
      data: validatedData,
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const field = (error as any).meta?.target?.[0];
      let message = 'Ya existe un tenant con este valor';
      if (field === 'name') {
        message = 'Ya existe un tenant con este nombre';
      } else if (field === 'email') {
        message = 'Ya existe un tenant con este email';
      } else if (field === 'domain') {
        message = 'Ya existe un tenant con este dominio';
      }
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Error al crear el tenant' },
      { status: 500 }
    );
  }
}