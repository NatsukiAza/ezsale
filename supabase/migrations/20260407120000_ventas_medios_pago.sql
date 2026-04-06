-- Medios de pago (catálogo global) y ventas + detalle multi-tenant

create table if not exists public.medios_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  constraint medios_pago_nombre_unique unique (nombre)
);

insert into public.medios_pago (nombre)
select v from (
  values
    ('Efectivo'),
    ('Mercado Pago'),
    ('Tarjeta')
) as t (v)
where not exists (select 1 from public.medios_pago m where m.nombre = t.v);

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  id_tienda uuid not null references public.tiendas (id) on delete cascade,
  id_usuario uuid not null references auth.users (id) on delete restrict,
  id_medio_pago uuid not null references public.medios_pago (id) on delete restrict,
  monto_total numeric not null check (monto_total >= 0),
  fecha_venta timestamptz not null default now()
);

create index if not exists ventas_id_tienda_idx on public.ventas (id_tienda);
create index if not exists ventas_fecha_idx on public.ventas (fecha_venta desc);

create table if not exists public.detalle_ventas (
  id uuid primary key default gen_random_uuid(),
  id_venta uuid not null references public.ventas (id) on delete cascade,
  id_product uuid not null references public.productos (id) on delete restrict,
  cantidad int not null check (cantidad > 0),
  precio_unitario_historico numeric not null,
  subtotal numeric not null check (subtotal >= 0)
);

create index if not exists detalle_ventas_id_venta_idx on public.detalle_ventas (id_venta);

alter table public.medios_pago enable row level security;
alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;

create policy "medios_pago_select_authenticated"
  on public.medios_pago for select
  to authenticated
  using (true);

create policy "ventas_select_own_tienda"
  on public.ventas for select
  using (
    id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
  );

create policy "detalle_ventas_select_own_tienda"
  on public.detalle_ventas for select
  using (
    id_venta in (
      select v.id
      from public.ventas v
      where v.id_tienda in (select id_tienda from public.perfiles where id = auth.uid())
    )
  );

-- Inserción atómica vía función (evita ventas huérfanas y valida tenant)
create or replace function public.registrar_venta (
  p_id_medio_pago uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tid uuid;
  v_uid uuid := auth.uid();
  v_venta_id uuid;
  line jsonb;
  v_pid uuid;
  v_qty int;
  v_precio numeric;
  v_sub numeric;
  v_total numeric := 0;
  r_prod record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.id_tienda into v_tid
  from public.perfiles p
  where p.id = v_uid;

  if v_tid is null then
    raise exception 'No profile';
  end if;

  if not exists (select 1 from public.medios_pago where id = p_id_medio_pago) then
    raise exception 'Invalid payment method';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty cart';
  end if;

  for line in select value from jsonb_array_elements(p_items)
  loop
    v_pid := (line->>'id_product')::uuid;
    v_qty := (line->>'cantidad')::int;
    if v_pid is null or v_qty is null or v_qty < 1 then
      raise exception 'Invalid line';
    end if;
    select id, id_tienda, precio_actual into r_prod
    from public.productos
    where id = v_pid;
    if not found then
      raise exception 'Product not found';
    end if;
    if r_prod.id_tienda is distinct from v_tid then
      raise exception 'Product wrong tenant';
    end if;
    v_total := v_total + (r_prod.precio_actual * v_qty);
  end loop;

  insert into public.ventas (id_tienda, id_usuario, id_medio_pago, monto_total)
  values (v_tid, v_uid, p_id_medio_pago, v_total)
  returning id into v_venta_id;

  for line in select value from jsonb_array_elements(p_items)
  loop
    v_pid := (line->>'id_product')::uuid;
    v_qty := (line->>'cantidad')::int;
    select precio_actual into v_precio
    from public.productos
    where id = v_pid;
    v_sub := v_precio * v_qty;
    insert into public.detalle_ventas (
      id_venta,
      id_product,
      cantidad,
      precio_unitario_historico,
      subtotal
    )
    values (v_venta_id, v_pid, v_qty, v_precio, v_sub);
  end loop;

  return v_venta_id;
end;
$$;

grant execute on function public.registrar_venta (uuid, jsonb) to authenticated;
