'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffInSeconds)) return 'Reciente';
    if (diffInSeconds < 60) return 'Hace un momento';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  } catch {
    return 'Reciente';
  }
}

export async function createNotification({
  organizationId,
  userId = null,
  type,
  title,
  message,
  link,
  urgent = false,
  metadata = {}
}: {
  organizationId: string;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string;
  urgent?: boolean;
  metadata?: any;
}) {
  try {
    const { createClient: createSupabaseClient } = await import('@/lib/supabase/managed-client');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabaseAdmin.from('notifications').insert({
      organization_id: organizationId,
      user_id: userId,
      type,
      title,
      message,
      link,
      urgent,
      metadata
    });

    if (error) {
      console.warn('Could not insert notification into notifications table:', error.message);
    }
  } catch (err: any) {
    console.warn('Error creating notification:', err.message);
  }
}

export async function getNotificationsForUser() {
  try {
    const user = await getCurrentUserServer();
    if (!user || !user.workshopId) {
      return { success: true, data: [] };
    }

    const supabase = await createClient();
    const role = user.role;
    const notifications: any[] = [];

    // 1. Fetch real event notifications from the database
    try {
      const { data: dbNotifications, error: dbError } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', user.workshopId)
        .or(`user_id.is.null,user_id.eq.${user.userId}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!dbError && dbNotifications) {
        const unreadDb = dbNotifications.filter(
          (n: any) => !n.read_by || !n.read_by.includes(user.userId)
        );

        for (const n of unreadDb) {
          notifications.push({
            id: n.id,
            type: n.type,
            title: n.title,
            text: n.message,
            time: formatRelativeTime(n.created_at),
            urgent: Boolean(n.urgent),
            link: n.link || '/dashboard',
            createdAt: n.created_at
          });
        }
      }
    } catch (dbErr) {
      console.warn('Notifications table not yet queried or not created:', dbErr);
    }

    // 2. Critical Stock Alerts (Super Admin / Owner / Admin / Service Advisor)
    if (role !== 'technician' && role !== 'mechanic') {
      const { data: inventory, error: invError } = await supabase
        .from('inventory_items')
        .select('id, min_quantity, inventory_item_stock(quantity), track_inventory')
        .eq('organization_id', user.workshopId);

      if (!invError && inventory) {
        const stockCriticoCount = inventory.filter(item => {
          if (item.track_inventory === false) return false;
          const totalQty = item.inventory_item_stock?.reduce((acc: number, stock: any) => acc + (stock.quantity || 0), 0) || 0;
          return totalQty <= (item.min_quantity || 5);
        }).length;

        if (stockCriticoCount > 0) {
          notifications.unshift({
            id: `admin-low-stock-${stockCriticoCount}`,
            type: 'low_stock',
            title: 'Stock Crítico',
            text: `Hay ${stockCriticoCount} repuesto(s) con stock crítico.`,
            time: 'Alerta',
            urgent: true,
            link: '/inventory'
          });
        }
      }

      // Billing Alert
      if (role === 'owner' || role === 'admin') {
        const workshopDetails = await getWorkshopDetails(user);
        if (workshopDetails && workshopDetails.subscription_status === 'past_due') {
          notifications.unshift({
            id: 'admin-sub-past-due',
            type: 'billing',
            title: 'Suscripción Vencida',
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

export async function markNotificationAsRead(notificationId: string) {
  try {
    const user = await getCurrentUserServer();
    if (!user || !user.workshopId) return { success: false };

    // If it's a dynamic alert id (e.g. admin-low-stock-...), nothing to update in DB
    if (notificationId.startsWith('admin-low-stock') || notificationId.startsWith('admin-sub-')) {
      return { success: true };
    }

    const { createClient: createSupabaseClient } = await import('@/lib/supabase/managed-client');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: notif } = await supabaseAdmin
      .from('notifications')
      .select('read_by')
      .eq('id', notificationId)
      .eq('organization_id', user.workshopId)
      .single();

    if (notif) {
      const currentReadBy: string[] = notif.read_by || [];
      if (!currentReadBy.includes(user.userId)) {
        await supabaseAdmin
          .from('notifications')
          .update({
            read_by: [...currentReadBy, user.userId]
          })
          .eq('id', notificationId);
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('Error marking notification as read:', e);
    return { success: false, error: e.message };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const user = await getCurrentUserServer();
    if (!user || !user.workshopId) return { success: false };

    const { createClient: createSupabaseClient } = await import('@/lib/supabase/managed-client');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: notifs } = await supabaseAdmin
      .from('notifications')
      .select('id, read_by')
      .eq('organization_id', user.workshopId);

    if (notifs && notifs.length > 0) {
      for (const n of notifs) {
        const readBy: string[] = n.read_by || [];
        if (!readBy.includes(user.userId)) {
          await supabaseAdmin
            .from('notifications')
            .update({ read_by: [...readBy, user.userId] })
            .eq('id', n.id);
        }
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('Error marking all notifications as read:', e);
    return { success: false, error: e.message };
  }
}
