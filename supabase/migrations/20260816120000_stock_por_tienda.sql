-- Stock opcional por organización; cantidades por producto × tienda.
-- Sin fila en stock_tienda = producto sin cargar en esa tienda.

alter table public.organizaciones
  add column if not exists usa_stock boolean not null default false;

comment on column public.organizaciones.usa_stock is
  'Si true, la org controla stock. Apagar no borra cantidades ni movimientos.';

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.stock_tienda (
  id_producto uuid not null references public.productos (id) on delete cascade,
  id_tienda uuid not null references public.tiendas (id) on delete cascade,
  cantidad integer not null,
  actualizado_en timestamptz not null default now(),
  primary key (id_producto, id_tienda)
);

create index if not exists stock_tienda_id_tienda_idx
  on public.stock_tienda (id_tienda);

comment on table public.stock_tienda is
  'Cantidad actual por producto y tienda. Ausencia de fila = sin cargar.';

create table if not exists public.stock_traspasos (
  id uuid primary key default gen_random_uuid(),
  id_organizacion uuid not null references public.organizaciones (id) on delete cascade,
  id_tienda_origen uuid not null references public.tiendas (id) on delete restrict,
  id_tienda_destino uuid not null references public.tiendas (id) on delete restrict,
  id_usuario uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint stock_traspasos_tiendas_distintas_check
    check (id_tienda_origen is distinct from id_tienda_destino)
);

create index if not exists stock_traspasos_org_created_idx
  on public.stock_traspasos (id_organizacion, created_at desc);
create index if not exists stock_traspasos_origen_idx
  on public.stock_traspasos (id_tienda_origen);
create index if not exists stock_traspasos_destino_idx
  on public.stock_traspasos (id_tienda_destino);

create table if not exists public.stock_traspaso_lineas (
  id_traspaso uuid not null references public.stock_traspasos (id) on delete cascade,
  id_producto uuid not null references public.productos (id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  primary key (id_traspaso, id_producto)
);

create index if not exists stock_traspaso_lineas_producto_idx
  on public.stock_traspaso_lineas (id_producto);

create table if not exists public.stock_movimientos (
  id uuid primary key default gen_random_uuid(),
  id_tienda uuid not null references public.tiendas (id) on delete cascade,
  id_producto uuid not null references public.productos (id) on delete cascade,
  tipo text not null,
  cantidad integer not null,
  cantidad_resultante integer not null,
  id_venta uuid references public.ventas (id) on delete set null,
  id_traspaso uuid references public.stock_traspasos (id) on delete set null,
  id_usuario uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint stock_movimientos_tipo_check
    check (tipo in (
      'venta',
      'edicion_venta',
      'recuento',
      'traspaso_salida',
      'traspaso_entrada'
    )),
  constraint stock_movimientos_cantidad_check
    check (cantidad <> 0)
);

create index if not exists stock_movimientos_tienda_created_idx
  on public.stock_movimientos (id_tienda, created_at desc);
create index if not exists stock_movimientos_producto_tienda_created_idx
  on public.stock_movimientos (id_producto, id_tienda, created_at desc);
create index if not exists stock_movimientos_traspaso_idx
  on public.stock_movimientos (id_traspaso)
  where id_traspaso is not null;
create index if not exists stock_movimientos_venta_idx
  on public.stock_movimientos (id_venta)
  where id_venta is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.stock_tienda enable row level security;
alter table public.stock_traspasos enable row level security;
alter table public.stock_traspaso_lineas enable row level security;
alter table public.stock_movimientos enable row level security;

create policy "stock_tienda_select_accessible"
  on public.stock_tienda for select
  to authenticated
  using (public.tienda_accesible(id_tienda));

create policy "stock_traspasos_select_accessible"
  on public.stock_traspasos for select
  to authenticated
  using (
    id_organizacion = public.mi_id_organizacion()
    and public.mi_rol() in ('admin', 'manager')
    and (
      public.tienda_accesible(id_tienda_origen)
      or public.tienda_accesible(id_tienda_destino)
    )
  );

create policy "stock_traspaso_lineas_select_accessible"
  on public.stock_traspaso_lineas for select
  to authenticated
  using (
    exists (
      select 1
      from public.stock_traspasos t
      where t.id = id_traspaso
        and t.id_organizacion = public.mi_id_organizacion()
        and public.mi_rol() in ('admin', 'manager')
        and (
          public.tienda_accesible(t.id_tienda_origen)
          or public.tienda_accesible(t.id_tienda_destino)
        )
    )
  );

create policy "stock_movimientos_select_manager"
  on public.stock_movimientos for select
  to authenticated
  using (
    public.tienda_accesible(id_tienda)
    and public.mi_rol() in ('admin', 'manager')
  );

-- Mutaciones solo vía RPC (security definer).

-- ---------------------------------------------------------------------------
-- Helpers internos (sin execute para authenticated)
-- ---------------------------------------------------------------------------

create or replace function public._stock_insert_movimiento(
  p_id_tienda uuid,
  p_id_producto uuid,
  p_tipo text,
  p_cantidad integer,
  p_cantidad_resultante integer,
  p_id_usuario uuid,
  p_id_venta uuid default null,
  p_id_traspaso uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_cantidad = 0 then
    return;
  end if;
  insert into public.stock_movimientos (
    id_tienda,
    id_producto,
    tipo,
    cantidad,
    cantidad_resultante,
    id_venta,
    id_traspaso,
    id_usuario
  )
  values (
    p_id_tienda,
    p_id_producto,
    p_tipo,
    p_cantidad,
    p_cantidad_resultante,
    p_id_venta,
    p_id_traspaso,
    p_id_usuario
  );
end;
$$;

revoke all on function public._stock_insert_movimiento(
  uuid, uuid, text, integer, integer, uuid, uuid, uuid
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.set_organizacion_usa_stock(p_usa boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_usa boolean;
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

  update public.organizaciones
     set usa_stock = coalesce(p_usa, false)
   where id = v_org
  returning usa_stock into v_usa;

  return v_usa;
end;
$$;

revoke all on function public.set_organizacion_usa_stock(boolean) from public;
grant execute on function public.set_organizacion_usa_stock(boolean) to authenticated;

create or replace function public.recuento_stock(
  p_id_tienda uuid,
  p_id_producto uuid,
  p_cantidad integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_tid_asignada uuid;
  v_old integer;
  v_delta integer;
  v_new integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_id_tienda is null or p_id_producto is null then
    raise exception 'Invalid stock count';
  end if;
  if p_cantidad is null then
    raise exception 'Invalid stock count';
  end if;

  select p.id_organizacion, p.rol, p.id_tienda
    into v_org, v_rol, v_tid_asignada
  from public.perfiles p
  where p.id = v_uid
    and p.eliminado_en is null;

  if v_org is null then
    raise exception 'No profile';
  end if;
  if v_rol not in ('admin', 'manager') then
    raise exception 'Not allowed';
  end if;
  if v_rol <> 'admin' and v_tid_asignada is distinct from p_id_tienda then
    raise exception 'Store not allowed';
  end if;
  if not public.tienda_accesible(p_id_tienda) then
    raise exception 'Store not allowed';
  end if;

  if not exists (
    select 1 from public.organizaciones o
    where o.id = v_org and o.usa_stock
  ) then
    raise exception 'Stock disabled';
  end if;

  if not exists (
    select 1 from public.productos pr
    where pr.id = p_id_producto
      and pr.id_organizacion = v_org
      and pr.eliminado_en is null
  ) then
    raise exception 'Product not found';
  end if;

  select s.cantidad into v_old
  from public.stock_tienda s
  where s.id_producto = p_id_producto
    and s.id_tienda = p_id_tienda
  for update;

  if v_old is null then
    insert into public.stock_tienda (id_producto, id_tienda, cantidad)
    values (p_id_producto, p_id_tienda, p_cantidad)
    on conflict (id_producto, id_tienda)
    do update set
      cantidad = excluded.cantidad,
      actualizado_en = now()
    returning cantidad into v_new;
    v_delta := v_new;
  else
    v_delta := p_cantidad - v_old;
    update public.stock_tienda
       set cantidad = p_cantidad,
           actualizado_en = now()
     where id_producto = p_id_producto
       and id_tienda = p_id_tienda
    returning cantidad into v_new;
  end if;

  if v_delta <> 0 then
    perform public._stock_insert_movimiento(
      p_id_tienda,
      p_id_producto,
      'recuento',
      v_delta,
      v_new,
      v_uid,
      null,
      null
    );
  end if;

  return v_new;
end;
$$;

revoke all on function public.recuento_stock(uuid, uuid, integer) from public;
grant execute on function public.recuento_stock(uuid, uuid, integer) to authenticated;

create or replace function public.tiendas_destino_traspaso(p_id_tienda_origen uuid)
returns table (id uuid, nombre text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_tid_asignada uuid;
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
  if v_rol not in ('admin', 'manager') then
    raise exception 'Not allowed';
  end if;
  if v_rol <> 'admin' and v_tid_asignada is distinct from p_id_tienda_origen then
    raise exception 'Store not allowed';
  end if;

  return query
  select t.id, t.nombre
  from public.tiendas t
  where t.id_organizacion = v_org
    and t.eliminado_en is null
    and t.id is distinct from p_id_tienda_origen
  order by t.nombre;
end;
$$;

revoke all on function public.tiendas_destino_traspaso(uuid) from public;
grant execute on function public.tiendas_destino_traspaso(uuid) to authenticated;

create or replace function public.traspasar_stock(
  p_id_tienda_origen uuid,
  p_id_tienda_destino uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_tid_asignada uuid;
  v_traspaso_id uuid;
  line jsonb;
  v_pid uuid;
  v_qty int;
  v_raw_pid text;
  v_origen_qty int;
  v_dest_qty int;
  v_result jsonb := '[]'::jsonb;
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
  if v_rol not in ('admin', 'manager') then
    raise exception 'Not allowed';
  end if;
  if v_rol <> 'admin' and v_tid_asignada is distinct from p_id_tienda_origen then
    raise exception 'Store not allowed';
  end if;

  if not exists (
    select 1 from public.organizaciones o
    where o.id = v_org and o.usa_stock
  ) then
    raise exception 'Stock disabled';
  end if;

  if p_id_tienda_origen is null or p_id_tienda_destino is null then
    raise exception 'Invalid transfer';
  end if;
  if p_id_tienda_origen is not distinct from p_id_tienda_destino then
    raise exception 'Invalid transfer';
  end if;

  if not exists (
    select 1 from public.tiendas t
    where t.id = p_id_tienda_origen
      and t.id_organizacion = v_org
      and t.eliminado_en is null
  ) then
    raise exception 'Store not found';
  end if;
  if not exists (
    select 1 from public.tiendas t
    where t.id = p_id_tienda_destino
      and t.id_organizacion = v_org
      and t.eliminado_en is null
  ) then
    raise exception 'Store not found';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty transfer';
  end if;

  if (
    select count(*) <> count(distinct x.pid)
    from (
      select (nullif(trim(coalesce(e->>'id_producto', e->>'id_product', '')), ''))::uuid as pid
      from jsonb_array_elements(p_items) e
    ) x
    where x.pid is not null
  ) then
    raise exception 'Invalid line';
  end if;

  -- Validar líneas y productos antes de bloquear.
  for line in select value from jsonb_array_elements(p_items)
  loop
    v_raw_pid := nullif(trim(coalesce(line->>'id_producto', line->>'id_product', '')), '');
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
    if not exists (
      select 1 from public.productos pr
      where pr.id = v_pid
        and pr.id_organizacion = v_org
        and pr.eliminado_en is null
    ) then
      raise exception 'Product not found';
    end if;
  end loop;

  -- Locks en orden estable (tienda, producto) para evitar deadlocks.
  perform s.id_producto
  from public.stock_tienda s
  where s.id_tienda in (p_id_tienda_origen, p_id_tienda_destino)
    and s.id_producto in (
      select (nullif(trim(coalesce(e->>'id_producto', e->>'id_product', '')), ''))::uuid
      from jsonb_array_elements(p_items) e
    )
  order by s.id_tienda, s.id_producto
  for update;

  insert into public.stock_traspasos (
    id_organizacion, id_tienda_origen, id_tienda_destino, id_usuario
  )
  values (v_org, p_id_tienda_origen, p_id_tienda_destino, v_uid)
  returning id into v_traspaso_id;

  for line in select value from jsonb_array_elements(p_items)
  loop
    v_pid := (nullif(trim(coalesce(line->>'id_producto', line->>'id_product', '')), ''))::uuid;
    v_qty := floor(greatest(0, coalesce((line->>'cantidad')::numeric, 0)))::int;

    select s.cantidad into v_origen_qty
    from public.stock_tienda s
    where s.id_producto = v_pid
      and s.id_tienda = p_id_tienda_origen;

    if v_origen_qty is null then
      raise exception 'Origin stock not loaded';
    end if;
    if v_origen_qty < v_qty then
      raise exception 'Insufficient stock';
    end if;

    update public.stock_tienda
       set cantidad = cantidad - v_qty,
           actualizado_en = now()
     where id_producto = v_pid
       and id_tienda = p_id_tienda_origen
    returning cantidad into v_origen_qty;

    insert into public.stock_tienda (id_producto, id_tienda, cantidad)
    values (v_pid, p_id_tienda_destino, v_qty)
    on conflict (id_producto, id_tienda)
    do update set
      cantidad = public.stock_tienda.cantidad + excluded.cantidad,
      actualizado_en = now()
    returning cantidad into v_dest_qty;

    insert into public.stock_traspaso_lineas (id_traspaso, id_producto, cantidad)
    values (v_traspaso_id, v_pid, v_qty);

    perform public._stock_insert_movimiento(
      p_id_tienda_origen, v_pid, 'traspaso_salida', -v_qty, v_origen_qty,
      v_uid, null, v_traspaso_id
    );
    perform public._stock_insert_movimiento(
      p_id_tienda_destino, v_pid, 'traspaso_entrada', v_qty, v_dest_qty,
      v_uid, null, v_traspaso_id
    );

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'id_producto', v_pid,
        'cantidad_origen', v_origen_qty
      )
    );
  end loop;

  return jsonb_build_object(
    'id_traspaso', v_traspaso_id,
    'lineas', v_result
  );
end;
$$;

revoke all on function public.traspasar_stock(uuid, uuid, jsonb) from public;
grant execute on function public.traspasar_stock(uuid, uuid, jsonb) to authenticated;

create or replace function public.kardex_stock(
  p_id_tienda uuid default null,
  p_id_producto uuid default null,
  p_tipo text default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null,
  p_limit integer default 80,
  p_offset integer default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  tipo text,
  cantidad integer,
  cantidad_resultante integer,
  id_producto uuid,
  producto_nombre text,
  id_tienda uuid,
  tienda_nombre text,
  id_traspaso uuid,
  id_venta uuid,
  usuario_nombre text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_rol text;
  v_tid_asignada uuid;
  v_limit int;
  v_offset int;
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
  if v_rol not in ('admin', 'manager') then
    raise exception 'Not allowed';
  end if;

  if p_id_tienda is not null then
    if v_rol <> 'admin' and v_tid_asignada is distinct from p_id_tienda then
      raise exception 'Store not allowed';
    end if;
    if not public.tienda_accesible(p_id_tienda) then
      raise exception 'Store not allowed';
    end if;
  elsif v_rol <> 'admin' then
    p_id_tienda := v_tid_asignada;
  end if;

  if p_tipo is not null and p_tipo not in (
    'venta', 'edicion_venta', 'recuento', 'traspaso_salida', 'traspaso_entrada'
  ) then
    raise exception 'Invalid type';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 80), 1), 200);
  v_offset := greatest(coalesce(p_offset, 0), 0);

  return query
  select
    m.id,
    m.created_at,
    m.tipo,
    m.cantidad,
    m.cantidad_resultante,
    m.id_producto,
    pr.nombre,
    m.id_tienda,
    ti.nombre,
    m.id_traspaso,
    m.id_venta,
    trim(both ' ' from coalesce(pe.nombre, '') || ' ' || coalesce(pe.apellido, ''))
  from public.stock_movimientos m
  inner join public.tiendas ti
    on ti.id = m.id_tienda
   and ti.id_organizacion = v_org
  inner join public.productos pr
    on pr.id = m.id_producto
   and pr.id_organizacion = v_org
  left join public.perfiles pe
    on pe.id = m.id_usuario
  where (p_id_tienda is null or m.id_tienda = p_id_tienda)
    and (p_id_producto is null or m.id_producto = p_id_producto)
    and (p_tipo is null or m.tipo = p_tipo)
    and (p_desde is null or m.created_at >= p_desde)
    and (p_hasta is null or m.created_at < p_hasta)
    and public.tienda_accesible(m.id_tienda)
  order by m.created_at desc, m.id desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.kardex_stock(
  uuid, uuid, text, timestamptz, timestamptz, integer, integer
) from public;
grant execute on function public.kardex_stock(
  uuid, uuid, text, timestamptz, timestamptz, integer, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- registrar_venta: descuenta stock si el módulo está on y hay fila cargada
-- ---------------------------------------------------------------------------

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
  v_usa_stock boolean := false;
  v_agg record;
  v_resultante int;
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

  select o.usa_stock into v_usa_stock
  from public.organizaciones o
  where o.id = v_org;

  if coalesce(v_usa_stock, false) then
    perform s.id_producto
    from public.stock_tienda s
    where s.id_tienda = v_tid
      and s.id_producto in (
        select (nullif(trim(coalesce(e->>'id_product', e->>'id_producto', '')), ''))::uuid
        from jsonb_array_elements(p_items) e
      )
    order by s.id_producto
    for update;

    for v_agg in
      select
        (nullif(trim(coalesce(e->>'id_product', e->>'id_producto', '')), ''))::uuid as pid,
        sum(floor(greatest(0, coalesce((e->>'cantidad')::numeric, 0)))::int)::int as qty
      from jsonb_array_elements(p_items) e
      group by 1
    loop
      update public.stock_tienda
         set cantidad = cantidad - v_agg.qty,
             actualizado_en = now()
       where id_tienda = v_tid
         and id_producto = v_agg.pid
      returning cantidad into v_resultante;

      if found then
        perform public._stock_insert_movimiento(
          v_tid, v_agg.pid, 'venta', -v_agg.qty, v_resultante,
          v_uid, v_venta_id, null
        );
      end if;
    end loop;
  end if;

  return v_venta_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- editar_venta: aplica delta de líneas sobre stock ya cargado
-- ---------------------------------------------------------------------------

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
  v_usa_stock boolean := false;
  v_old jsonb := '{}'::jsonb;
  v_new jsonb := '{}'::jsonb;
  v_key text;
  v_old_qty int;
  v_new_qty int;
  v_delta int;
  v_resultante int;
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

  select o.usa_stock into v_usa_stock
  from public.organizaciones o
  where o.id = v_org;

  if coalesce(v_usa_stock, false) then
    select coalesce(jsonb_object_agg(q.id_product::text, q.qty), '{}'::jsonb)
      into v_old
    from (
      select dv.id_product, sum(dv.cantidad)::int as qty
      from public.detalle_ventas dv
      where dv.id_venta = p_id_venta
      group by dv.id_product
    ) q;

    select coalesce(jsonb_object_agg(q.pid::text, q.qty), '{}'::jsonb)
      into v_new
    from (
      select
        (nullif(trim(coalesce(e->>'id_product', e->>'id_producto', '')), ''))::uuid as pid,
        sum(floor(greatest(0, coalesce((e->>'cantidad')::numeric, 0)))::int)::int as qty
      from jsonb_array_elements(p_items) e
      group by 1
    ) q;

    perform s.id_producto
    from public.stock_tienda s
    where s.id_tienda = v_venta_tid
      and s.id_producto in (
        select k::uuid
        from (
          select jsonb_object_keys(v_old) as k
          union
          select jsonb_object_keys(v_new) as k
        ) keys
      )
    order by s.id_producto
    for update;
  end if;

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

  if coalesce(v_usa_stock, false) then
    for v_key in
      select distinct k from (
        select jsonb_object_keys(v_old) as k
        union
        select jsonb_object_keys(v_new) as k
      ) s
    loop
      v_pid := v_key::uuid;
      v_old_qty := coalesce((v_old ->> v_key)::int, 0);
      v_new_qty := coalesce((v_new ->> v_key)::int, 0);
      v_delta := v_old_qty - v_new_qty;
      if v_delta = 0 then
        continue;
      end if;

      update public.stock_tienda
         set cantidad = cantidad + v_delta,
             actualizado_en = now()
       where id_tienda = v_venta_tid
         and id_producto = v_pid
      returning cantidad into v_resultante;

      if found then
        perform public._stock_insert_movimiento(
          v_venta_tid, v_pid, 'edicion_venta', v_delta, v_resultante,
          v_uid, p_id_venta, null
        );
      end if;
    end loop;
  end if;
end;
$$;
