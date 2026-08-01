-- Soft-delete de productos y categorías: conservan historial en ventas,
-- pero dejan de listarse en catálogo y en nueva venta.

alter table public.productos
  add column if not exists eliminado_en timestamptz null;

comment on column public.productos.eliminado_en is
  'Si no es null, el producto está eliminado lógicamente: no aparece en catálogo ni en nueva venta; las ventas históricas siguen mostrando su nombre.';

alter table public.categorias
  add column if not exists eliminado_en timestamptz null;

comment on column public.categorias.eliminado_en is
  'Si no es null, la categoría está eliminada lógicamente. Al eliminarla se soft-deleta también sus productos (y subcategorías).';

create index if not exists productos_tienda_activos_idx
  on public.productos (id_tienda)
  where eliminado_en is null;

create index if not exists categorias_tienda_activas_idx
  on public.categorias (id_tienda)
  where eliminado_en is null;
