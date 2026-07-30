-- Descuento fijo en pesos a nivel venta (además del % por línea).

alter table public.ventas
  add column if not exists descuento_monto numeric not null default 0
    check (descuento_monto >= 0);

comment on column public.ventas.descuento_monto is
  'Monto fijo descontado del subtotal de líneas (pesos). monto_total = max(0, subtotal_lineas - descuento_monto).';

-- registrar_venta: acepta descuento_monto a nivel venta.
create or replace function public.registrar_venta (
  p_id_medio_pago uuid,
  p_items jsonb,
  p_descuento_monto numeric default 0
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

    select id, id_tienda, precio_actual into r_prod
    from public.productos
    where id = v_pid;
    if not found then
      raise exception 'Product not found';
    end if;
    if r_prod.id_tienda is distinct from v_tid then
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

grant execute on function public.registrar_venta (uuid, jsonb, numeric) to authenticated;

-- Mantener overload de 2 args para clientes antiguos (descuento 0).
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
  return public.registrar_venta(p_id_medio_pago, p_items, 0::numeric);
end;
$$;

grant execute on function public.registrar_venta (uuid, jsonb) to authenticated;

-- editar_venta: acepta descuento_monto a nivel venta.
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
  v_tid uuid;
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

  select p.id_tienda into v_tid
  from public.perfiles p
  where p.id = v_uid;

  if v_tid is null then
    raise exception 'No profile';
  end if;

  select v.id_tienda into v_venta_tid
  from public.ventas v
  where v.id = p_id_venta;

  if v_venta_tid is null then
    raise exception 'Sale not found';
  end if;
  if v_venta_tid is distinct from v_tid then
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

    select id, id_tienda, precio_actual into r_prod
    from public.productos
    where id = v_pid;
    if not found then
      raise exception 'Product not found';
    end if;
    if r_prod.id_tienda is distinct from v_tid then
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
