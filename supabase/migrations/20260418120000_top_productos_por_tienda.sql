-- Top productos por tienda en una sola agregación (evita cargar todos los detalle_ventas).

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
    group by dv.id_product
    order by unidades desc
    limit greatest(1, least(coalesce(p_limit, 3), 50))
  ) s
  inner join public.productos p on p.id = s.id_product and p.id_tienda = p_id_tienda
  order by s.unidades desc;
$$;

grant execute on function public.top_productos_por_tienda(uuid, int) to authenticated;
