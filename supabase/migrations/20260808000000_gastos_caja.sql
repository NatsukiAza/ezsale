-- Gastos por tienda (caja): monto + descripción; mutaciones admin/manager

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  id_tienda uuid not null references public.tiendas (id) on delete cascade,
  id_usuario uuid not null references auth.users (id) on delete restrict,
  monto numeric not null check (monto > 0),
  descripcion text not null check (char_length(trim(descripcion)) > 0),
  fecha_gasto timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists gastos_tienda_fecha_idx
  on public.gastos (id_tienda, fecha_gasto desc);

alter table public.gastos enable row level security;

create policy "gastos_select_accessible"
  on public.gastos for select
  to authenticated
  using (public.tienda_accesible(id_tienda));

create policy "gastos_insert_manager"
  on public.gastos for insert
  to authenticated
  with check (
    public.tienda_accesible(id_tienda)
    and public.mi_rol() in ('admin', 'manager')
    and id_usuario = auth.uid()
  );

create policy "gastos_update_manager"
  on public.gastos for update
  to authenticated
  using (
    public.tienda_accesible(id_tienda)
    and public.mi_rol() in ('admin', 'manager')
  )
  with check (
    public.tienda_accesible(id_tienda)
    and public.mi_rol() in ('admin', 'manager')
  );

create policy "gastos_delete_manager"
  on public.gastos for delete
  to authenticated
  using (
    public.tienda_accesible(id_tienda)
    and public.mi_rol() in ('admin', 'manager')
  );
