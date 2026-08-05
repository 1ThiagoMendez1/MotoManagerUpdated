export const DEFAULT_PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price: 18900, // Precios de prueba temporales
    amount_in_cents: 1890000,
    amountInCents: 1890000,
    period: '/ mes',
    months: 1,
    description: 'Taller pequeño',
    badge: null,
    savings: null,
    gradient: 'from-primary/20 to-primary/10 dark:from-primary/40 dark:to-primary/20',
    border: 'border-primary/25',
    accent_text: 'text-primary',
    accentText: 'text-primary',
    btn: 'from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-primary/25',
    
    // Limits & Features
    users_limit: 1,
    whatsapp_limit: 50,
    has_inventory: false,
    has_sales: false,
    has_appointments: false,
    has_technicians: false,
    dashboard_level: 'none', // none, basic, complete
    permissions_level: 'none', // none, limited, complete
    support_level: 'basic'
  },
  {
    id: 'pro',
    name: 'Pro Taller',
    price: 99900,
    amount_in_cents: 9990000,
    amountInCents: 9990000,
    period: '/ mes',
    months: 1,
    description: 'Taller organizado',
    badge: 'MÁS VENDIDO',
    savings: null,
    gradient: 'from-amber-100/80 to-orange-100/60 dark:from-amber-900/40 dark:to-orange-800/20',
    border: 'border-amber-500/40',
    accent_text: 'text-amber-600 dark:text-amber-400',
    accentText: 'text-amber-600 dark:text-amber-400',
    btn: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25',
    
    // Limits & Features
    users_limit: 3,
    whatsapp_limit: 150,
    has_inventory: true,
    has_sales: true,
    has_appointments: true,
    has_technicians: true,
    dashboard_level: 'basic',
    permissions_level: 'limited',
    support_level: 'priority'
  },
  {
    id: 'full',
    name: 'Full Taller',
    price: 199900,
    amount_in_cents: 19990000,
    amountInCents: 19990000,
    period: '/ mes',
    months: 1,
    description: 'Taller grande o con equipo',
    badge: 'MEJOR VALOR',
    savings: null,
    gradient: 'from-purple-100/80 to-purple-50/60 dark:from-purple-900/40 dark:to-purple-800/20',
    border: 'border-purple-500/30',
    accent_text: 'text-purple-600 dark:text-purple-400',
    accentText: 'text-purple-600 dark:text-purple-400',
    btn: 'from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-500/25',
    
    // Limits & Features
    users_limit: -1, // -1 means unlimited
    whatsapp_limit: -1, // -1 means unlimited
    has_inventory: true,
    has_sales: true,
    has_appointments: true,
    has_technicians: true,
    dashboard_level: 'complete',
    permissions_level: 'complete',
    support_level: 'priority'
  }
];

export const DEFAULT_FEATURES = [
  { id: '1', feature_name: 'Órdenes de trabajo', order_index: 10, included_in_basic: 'Sí', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '2', feature_name: 'Clientes', order_index: 20, included_in_basic: 'Sí', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '3', feature_name: 'Motocicletas', order_index: 30, included_in_basic: 'Sí', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '4', feature_name: 'Historial de servicios por moto', order_index: 40, included_in_basic: 'Sí', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '5', feature_name: 'Estados de la orden', order_index: 50, included_in_basic: 'Sí', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '6', feature_name: 'Mensajes por WhatsApp según estado', order_index: 60, included_in_basic: 'Limitado', included_in_pro: 'Sí', included_in_full: 'Avanzado' },
  { id: '7', feature_name: 'Inventario', order_index: 70, included_in_basic: 'No', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '8', feature_name: 'Ventas / caja', order_index: 80, included_in_basic: 'No', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '9', feature_name: 'Citas / agenda', order_index: 90, included_in_basic: 'No', included_in_pro: 'Sí', included_in_full: 'Sí' },
  { id: '10', feature_name: 'Dashboard', order_index: 100, included_in_basic: 'No', included_in_pro: 'Básico', included_in_full: 'Completo' },
  { id: '11', feature_name: 'Técnicos', order_index: 110, included_in_basic: 'No', included_in_pro: 'Sí', included_in_full: 'Avanzado' },
  { id: '12', feature_name: 'Permisos de usuarios', order_index: 120, included_in_basic: 'No', included_in_pro: 'Limitado', included_in_full: 'Sí' },
  { id: '13', feature_name: 'Soporte', order_index: 130, included_in_basic: 'Básico', included_in_pro: 'Prioritario', included_in_full: 'Prioritario' },
  { id: '14', feature_name: 'Usuarios incluidos', order_index: 140, included_in_basic: '1', included_in_pro: '3', included_in_full: '5 o más' },
  { id: '15', feature_name: 'Ideal para', order_index: 150, included_in_basic: 'Taller pequeño', included_in_pro: 'Taller organizado', included_in_full: 'Taller grande o con equipo' }
];

export function getPlanLimits(planId: string) {
  const plan = DEFAULT_PLANS.find(p => p.id === planId) || DEFAULT_PLANS[0];
  return plan;
}

export function mergePlansWithDefaults(dbPlans: any[]) {
  if (!dbPlans || dbPlans.length === 0) return DEFAULT_PLANS;
  
  return DEFAULT_PLANS.map(defaultPlan => {
    const dbPlan = dbPlans.find(p => p.id === defaultPlan.id);
    if (!dbPlan) return defaultPlan;
    return {
      ...defaultPlan,
      name: dbPlan.name || defaultPlan.name,
      price: dbPlan.price !== undefined ? dbPlan.price : defaultPlan.price,
      amountInCents: (dbPlan.price !== undefined ? dbPlan.price : defaultPlan.price) * 100,
      amount_in_cents: (dbPlan.price !== undefined ? dbPlan.price : defaultPlan.price) * 100,
      description: dbPlan.description || defaultPlan.description,
      badge: dbPlan.badge !== undefined ? dbPlan.badge : defaultPlan.badge,
      savings: dbPlan.savings !== undefined ? dbPlan.savings : defaultPlan.savings,
    };
  });
}
