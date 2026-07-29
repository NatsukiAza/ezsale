-- Índice compuesto para filtros hot: id_tienda + rango de fecha_venta.
create index if not exists ventas_id_tienda_fecha_idx
  on public.ventas (id_tienda, fecha_venta desc);
