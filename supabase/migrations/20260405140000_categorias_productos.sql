-- Categorías y productos multi-tenant (id_tienda en ambas tablas)

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  id_tienda uuid not null references public.tiendas (id) on delete cascade,
  nombre text not null,
  id_padre uuid references public.categorias (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists categorias_id_tienda_idx on public.categorias (id_tienda);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  id_tienda uuid not null references public.tiendas (id) on delete cascade,
  id_categoria uuid not null references public.categorias (id) on delete restrict,
  nombre text not null,
  descripcion text not null default '',
  precio_actual numeric not null check (precio_actual >= 0),
  created_at timestamptz not null default now()
);

create index if not exists productos_id_tienda_idx on public.productos (id_tienda);
create index if not exists productos_id_categoria_idx on public.productos (id_categoria);

alter table public.categorias enable row level security;
alter table public.productos enable row level security;

create policy "categorias_select_own_tienda"
  on public.categorias for select
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "categorias_insert_own_tienda"
  on public.categorias for insert
  with check (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "categorias_update_own_tienda"
  on public.categorias for update
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  )
  with check (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "categorias_delete_own_tienda"
  on public.categorias for delete
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "productos_select_own_tienda"
  on public.productos for select
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "productos_insert_own_tienda"
  on public.productos for insert
  with check (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "productos_update_own_tienda"
  on public.productos for update
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  )
  with check (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "productos_delete_own_tienda"
  on public.productos for delete
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );
