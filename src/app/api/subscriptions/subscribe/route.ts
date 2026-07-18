import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/services/SubscriptionService';
import { getCurrentUserServer, requireWorkshop } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUserServer();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { planType, paymentMethodToken, workshopId, userEmail, userName } = body;

    if (!planType || !paymentMethodToken || !workshopId || !userEmail || !userName) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Verificar que el usuario pertenece al taller que intenta suscribir
    const workshopAuth = await requireWorkshop();
    if (workshopAuth.workshopId !== workshopId) {
       return NextResponse.json({ error: 'No tienes permiso para modificar la suscripción de este taller' }, { status: 403 });
    }

    // Llamar al servicio que crea Customer y Suscripción en Wompi
    const result = await subscriptionService.subscribeWorkshop(
      workshopId,
      planType,
      paymentMethodToken,
      userEmail,
      userName
    );

    return NextResponse.json({ success: true, subscription: result.subscription }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/subscriptions/subscribe:', error);
    
    // Devolver un error amigable si viene de Wompi
    const message = error.message || 'Error al procesar la suscripción';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
