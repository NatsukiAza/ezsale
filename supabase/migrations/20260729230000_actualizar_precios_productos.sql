-- Actualización atómica de precios de productos de la tienda del usuario.

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
  v_tid uuid;
  v_count int;
  v_bad int;
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
       and p.id_tienda = v_tid
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
