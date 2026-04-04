-- Tablas multi-tenant (ejecutar en Supabase SQL Editor o con CLI)
-- Requiere extensión pgcrypto para gen_random_uuid (habitual en Supabase)

create table if not exists public.tiendas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  telefono text,
  created_at timestamptz not null default now()
);

create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  id_tienda uuid not null references public.tiendas (id) on delete cascade,
  nombre text not null default '',
  apellido text not null default '',
  rol text not null check (rol in ('admin', 'normal')),
  created_at timestamptz not null default now()
);

create index if not exists perfiles_id_tienda_idx on public.perfiles (id_tienda);

-- Registro: tras signUp, el usuario autenticado crea su tienda y queda como admin
create or replace function public.create_tienda_y_perfil_admin (
  p_nombre_tienda text,
  p_direccion text,
  p_telefono text,
  p_nombre text,
  p_apellido text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.perfiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  insert into public.tiendas (nombre, direccion, telefono)
  values (trim(p_nombre_tienda), nullif(trim(p_direccion), ''), nullif(trim(p_telefono), ''))
  returning id into tid;

  insert into public.perfiles (id, id_tienda, nombre, apellido, rol)
  values (auth.uid(), tid, trim(p_nombre), trim(coalesce(p_apellido, '')), 'admin');

  return tid;
end;
$$;

grant execute on function public.create_tienda_y_perfil_admin (text, text, text, text, text) to authenticated;

alter table public.tiendas enable row level security;
alter table public.perfiles enable row level security;

-- Lectura: solo datos de la tienda del usuario
create policy "tiendas_select_own"
  on public.tiendas for select
  using (
    id in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "perfiles_select_own_tienda"
  on public.perfiles for select
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

-- Inserción manual solo vía service role / migraciones; el alta va por la función
