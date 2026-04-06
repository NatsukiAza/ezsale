-- Catálogo global: medio de pago Transferencia
insert into public.medios_pago (nombre)
select 'Transferencia'
where not exists (
  select 1 from public.medios_pago m where m.nombre = 'Transferencia'
);
