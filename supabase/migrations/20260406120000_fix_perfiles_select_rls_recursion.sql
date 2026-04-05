-- La política anterior consultaba public.perfiles dentro de la propia política de SELECT,
-- lo que provoca "infinite recursion detected in policy for relation perfiles".
-- Solo hace falta permitir leer la fila del usuario autenticado.

drop policy if exists "perfiles_select_own_tienda" on public.perfiles;

create policy "perfiles_select_own"
  on public.perfiles for select
  using (id = auth.uid());
