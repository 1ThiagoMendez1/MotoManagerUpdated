-- 1. Agregar columna de Super Admin a los perfiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- 2. Función segura para verificar si soy Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POLÍTICAS DE ACCESO TOTAL PARA SUPER ADMIN

-- Permitir ver y editar TODOS los talleres
CREATE POLICY "Super Admins full access workshops" ON public.workshops
AS PERMISSIVE FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Permitir ver TODOS los perfiles de usuario
CREATE POLICY "Super Admins view all profiles" ON public.user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Permitir ver TODAS las membresías (para saber quién está en qué taller)
CREATE POLICY "Super Admins view all memberships" ON public.workshop_members
AS PERMISSIVE FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- 4. INSTRUCCIÓN PARA DARTE PERMISOS A TI MISMO
-- (Reemplaza 'tu_email@ejemplo.com' por tu correo real al ejecutar)
-- UPDATE public.user_profiles SET is_super_admin = TRUE WHERE email = 'tu_email@ejemplo.com';
