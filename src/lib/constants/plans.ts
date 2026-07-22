export const DEFAULT_PLANS = [
  { 
    id: 'monthly', 
    name: 'Mensual', 
    price: 18900, 
    amount_in_cents: 1890000, 
    amountInCents: 1890000,
    period: '/ mes', 
    months: 1, 
    description: 'Para empezar sin compromiso', 
    badge: null, 
    savings: null, 
    gradient: 'from-primary/20 to-primary/10 dark:from-primary/40 dark:to-primary/20', 
    border: 'border-primary/25', 
    accent_text: 'text-primary', 
    accentText: 'text-primary',
    btn: 'from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-primary/25' 
  },
  { 
    id: 'biannual', 
    name: 'Semestral', 
    price: 99900, 
    amount_in_cents: 9990000, 
    amountInCents: 9990000,
    period: '/ 6 meses', 
    months: 6, 
    description: 'El más elegido por los talleres', 
    badge: 'MÁS POPULAR', 
    savings: 'Ahorra $13.500', 
    gradient: 'from-amber-100/80 to-orange-100/60 dark:from-amber-900/40 dark:to-orange-800/20', 
    border: 'border-amber-500/40', 
    accent_text: 'text-amber-600 dark:text-amber-400', 
    accentText: 'text-amber-600 dark:text-amber-400',
    btn: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25' 
  },
  { 
    id: 'yearly', 
    name: 'Anual', 
    price: 199900, 
    amount_in_cents: 19990000, 
    amountInCents: 19990000,
    period: '/ año', 
    months: 12, 
    description: 'El mejor valor para tu negocio', 
    badge: 'MEJOR VALOR', 
    savings: 'Ahorra $26.900', 
    gradient: 'from-purple-100/80 to-purple-50/60 dark:from-purple-900/40 dark:to-purple-800/20', 
    border: 'border-purple-500/30', 
    accent_text: 'text-purple-600 dark:text-purple-400', 
    accentText: 'text-purple-600 dark:text-purple-400',
    btn: 'from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-500/25' 
  }
];

export const DEFAULT_FEATURES = [
  { id: '1', feature_name: 'Clientes y motos ilimitados', order_index: 10, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '2', feature_name: 'Órdenes de trabajo ilimitadas', order_index: 20, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '3', feature_name: 'Control de inventario completo', order_index: 30, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '4', feature_name: 'Ventas y facturación digital', order_index: 40, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '5', feature_name: 'Reportes exportables (Excel)', order_index: 50, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '6', feature_name: 'WhatsApp automático', order_index: 60, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '7', feature_name: 'Pagos digitales con Wompi', order_index: 70, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '8', feature_name: 'Multi-técnico con roles', order_index: 80, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '9', feature_name: 'Dashboard con estadísticas', order_index: 90, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '10', feature_name: 'Soporte por WhatsApp', order_index: 100, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true }
];

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
