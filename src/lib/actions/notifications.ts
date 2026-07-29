'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';

export async function getNotificationsForUser() {
  try {
    const user = await getCurrentUserServer();
    if (!user || !user.workshopId) {
      return { success: true, data: [] };
    }

    const supabase = await createClient();
    const role = user.role; // 'super_admin' | 'owner' | 'admin' | 'service_advisor' | 'technician'
    
    const notifications: any[] = [];

    // 1. Técnico (technician/mechanic)
    if (role === 'technician' || role === 'mechanic') {
      // Query active work orders assigned to this technician
      const { data: wos, error } = await supabase
        .from('work_orders')
        .select('id, order_number, status, quote_status')
        .eq('organization_id', user.workshopId)
        .eq('assigned_mechanic_id', user.userId)
        .neq('status', 'delivered');

      if (error) {
        console.error('Error fetching technician work orders for notifications:', error);
      }

      const pendingWOs = wos || [];
      
      // Contar órdenes por estado
      const receivedCount = pendingWOs.filter(w => w.status === 'received').length;
      const diagnosisCount = pendingWOs.filter(w => w.status === 'diagnosis').length;

      if (pendingWOs.length > 0) {
        notifications.push({
          id: `tech-total-wos-${pendingWOs.length}`,
          text: `Tienes ${pendingWOs.length} orden(es) de trabajo asignada(s) pendiente(s).`,
          time: 'Ahora',
          urgent: true,
          link: '/work-orders'
        });
      }

      if (receivedCount > 0) {
        notifications.push({
          id: `tech-received-wos-${receivedCount}`,
          text: `${receivedCount} orden(es) en "Ingreso a revisión".`,
          time: 'Reciente',
          urgent: false,
          link: '/work-orders'
        });
      }

      if (diagnosisCount > 0) {
        notifications.push({
          id: `tech-diagnosis-wos-${diagnosisCount}`,
          text: `${diagnosisCount} orden(es) en "Diagnosticando".`,
          time: 'Reciente',
          urgent: true,
          link: '/work-orders'
        });
      }

      // Alertas de cotizaciones asignadas al técnico
      pendingWOs.forEach(wo => {
        if (wo.quote_status === 'approved' && wo.status !== 'ready') {
          notifications.push({
            id: `tech-quote-approved-${wo.id}`,
            text: `¡Cotización aprobada! Podés iniciar la reparación en la Orden WO-${wo.order_number}.`,
            time: 'Nueva',
            urgent: true,
            link: `/work-orders/${wo.id}`
          });
        } else if (wo.quote_status === 'rejected') {
          notifications.push({
            id: `tech-quote-rejected-${wo.id}`,
            text: `Cotización rechazada para la Orden WO-${wo.order_number}.`,
            time: 'Nueva',
            urgent: false,
            link: `/work-orders/${wo.id}`
          });
        }
      });
    } 
    // 2. Administrador / Dueño / Asesor
    else {
      // Alertas de Stock Crítico (bajo el mínimo)
      const { data: inventory, error: invError } = await supabase
        .from('inventory_items')
        .select('id, quantity, min_quantity')
        .eq('organization_id', user.workshopId);

      if (invError) {
        console.error('Error fetching inventory for notifications:', invError);
      }

      const stockCriticoCount = (inventory || []).filter(item => item.quantity <= (item.min_quantity || 5)).length;

      if (stockCriticoCount > 0) {
        notifications.push({
          id: `admin-low-stock-${stockCriticoCount}`,
          text: `Hay ${stockCriticoCount} repuesto(s) con stock crítico.`,
          time: 'Reciente',
          urgent: true,
          link: '/inventory'
        });
      }

      // Alertas de Citas Pendientes de Confirmación
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id')
        .eq('organization_id', user.workshopId)
        .eq('status', 'pending');

      if (appError) {
        console.error('Error fetching appointments for notifications:', appError);
      }

      const pendingAppointmentsCount = (appointments || []).length;
      if (pendingAppointmentsCount > 0) {
        notifications.push({
          id: `admin-pending-appointments-${pendingAppointmentsCount}`,
          text: `Tienes ${pendingAppointmentsCount} cita(s) pendiente(s) de confirmación.`,
          time: 'Ahora',
          urgent: true,
          link: '/appointments'
        });
      }

      // Cantidad de Órdenes de Trabajo Activas
      const { data: activeWOs, error: woError } = await supabase
        .from('work_orders')
        .select('id, status, order_number, quote_status')
        .eq('organization_id', user.workshopId)
        .neq('status', 'delivered');

      if (woError) {
        console.error('Error fetching active WOs for notifications:', woError);
      }

      const pendingWOs = activeWOs || [];
      if (pendingWOs.length > 0) {
        notifications.push({
          id: `admin-active-wos-${pendingWOs.length}`,
          text: `Hay ${pendingWOs.length} orden(es) de trabajo activa(s) en proceso.`,
          time: 'Reciente',
          urgent: false,
          link: '/work-orders'
        });
      }

      // Alertas de Cotizaciones (para dueños, admins, y asesores)
      pendingWOs.forEach(wo => {
        if (wo.quote_status === 'approved' && wo.status !== 'ready') {
          notifications.push({
            id: `admin-quote-approved-${wo.id}`,
            text: `¡Cotización aprobada por cliente para la Orden WO-${wo.order_number}!`,
            time: 'Nueva',
            urgent: true,
            link: `/work-orders/${wo.id}`
          });
        } else if (wo.quote_status === 'rejected') {
          notifications.push({
            id: `admin-quote-rejected-${wo.id}`,
            text: `Cotización rechazada por cliente para la Orden WO-${wo.order_number}.`,
            time: 'Nueva',
            urgent: false,
            link: `/work-orders/${wo.id}`
          });
        }
      });

      // Alerta de Facturación/Suscripción vencida (Solo dueños y admins)
      if (role === 'owner' || role === 'admin') {
        const workshopDetails = await getWorkshopDetails(user);
        if (workshopDetails && workshopDetails.subscription_status === 'past_due') {
          notifications.push({
            id: 'admin-sub-past-due',
            text: `Tu suscripción de MotoManager está VENCIDA. Por favor actualiza tu plan.`,
            time: 'Crítico',
            urgent: true,
            link: '/planes'
          });
        }
      }
    }

    return { success: true, data: notifications };
  } catch (error: any) {
    console.error('Error in getNotificationsForUser:', error);
    return { success: false, error: error.message };
  }
}
