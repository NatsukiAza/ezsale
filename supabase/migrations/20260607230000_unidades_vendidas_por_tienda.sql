-- Devuelve las unidades vendidas por producto para una tienda, sin límite,
-- para poder ordenar el catálogo del front con los más vendidos primero.

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
  inner join public.productos p
    on p.id = dv.id_product
   and p.id_tienda = p_id_tienda
  group by dv.id_product;
$$;

grant execute on function public.unidades_vendidas_por_tienda(uuid) to authenticated;
