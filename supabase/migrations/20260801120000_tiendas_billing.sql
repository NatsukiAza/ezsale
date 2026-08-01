-- Suscripción / cobro por tienda (Mercado Pago) + cuentas de cortesía.

alter table public.tiendas
  add column if not exists plan text
    check (plan is null or plan in ('local', 'sucursales', 'cadena', 'empresa')),
  add column if not exists cobro_exento boolean not null default false,
  add column if not exists nota_cobro text,
  add column if not exists pagado_hasta timestamptz,
  add column if not exists mp_preapproval_id text,
  add column if not exists mp_payer_email text,
  add column if not exists estado_mp text;

comment on column public.tiendas.plan is
  'Plan de suscripción: local | sucursales | cadena | empresa.';
comment on column public.tiendas.cobro_exento is
  'Si true, la tienda no se bloquea por falta de pago (cortesía / amigas).';
comment on column public.tiendas.nota_cobro is
  'Nota interna (ej. motivo de cobro_exento).';
comment on column public.tiendas.pagado_hasta is
  'Fin del período pagado. Sin pagos: el trial usa created_at + 30 días en app.';
comment on column public.tiendas.mp_preapproval_id is
  'ID de preapproval / suscripción en Mercado Pago.';
comment on column public.tiendas.mp_payer_email is
  'Email del pagador en Mercado Pago al crear el checkout.';
comment on column public.tiendas.estado_mp is
  'Estado mirror de MP: pending | authorized | paused | cancelled.';

create index if not exists tiendas_mp_preapproval_id_idx
  on public.tiendas (mp_preapproval_id)
  where mp_preapproval_id is not null;

-- Idempotencia de webhooks MP
create table if not exists public.mp_webhook_events (
  id text primary key,
  topic text,
  processed_at timestamptz not null default now(),
  email_enviado boolean not null default false
);

alter table public.mp_webhook_events enable row level security;
-- Sin policies para authenticated: solo service role.

-- Registro: aceptar plan opcional
drop function if exists public.create_tienda_y_perfil_admin (text, text, text);

create or replace function public.create_tienda_y_perfil_admin (
  p_nombre_tienda text,
  p_nombre text,
  p_apellido text,
  p_plan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  plan_val text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.perfiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  plan_val := nullif(lower(trim(coalesce(p_plan, ''))), '');
  if plan_val is not null
     and plan_val not in ('local', 'sucursales', 'cadena', 'empresa') then
    plan_val := null;
  end if;

  insert into public.tiendas (nombre, plan)
  values (trim(p_nombre_tienda), plan_val)
  returning id into tid;

  insert into public.perfiles (id, id_tienda, nombre, apellido, rol, debe_cambiar_password)
  values (auth.uid(), tid, trim(p_nombre), trim(coalesce(p_apellido, '')), 'admin', false);

  return tid;
end;
$$;

grant execute on function public.create_tienda_y_perfil_admin (text, text, text, text) to authenticated;

-- Cortesía (amigas): después del migrate, en SQL Editor:
--   update public.tiendas
--   set cobro_exento = true, nota_cobro = 'cortesía'
--   where id in ('uuid-tienda-1', 'uuid-tienda-2');
-- o por nombre:
--   update public.tiendas
--   set cobro_exento = true, nota_cobro = 'cortesía'
--   where nombre ilike '%NombreTienda%';
