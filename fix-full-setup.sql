-- ==============================================================================
-- SCRIPT DE REPARACIÓN: TALLERES Y PERMISOS DE ADMIN
-- ==============================================================================

-- 1. ASEGURAR COLUMNA Y FUNCIÓN DE SUPER ADMIN
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. POLÍTICAS DE ACCESO PARA QUE EL ADMIN VEA TODO
-- ------------------------------------------------------------------------------
-- Eliminar políticas antiguas si existen para evitar duplicados
DROP POLICY IF EXISTS "Super Admins full access workshops" ON public.workshops;
DROP POLICY IF EXISTS "Super Admins view all profiles" ON public.user_profiles;

-- Crear políticas
CREATE POLICY "Super Admins full access workshops" ON public.workshops
AS PERMISSIVE FOR ALL
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super Admins view all profiles" ON public.user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- 3. ACTUALIZAR FUNCIÓN DE CREACIÓN DE TALLER (Correcta: Active + Plan)
-- ------------------------------------------------------------------------------
-- Eliminar versiones anteriores conflictivas
DROP FUNCTION IF EXISTS public.create_workshop(uuid, text, text);
DROP FUNCTION IF EXISTS public.create_workshop(uuid, text, text, text);

-- Crear la versión definitiva
CREATE OR REPLACE FUNCTION public.create_workshop(
  owner_id uuid,
  name text,
  slug text,
  subscription_plan_text text
) RETURNS uuid AS $$
DECLARE
  new_workshop_id uuid;
BEGIN
  -- Insertar taller con estado ACTIVE y el plan seleccionado
  INSERT INTO public.workshops (name, slug, subscription_status, subscription_plan)
  VALUES (name, slug, 'active', subscription_plan_text::subscription_plan)  -- Casteo seguro al enum
  RETURNING id INTO new_workshop_id;

  -- Asignar al usuario como dueño
  INSERT INTO public.workshop_members (user_id, workshop_id, role)
  VALUES (owner_id, new_workshop_id, 'owner');

  RETURN new_workshop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- INSTRUCCIONES FINALES:
-- Si te sale error de "type subscription_plan" es porque no corriste el script de planes.
-- Ejecuta 'update-subscription-plans.sql' SI Y SOLO SI te da ese error.
-- ==============================================================================
