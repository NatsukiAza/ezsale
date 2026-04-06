-- Asegura lectura de la propia fila (id = auth.uid) además del equipo.
-- Sin la cláusula (id = auth.uid()), usuarios sin fila aún no podían “verse” a sí mismos
-- en algunos flujos; además evita casos límite del subquery.

drop policy if exists "perfiles_select_same_tienda" on public.perfiles;

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
