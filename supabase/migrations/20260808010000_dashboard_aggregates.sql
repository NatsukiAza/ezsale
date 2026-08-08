-- Dashboard: agregación diaria + top productos con ventana temporal.

create or replace function public.ventas_diarias_por_tienda(
  p_id_tienda uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (
  dia date,
  monto numeric,
  cantidad bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (v.fecha_venta at time zone 'UTC')::date as dia,
    coalesce(sum(v.monto_total), 0)::numeric as monto,
    count(*)::bigint as cantidad
  from public.ventas v
  where v.id_tienda = p_id_tienda
    and public.tienda_accesible(p_id_tienda)
    and v.fecha_venta >= p_desde
    and v.fecha_venta < p_hasta
  group by 1
  order by 1;
$$;

grant execute on function public.ventas_diarias_por_tienda(uuid, timestamptz, timestamptz)
  to authenticated;

drop function if exists public.top_productos_por_tienda(uuid, int);

create or replace function public.top_productos_por_tienda(
  p_id_tienda uuid,
  p_limit int default 3,
  p_desde timestamptz default null
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
      and (
        p_desde is null
        or v.fecha_venta >= p_desde
      )
    group by dv.id_product
    order by unidades desc
    limit greatest(1, least(coalesce(p_limit, 3), 50))
  ) s
  inner join public.productos p on p.id = s.id_product
  inner join public.tiendas t on t.id = p_id_tienda and p.id_organizacion = t.id_organizacion
  order by s.unidades desc;
$$;

grant execute on function public.top_productos_por_tienda(uuid, int, timestamptz)
  to authenticated;
