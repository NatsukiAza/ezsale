-- Edición atómica de una venta: cambia medio de pago, reemplaza líneas y
-- recalcula el monto total. Mantiene el `precio_unitario_historico` cuando el
-- cliente lo envía (líneas que ya existían) y usa el precio actual del producto
-- para las líneas nuevas que se agreguen desde la edición.

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

  delete from public.detalle_ventas where id_venta = p_id_venta;

  update public.ventas
     set id_medio_pago = p_id_medio_pago,
         monto_total = v_total
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

grant execute on function public.editar_venta (uuid, uuid, jsonb) to authenticated;
