-- Invitados por admin: deben cambiar contraseña en el primer acceso.
-- Dueño de tienda (RPC registro / API register): debe_cambiar_password = false.

alter table public.perfiles
  add column if not exists debe_cambiar_password boolean not null default false;

comment on column public.perfiles.debe_cambiar_password is
  'Si true, el usuario debe elegir una nueva contraseña antes de usar el panel (invitados).';

-- Dueño que crea tienda con la RPC: sin cambio obligatorio
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

  insert into public.perfiles (id, id_tienda, nombre, apellido, rol, debe_cambiar_password)
  values (auth.uid(), tid, trim(p_nombre), trim(coalesce(p_apellido, '')), 'admin', false);

  return tid;
end;
$$;

grant execute on function public.create_tienda_y_perfil_admin (text, text, text) to authenticated;

-- Quitar la marca tras cambiar contraseña (cliente autenticado, solo su fila)
drop policy if exists "perfiles_update_own" on public.perfiles;

create policy "perfiles_update_own"
  on public.perfiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
