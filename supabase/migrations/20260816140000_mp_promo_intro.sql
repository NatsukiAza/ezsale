-- Precio introductorio MP: 50% los primeros N meses de la primera suscripción.
-- El webhook cuenta cobros y hace PUT del PreApproval al precio de lista.

alter table public.organizaciones
  add column if not exists mp_promo_meses integer not null default 0,
  add column if not exists mp_promo_ciclos_cobrados integer not null default 0,
  add column if not exists mp_precio_lleno_ars integer;

alter table public.organizaciones
  drop constraint if exists organizaciones_mp_promo_meses_ck,
  drop constraint if exists organizaciones_mp_promo_ciclos_ck,
  drop constraint if exists organizaciones_mp_precio_lleno_ck;

alter table public.organizaciones
  add constraint organizaciones_mp_promo_meses_ck
    check (mp_promo_meses >= 0),
  add constraint organizaciones_mp_promo_ciclos_ck
    check (mp_promo_ciclos_cobrados >= 0),
  add constraint organizaciones_mp_precio_lleno_ck
    check (mp_precio_lleno_ars is null or mp_precio_lleno_ars > 0);

comment on column public.organizaciones.mp_promo_meses is
  'Ciclos mensuales al precio introductorio (50%) en la suscripción MP actual. 0 = sin promo.';
comment on column public.organizaciones.mp_promo_ciclos_cobrados is
  'Cobros aprobados mientras la promo está activa.';
comment on column public.organizaciones.mp_precio_lleno_ars is
  'Precio de lista (ARS) a aplicar con PUT /preapproval tras completar la promo. Null = inactiva o ya aplicada.';

alter table public.mp_webhook_events
  add column if not exists promo_ciclo_contado boolean not null default false;

comment on column public.mp_webhook_events.promo_ciclo_contado is
  'Si este evento ya incrementó mp_promo_ciclos_cobrados (idempotencia del fallback).';
