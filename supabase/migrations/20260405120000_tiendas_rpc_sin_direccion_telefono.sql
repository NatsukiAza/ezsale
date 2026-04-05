-- Alinear con esquema sin direccion/telefono en tiendas (y función RPC de 3 argumentos).
-- Idempotente: seguro si las columnas o la función vieja ya no existen.

drop function if exists public.create_tienda_y_perfil_admin (text, text, text, text, text);

alter table if exists public.tiendas
  drop column if exists direccion,
  drop column if exists telefono;

create or replace function public.create_tienda_y_perfil_admin (
  p_nombre_tienda text,
  p_nombre text,
  p_apellido text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.perfiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  insert into public.tiendas (nombre)
  values (trim(p_nombre_tienda))
  returning id into tid;

  insert into public.perfiles (id, id_tienda, nombre, apellido, rol)
  values (auth.uid(), tid, trim(p_nombre), trim(coalesce(p_apellido, '')), 'admin');

  return tid;
end;
$$;

grant execute on function public.create_tienda_y_perfil_admin (text, text, text) to authenticated;
