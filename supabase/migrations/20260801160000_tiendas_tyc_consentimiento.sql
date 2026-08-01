-- Consentimiento TyC al crear la tienda (registro / completar).

alter table public.tiendas
  add column if not exists tyc_aceptados_en timestamptz,
  add column if not exists tyc_version text;

comment on column public.tiendas.tyc_aceptados_en is
  'Momento en que el admin aceptó los Términos y Condiciones al registrar la tienda.';
comment on column public.tiendas.tyc_version is
  'Versión de TyC aceptada (ej. 2026-08). Null en tiendas creadas antes de este campo.';

-- Firma anterior: (text, text, text, text) plan opcional
drop function if exists public.create_tienda_y_perfil_admin (text, text, text, text);

create or replace function public.create_tienda_y_perfil_admin (
  p_nombre_tienda text,
  p_nombre text,
  p_apellido text,
  p_plan text default null,
  p_tyc_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  plan_val text;
  tyc_ver text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.perfiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  tyc_ver := nullif(trim(coalesce(p_tyc_version, '')), '');
  if tyc_ver is null then
    raise exception 'Debés aceptar los Términos y Condiciones';
  end if;

  plan_val := nullif(lower(trim(coalesce(p_plan, ''))), '');
  if plan_val is not null
     and plan_val not in ('local', 'sucursales', 'cadena', 'empresa') then
    plan_val := null;
  end if;

  insert into public.tiendas (nombre, plan, tyc_aceptados_en, tyc_version)
  values (trim(p_nombre_tienda), plan_val, now(), tyc_ver)
  returning id into tid;

  insert into public.perfiles (id, id_tienda, nombre, apellido, rol, debe_cambiar_password)
  values (auth.uid(), tid, trim(p_nombre), trim(coalesce(p_apellido, '')), 'admin', false);

  return tid;
end;
$$;

grant execute on function public.create_tienda_y_perfil_admin (text, text, text, text, text) to authenticated;
