-- Solución a la recursión infinita en la tabla workshop_members

-- 1. Eliminamos la política actual que causa la recursión
drop policy if exists "Members can view team" on public.workshop_members;

-- 2. Creamos la nueva política, que solo revisa la columna user_id
create policy "Users can view own membership" on public.workshop_members
  for select using (user_id = auth.uid());

-- Explicación:
-- Al revisar únicamente "user_id = auth.uid()", la función get_my_workshop_ids()
-- puede hacer su SELECT interno ("select workshop_id from public.workshop_members where user_id = auth.uid()")
-- SIN llamar de vuelta a get_my_workshop_ids(), rompiendo así el ciclo infinito.
