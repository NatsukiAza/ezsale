-- Multi-tienda: tiendas actuales → organizaciones; nueva tabla tiendas (cajas).
-- Catálogo compartido por organización; ventas y equipo por tienda.

-- ---------------------------------------------------------------------------
-- 1) Renombrar tiendas → organizaciones + columna de gracia por exceso
-- ---------------------------------------------------------------------------
alter table public.tiendas rename to organizaciones;

alter table public.organizaciones
  add column if not exists exceso_tiendas_hasta timestamptz;

comment on column public.organizaciones.exceso_tiendas_hasta is
  'Si el plan baja y hay más tiendas que maxTiendas: deadline (15d) para eliminar o se soft-deleta las más nuevas.';

-- Políticas viejas sobre la tabla renombrada
drop policy if exists "tiendas_select_own" on public.organizaciones;

-- ---------------------------------------------------------------------------
-- 2) Nueva tabla tiendas (sucursales / cajas)
-- ---------------------------------------------------------------------------
create table public.tiendas (
  id uuid primary key default gen_random_uuid(),
  id_organizacion uuid not null references public.organizaciones (id) on delete cascade,
  nombre text not null,
  eliminado_en timestamptz,
  created_at timestamptz not null default now()
);

create index tiendas_id_organizacion_idx on public.tiendas (id_organizacion);
create index tiendas_org_activas_idx
  on public.tiendas (id_organizacion)
  where eliminado_en is null;

alter table public.tiendas enable row level security;

-- Backfill: 1 tienda por organización (mismo nombre / created_at)
create temporary table _org_tienda_map on commit drop as
select
  o.id as id_organizacion,
  gen_random_uuid() as id_tienda,
  o.nombre,
  o.created_at
from public.organizaciones o;

insert into public.tiendas (id, id_organizacion, nombre, created_at)
select id_tienda, id_organizacion, nombre, created_at
from _org_tienda_map;

-- ---------------------------------------------------------------------------
-- 3) perfiles: id_organizacion + id_tienda nullable (admin)
-- ---------------------------------------------------------------------------
alter table public.perfiles
  add column if not exists id_organizacion uuid;

-- Antes del rename, id_tienda apuntaba a la org
update public.perfiles p
set id_organizacion = p.id_tienda
where p.id_organizacion is null;

alter table public.perfiles
  alter column id_organizacion set not null;

alter table public.perfiles
  add constraint perfiles_id_organizacion_fkey
  foreign key (id_organizacion) references public.organizaciones (id) on delete cascade;

-- Soltar FK vieja (apuntaba a organizaciones) antes de remapear
alter table public.perfiles
  drop constraint if exists perfiles_id_tienda_fkey;

alter table public.perfiles
  alter column id_tienda drop not null;

-- Reasignar id_tienda al uuid de la caja backfilleada
update public.perfiles p
set id_tienda = m.id_tienda
from _org_tienda_map m
where p.id_organizacion = m.id_organizacion;

-- Admins de org: sin tienda fija
update public.perfiles
set id_tienda = null
where rol = 'admin';

alter table public.perfiles
  add constraint perfiles_id_tienda_fkey
  foreign key (id_tienda) references public.tiendas (id) on delete set null;

-- rol: agregar manager
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles
  add constraint perfiles_rol_check
  check (rol in ('admin', 'manager', 'normal'));

-- manager/normal deben tener tienda; admin no
alter table public.perfiles drop constraint if exists perfiles_tienda_por_rol_check;
alter table public.perfiles
  add constraint perfiles_tienda_por_rol_check
  check (
    (rol = 'admin' and id_tienda is null)
    or (rol in ('manager', 'normal') and id_tienda is not null)
  );

drop index if exists perfiles_id_tienda_idx;
create index perfiles_id_organizacion_idx on public.perfiles (id_organizacion);
create index perfiles_id_tienda_idx on public.perfiles (id_tienda)
  where id_tienda is not null;
drop index if exists perfiles_tienda_activos_idx;
create index perfiles_org_activos_idx
  on public.perfiles (id_organizacion)
  where eliminado_en is null;

-- ---------------------------------------------------------------------------
-- 4) productos / categorias: id_tienda → id_organizacion
-- ---------------------------------------------------------------------------
-- Los valores actuales ya son ids de organizaciones.

alter table public.categorias drop constraint if exists categorias_id_tienda_fkey;
alter table public.productos drop constraint if exists productos_id_tienda_fkey;

alter table public.categorias rename column id_tienda to id_organizacion;
alter table public.productos rename column id_tienda to id_organizacion;

alter table public.categorias
  add constraint categorias_id_organizacion_fkey
  foreign key (id_organizacion) references public.organizaciones (id) on delete cascade;

alter table public.productos
  add constraint productos_id_organizacion_fkey
  foreign key (id_organizacion) references public.organizaciones (id) on delete cascade;

drop index if exists categorias_id_tienda_idx;
drop index if exists productos_id_tienda_idx;
drop index if exists categorias_tienda_activas_idx;
drop index if exists productos_tienda_activos_idx;

create index categorias_id_organizacion_idx on public.categorias (id_organizacion);
create index productos_id_organizacion_idx on public.productos (id_organizacion);
create index categorias_org_activas_idx
  on public.categorias (id_organizacion)
  where eliminado_en is null;
create index productos_org_activos_idx
  on public.productos (id_organizacion)
  where eliminado_en is null;

-- ---------------------------------------------------------------------------
-- 5) ventas: remapear id_tienda a cajas nuevas
-- ---------------------------------------------------------------------------
alter table public.ventas drop constraint if exists ventas_id_tienda_fkey;

update public.ventas v
set id_tienda = m.id_tienda
from _org_tienda_map m
where v.id_tienda = m.id_organizacion;

alter table public.ventas
  add constraint ventas_id_tienda_fkey
  foreign key (id_tienda) references public.tiendas (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 6) Helpers de sesión (security definer, evitan recursión RLS)
-- ---------------------------------------------------------------------------
create or replace function public.mi_id_organizacion()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id_organizacion
  from public.perfiles
  where id = auth.uid()
    and eliminado_en is null;
$$;

create or replace function public.mi_id_tienda()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id_tienda
  from public.perfiles
  where id = auth.uid()
    and eliminado_en is null;
$$;

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol
  from public.perfiles
  where id = auth.uid()
    and eliminado_en is null;
$$;

create or replace function public.tienda_accesible(p_id_tienda uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tiendas t
    where t.id = p_id_tienda
      and t.eliminado_en is null
      and t.id_organizacion = public.mi_id_organizacion()
      and (
        public.mi_rol() = 'admin'
        or t.id = public.mi_id_tienda()
      )
  );
$$;

revoke all on function public.mi_id_organizacion() from public;
revoke all on function public.mi_id_tienda() from public;
revoke all on function public.mi_rol() from public;
revoke all on function public.tienda_accesible(uuid) from public;
grant execute on function public.mi_id_organizacion() to authenticated;
grant execute on function public.mi_id_tienda() to authenticated;
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.tienda_accesible(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------

-- organizaciones
create policy "organizaciones_select_own"
  on public.organizaciones for select
  using (id = public.mi_id_organizacion());

-- tiendas (cajas)
create policy "tiendas_select_accessible"
  on public.tiendas for select
  using (
    id_organizacion = public.mi_id_organizacion()
    and (
      public.mi_rol() = 'admin'
      or (id = public.mi_id_tienda() and eliminado_en is null)
    )
  );

-- perfiles: misma organización
drop policy if exists "perfiles_select_same_tienda" on public.perfiles;
drop policy if exists "perfiles_select_own" on public.perfiles;
drop policy if exists "perfiles_select_own_or_team" on public.perfiles;

create policy "perfiles_select_same_org"
  on public.perfiles for select
  using (
    id = auth.uid()
    or id_organizacion = public.mi_id_organizacion()
  );

-- categorias / productos: por organización; mutaciones solo admin
drop policy if exists "categorias_select_own_tienda" on public.categorias;
drop policy if exists "categorias_insert_own_tienda" on public.categorias;
drop policy if exists "categorias_update_own_tienda" on public.categorias;
drop policy if exists "categorias_delete_own_tienda" on public.categorias;
drop policy if exists "productos_select_own_tienda" on public.productos;
drop policy if exists "productos_insert_own_tienda" on public.productos;
drop policy if exists "productos_update_own_tienda" on public.productos;
drop policy if exists "productos_delete_own_tienda" on public.productos;

create policy "categorias_select_own_org"
  on public.categorias for select
  using (id_organizacion = public.mi_id_organizacion());

create policy "categorias_insert_admin"
  on public.categorias for insert
  with check (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  );

create policy "categorias_update_admin"
  on public.categorias for update
  using (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  )
  with check (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  );

create policy "categorias_delete_admin"
  on public.categorias for delete
  using (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  );

create policy "productos_select_own_org"
  on public.productos for select
  using (id_organizacion = public.mi_id_organizacion());

create policy "productos_insert_admin"
  on public.productos for insert
  with check (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  );

create policy "productos_update_admin"
  on public.productos for update
  using (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  )
  with check (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  );

create policy "productos_delete_admin"
  on public.productos for delete
  using (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() = 'admin'
  );

-- ventas / detalle: tienda accesible
drop policy if exists "ventas_select_own_tienda" on public.ventas;
drop policy if exists "detalle_ventas_select_own_tienda" on public.detalle_ventas;

create policy "ventas_select_accessible"
  on public.ventas for select
  using (public.tienda_accesible(id_tienda));

create policy "detalle_ventas_select_accessible"
  on public.detalle_ventas for select
  using (
    exists (
      select 1
      from public.ventas v
      where v.id = id_venta
        and public.tienda_accesible(v.id_tienda)
    )
  );

-- ---------------------------------------------------------------------------
-- 8) RPCs
-- ---------------------------------------------------------------------------

-- Onboarding: org + 1ª tienda + perfil admin
drop function if exists public.create_tienda_y_perfil_admin (text, text, text, text, text);

create or replace function public.create_tienda_y_perfil_admin (
  p_nombre_tienda text,
  p_nombre text,
  p_apellido text,
  p_plan text default null,
  p_tyc_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_tid uuid;
  plan_val text;
  tyc_ver text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.perfiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  tyc_ver := nullif(trim(coalesce(p_tyc_version, '')), '');
  if tyc_ver is null then
    raise exception 'Debés aceptar los Términos y Condiciones';
  end if;

  plan_val := nullif(lower(trim(coalesce(p_plan, ''))), '');
  if plan_val is not null
     and plan_val not in ('local', 'sucursales', 'cadena', 'empresa') then
    plan_val := null;
  end if;

  insert into public.organizaciones (nombre, plan, tyc_aceptados_en, tyc_version)
  values (trim(p_nombre_tienda), plan_val, now(), tyc_ver)
  returning id into v_org;

  insert into public.tiendas (id_organizacion, nombre)
  values (v_org, trim(p_nombre_tienda))
  returning id into v_tid;

  insert into public.perfiles (
    id, id_organizacion, id_tienda, nombre, apellido, rol, debe_cambiar_password
  )
  values (
    auth.uid(), v_org, null, trim(p_nombre), trim(coalesce(p_apellido, '')), 'admin', false
  );

  return v_org;
end;
$$;

grant execute on function public.create_tienda_y_perfil_admin (text, text, text, text, text) to authenticated;

-- registrar_venta: p_id_tienda requerido para admin; manager/normal usan la asignada
create or replace function public.registrar_venta (
  p_id_medio_pago uuid,
  p_items jsonb,
  p_descuento_monto numeric,
  p_id_tienda uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_tid_asignada uuid;
  v_tid uuid;
  v_venta_id uuid;
  line jsonb;
  v_pid uuid;
  v_raw_pid text;
  v_qty int;
  v_precio numeric;
  v_desc numeric;
  v_sub numeric;
  v_line_total numeric;
  v_total numeric := 0;
  v_descuento numeric;
  r_prod record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.id_organizacion, p.rol, p.id_tienda
    into v_org, v_rol, v_tid_asignada
  from public.perfiles p
  where p.id = v_uid
    and p.eliminado_en is null;

  if v_org is null then
    raise exception 'No profile';
  end if;

  if v_rol = 'admin' then
    v_tid := p_id_tienda;
    if v_tid is null then
      raise exception 'Store required';
    end if;
  else
    v_tid := v_tid_asignada;
    if v_tid is null then
      raise exception 'No store assigned';
    end if;
    if p_id_tienda is not null and p_id_tienda is distinct from v_tid then
      raise exception 'Store not allowed';
    end if;
  end if;

  if not exists (
    select 1 from public.tiendas t
    where t.id = v_tid
      and t.id_organizacion = v_org
      and t.eliminado_en is null
  ) then
    raise exception 'Store not found';
  end if;

  if not exists (select 1 from public.medios_pago where id = p_id_medio_pago) then
    raise exception 'Invalid payment method';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty cart';
  end if;

  v_descuento := coalesce(p_descuento_monto, 0);
  if v_descuento < 0 then
    raise exception 'Invalid sale discount';
  end if;

  for line in select value from jsonb_array_elements(p_items)
  loop
    v_raw_pid := nullif(
      trim(coalesce(line->>'id_product', line->>'id_producto', '')),
      ''
    );
    if v_raw_pid is null then
      raise exception 'Invalid line';
    end if;
    begin
      v_pid := v_raw_pid::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Invalid line';
    end;

    v_qty := floor(greatest(0, coalesce((line->>'cantidad')::numeric, 0)))::int;
    if v_qty < 1 then
      raise exception 'Invalid line';
    end if;

    v_desc := coalesce(
      nullif(trim(line->>'descuento_porcentaje'), '')::numeric,
      nullif(trim(line->>'descuento'), '')::numeric,
      0
    );
    if v_desc < 0 or v_desc > 100 then
      raise exception 'Invalid discount';
    end if;

    select id, id_organizacion, precio_actual into r_prod
    from public.productos
    where id = v_pid
      and eliminado_en is null;
    if not found then
      raise exception 'Product not found';
    end if;
    if r_prod.id_organizacion is distinct from v_org then
      raise exception 'Product wrong tenant';
    end if;

    v_line_total := r_prod.precio_actual * v_qty * (1 - v_desc / 100.0);
    v_total := v_total + v_line_total;
  end loop;

  if v_descuento > v_total then
    raise exception 'Sale discount exceeds subtotal';
  end if;

  v_total := v_total - v_descuento;

  insert into public.ventas (
    id_tienda,
    id_usuario,
    id_medio_pago,
    monto_total,
    descuento_monto
  )
  values (v_tid, v_uid, p_id_medio_pago, v_total, v_descuento)
  returning id into v_venta_id;

  for line in select value from jsonb_array_elements(p_items)
  loop
    v_raw_pid := nullif(
      trim(coalesce(line->>'id_product', line->>'id_producto', '')),
      ''
    );
    v_pid := v_raw_pid::uuid;
    v_qty := floor(greatest(0, coalesce((line->>'cantidad')::numeric, 0)))::int;
    v_desc := coalesce(
      nullif(trim(line->>'descuento_porcentaje'), '')::numeric,
      nullif(trim(line->>'descuento'), '')::numeric,
      0
    );
    if v_desc < 0 or v_desc > 100 then
      v_desc := 0;
    end if;

    select precio_actual into v_precio
    from public.productos
    where id = v_pid;

    v_sub := v_precio * v_qty * (1 - v_desc / 100.0);

    insert into public.detalle_ventas (
      id_venta,
      id_product,
      cantidad,
      precio_unitario_historico,
      subtotal,
      descuento_porcentaje
    )
    values (v_venta_id, v_pid, v_qty, v_precio, v_sub, v_desc);
  end loop;

  return v_venta_id;
end;
$$;

grant execute on function public.registrar_venta (uuid, jsonb, numeric, uuid) to authenticated;

-- Overloads compatibles (sin p_id_tienda: solo manager/normal)
drop function if exists public.registrar_venta (uuid, jsonb, numeric);
create or replace function public.registrar_venta (
  p_id_medio_pago uuid,
  p_items jsonb,
  p_descuento_monto numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.registrar_venta(p_id_medio_pago, p_items, p_descuento_monto, null::uuid);
end;
$$;

grant execute on function public.registrar_venta (uuid, jsonb, numeric) to authenticated;

drop function if exists public.registrar_venta (uuid, jsonb);
create or replace function public.registrar_venta (
  p_id_medio_pago uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.registrar_venta(p_id_medio_pago, p_items, 0::numeric, null::uuid);
end;
$$;

grant execute on function public.registrar_venta (uuid, jsonb) to authenticated;

-- editar_venta: acceso por tienda_accesible; productos por org
create or replace function public.editar_venta (
  p_id_venta uuid,
  p_id_medio_pago uuid,
  p_items jsonb,
  p_descuento_monto numeric default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_venta_tid uuid;
  line jsonb;
  v_pid uuid;
  v_raw_pid text;
  v_qty int;
  v_precio numeric;
  v_desc numeric;
  v_sub numeric;
  v_total numeric := 0;
  v_descuento numeric;
  r_prod record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.id_organizacion, p.rol
    into v_org, v_rol
  from public.perfiles p
  where p.id = v_uid
    and p.eliminado_en is null;

  if v_org is null then
    raise exception 'No profile';
  end if;

  if v_rol not in ('admin', 'manager') then
    raise exception 'Not allowed';
  end if;

  select v.id_tienda into v_venta_tid
  from public.ventas v
  where v.id = p_id_venta;

  if v_venta_tid is null then
    raise exception 'Sale not found';
  end if;

  if not public.tienda_accesible(v_venta_tid) then
    raise exception 'Sale wrong tenant';
  end if;

  if not exists (select 1 from public.medios_pago where id = p_id_medio_pago) then
    raise exception 'Invalid payment method';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty cart';
  end if;

  v_descuento := coalesce(p_descuento_monto, 0);
  if v_descuento < 0 then
    raise exception 'Invalid sale discount';
  end if;

  for line in select value from jsonb_array_elements(p_items)
  loop
    v_raw_pid := nullif(
      trim(coalesce(line->>'id_product', line->>'id_producto', '')),
      ''
    );
    if v_raw_pid is null then
      raise exception 'Invalid line';
    end if;
    begin
      v_pid := v_raw_pid::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Invalid line';
    end;

    v_qty := floor(greatest(0, coalesce((line->>'cantidad')::numeric, 0)))::int;
    if v_qty < 1 then
      raise exception 'Invalid line';
    end if;

    v_desc := coalesce(
      nullif(trim(line->>'descuento_porcentaje'), '')::numeric,
      nullif(trim(line->>'descuento'), '')::numeric,
      0
    );
    if v_desc < 0 or v_desc > 100 then
      raise exception 'Invalid discount';
    end if;

    select id, id_organizacion, precio_actual into r_prod
    from public.productos
    where id = v_pid;
    if not found then
      raise exception 'Product not found';
    end if;
    if r_prod.id_organizacion is distinct from v_org then
      raise exception 'Product wrong tenant';
    end if;

    v_precio := nullif(trim(line->>'precio_unitario_historico'), '')::numeric;
    if v_precio is null or v_precio < 0 then
      v_precio := r_prod.precio_actual;
    end if;

    v_total := v_total + (v_precio * v_qty * (1 - v_desc / 100.0));
  end loop;

  if v_descuento > v_total then
    raise exception 'Sale discount exceeds subtotal';
  end if;

  v_total := v_total - v_descuento;

  delete from public.detalle_ventas where id_venta = p_id_venta;

  update public.ventas
     set id_medio_pago = p_id_medio_pago,
         monto_total = v_total,
         descuento_monto = v_descuento
   where id = p_id_venta;

  for line in select value from jsonb_array_elements(p_items)
  loop
    v_raw_pid := nullif(
      trim(coalesce(line->>'id_product', line->>'id_producto', '')),
      ''
    );
    v_pid := v_raw_pid::uuid;
    v_qty := floor(greatest(0, coalesce((line->>'cantidad')::numeric, 0)))::int;
    v_desc := coalesce(
      nullif(trim(line->>'descuento_porcentaje'), '')::numeric,
      nullif(trim(line->>'descuento'), '')::numeric,
      0
    );
    if v_desc < 0 or v_desc > 100 then
      v_desc := 0;
    end if;

    v_precio := nullif(trim(line->>'precio_unitario_historico'), '')::numeric;
    if v_precio is null or v_precio < 0 then
      select precio_actual into v_precio
      from public.productos
      where id = v_pid;
    end if;

    v_sub := v_precio * v_qty * (1 - v_desc / 100.0);

    insert into public.detalle_ventas (
      id_venta,
      id_product,
      cantidad,
      precio_unitario_historico,
      subtotal,
      descuento_porcentaje
    )
    values (p_id_venta, v_pid, v_qty, v_precio, v_sub, v_desc);
  end loop;
end;
$$;

grant execute on function public.editar_venta (uuid, uuid, jsonb, numeric) to authenticated;

create or replace function public.editar_venta (
  p_id_venta uuid,
  p_id_medio_pago uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.editar_venta(p_id_venta, p_id_medio_pago, p_items, 0::numeric);
end;
$$;

grant execute on function public.editar_venta (uuid, uuid, jsonb) to authenticated;

-- Precios: solo admin, por organización
create or replace function public.actualizar_precios_productos (
  p_items jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_count int;
  v_bad int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.id_organizacion, p.rol
    into v_org, v_rol
  from public.perfiles p
  where p.id = v_uid
    and p.eliminado_en is null;

  if v_org is null then
    raise exception 'No profile';
  end if;

  if v_rol is distinct from 'admin' then
    raise exception 'Not allowed';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty items';
  end if;

  select count(*)::int into v_bad
  from jsonb_to_recordset(p_items) as x(id uuid, precio_actual numeric)
  where x.id is null
     or x.precio_actual is null
     or x.precio_actual < 0;

  if v_bad > 0 then
    raise exception 'Invalid price';
  end if;

  with payload as (
    select x.id, x.precio_actual
    from jsonb_to_recordset(p_items) as x(id uuid, precio_actual numeric)
  ),
  updated as (
    update public.productos p
       set precio_actual = payload.precio_actual
      from payload
     where p.id = payload.id
       and p.id_organizacion = v_org
    returning p.id
  )
  select count(*)::int into v_count from updated;

  if v_count <> jsonb_array_length(p_items) then
    raise exception 'Product not found or wrong tenant';
  end if;

  return v_count;
end;
$$;

grant execute on function public.actualizar_precios_productos (jsonb) to authenticated;

-- Agregados POS / dashboard: join productos por org de la tienda
create or replace function public.unidades_vendidas_por_tienda(
  p_id_tienda uuid
)
returns table (
  id_product uuid,
  unidades numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    dv.id_product,
    sum(dv.cantidad)::numeric as unidades
  from public.detalle_ventas dv
  inner join public.ventas v
    on v.id = dv.id_venta
   and v.id_tienda = p_id_tienda
   and v.fecha_venta >= (now() - interval '90 days')
  inner join public.productos p
    on p.id = dv.id_product
  inner join public.tiendas t
    on t.id = p_id_tienda
   and p.id_organizacion = t.id_organizacion
  where public.tienda_accesible(p_id_tienda)
  group by dv.id_product;
$$;

grant execute on function public.unidades_vendidas_por_tienda(uuid) to authenticated;

create or replace function public.top_productos_por_tienda(
  p_id_tienda uuid,
  p_limit int default 3
)
returns table (
  nombre text,
  unidades numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.nombre, s.unidades
  from (
    select
      dv.id_product,
      sum(dv.cantidad)::numeric as unidades
    from public.detalle_ventas dv
    inner join public.ventas v on v.id = dv.id_venta and v.id_tienda = p_id_tienda
    where public.tienda_accesible(p_id_tienda)
    group by dv.id_product
    order by unidades desc
    limit greatest(1, least(coalesce(p_limit, 3), 50))
  ) s
  inner join public.productos p on p.id = s.id_product
  inner join public.tiendas t on t.id = p_id_tienda and p.id_organizacion = t.id_organizacion
  order by s.unidades desc;
$$;

grant execute on function public.top_productos_por_tienda(uuid, int) to authenticated;
