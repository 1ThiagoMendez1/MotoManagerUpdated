-- Script para crear las tablas de planes de suscripción y sus características

-- 1. Crear tabla de planes
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id text PRIMARY KEY, -- 'monthly', 'biannual', 'yearly'
    name text NOT NULL,
    price integer NOT NULL,
    amount_in_cents integer NOT NULL,
    period text NOT NULL,
    months integer NOT NULL,
    description text NOT NULL,
    badge text,
    savings text,
    gradient text NOT NULL,
    border text NOT NULL,
    accent_text text NOT NULL,
    btn text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear tabla de características para la tabla comparativa
CREATE TABLE IF NOT EXISTS public.subscription_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name text NOT NULL,
    included_in_monthly boolean DEFAULT true,
    included_in_biannual boolean DEFAULT true,
    included_in_yearly boolean DEFAULT true,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS (Seguridad a Nivel de Filas)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas (Todos pueden leer, solo administradores podrían escribir - aquí simplificamos a lectura pública y escritura por service_role)
CREATE POLICY "Planes son públicos para lectura" ON public.subscription_plans
    FOR SELECT USING (true);

CREATE POLICY "Características son públicas para lectura" ON public.subscription_features
    FOR SELECT USING (true);

-- 5. Insertar datos iniciales (Planes)
INSERT INTO public.subscription_plans (
    id, name, price, amount_in_cents, period, months, description, badge, savings, gradient, border, accent_text, btn
) VALUES 
(
    'monthly', 'Mensual', 18900, 1890000, '/ mes', 1, 'Para empezar sin compromiso', NULL, NULL,
    'from-primary/20 to-primary/10 dark:from-primary/40 dark:to-primary/20',
    'border-primary/25', 'text-primary',
    'from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-primary/25'
),
(
    'biannual', 'Semestral', 99900, 9990000, '/ 6 meses', 6, 'El más elegido por los talleres', 'MÁS POPULAR', 'Ahorra $13.500',
    'from-amber-100/80 to-orange-100/60 dark:from-amber-900/40 dark:to-orange-800/20',
    'border-amber-500/40', 'text-amber-600 dark:text-amber-400',
    'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
),
(
    'yearly', 'Anual', 199900, 19990000, '/ año', 12, 'El mejor valor para tu negocio', 'MEJOR VALOR', 'Ahorra $26.900',
    'from-purple-100/80 to-purple-50/60 dark:from-purple-900/40 dark:to-purple-800/20',
    'border-purple-500/30', 'text-purple-600 dark:text-purple-400',
    'from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-500/25'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    amount_in_cents = EXCLUDED.amount_in_cents,
    period = EXCLUDED.period,
    months = EXCLUDED.months,
    description = EXCLUDED.description,
    badge = EXCLUDED.badge,
    savings = EXCLUDED.savings,
    gradient = EXCLUDED.gradient,
    border = EXCLUDED.border,
    accent_text = EXCLUDED.accent_text,
    btn = EXCLUDED.btn;

-- 6. Insertar datos iniciales (Características)
INSERT INTO public.subscription_features (feature_name, order_index, included_in_monthly, included_in_biannual, included_in_yearly) VALUES 
('Clientes y motos ilimitados', 10, true, true, true),
('Órdenes de trabajo ilimitadas', 20, true, true, true),
('Control de inventario completo', 30, true, true, true),
('Ventas y facturación digital', 40, true, true, true),
('Reportes exportables (Excel)', 50, true, true, true),
('WhatsApp automático', 60, true, true, true),
('Pagos digitales con Wompi', 70, true, true, true),
('Multi-técnico con roles', 80, true, true, true),
('Dashboard con estadísticas', 90, true, true, true),
('Soporte por WhatsApp', 100, true, true, true);
