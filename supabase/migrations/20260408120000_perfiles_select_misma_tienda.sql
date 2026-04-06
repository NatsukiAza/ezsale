-- Permitir leer perfiles de la misma tienda (p. ej. nombre del vendedor en reportes)
-- sin recursión: el subquery solo lee la fila del usuario actual.

drop policy if exists "perfiles_select_own" on public.perfiles;

create policy "perfiles_select_same_tienda"
  on public.perfiles for select
  using (
    id = auth.uid()
    or
    id_tienda = (
      select p.id_tienda
      from public.perfiles p
      where p.id = auth.uid()
      limit 1
    )
  );
