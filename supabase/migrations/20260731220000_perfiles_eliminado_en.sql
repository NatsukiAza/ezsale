-- Soft-delete de miembros del equipo: conservan historial de ventas y nombre,
-- pero no pueden iniciar sesión ni aparecen en la lista de usuarios activos.

alter table public.perfiles
  add column if not exists eliminado_en timestamptz null;

comment on column public.perfiles.eliminado_en is
  'Si no es null, el miembro fue eliminado lógicamente: no lista ni login; las ventas siguen mostrando su nombre.';

create index if not exists perfiles_tienda_activos_idx
  on public.perfiles (id_tienda)
  where eliminado_en is null;
