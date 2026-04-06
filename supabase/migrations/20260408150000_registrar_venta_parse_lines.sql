-- Acepta id_product o id_producto en el JSON del carrito.
-- Cantidad: leer como texto vía ->> y convertir a numeric (sirve para número o string en JSON).

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
  v_raw_pid text;
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
    v_raw_pid := nullif(
      trim(coalesce(line->>'id_product', line->>'id_producto', '')),
      ''
    );
    v_pid := v_raw_pid::uuid;
    v_qty := floor(greatest(0, coalesce((line->>'cantidad')::numeric, 0)))::int;
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
