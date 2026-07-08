-- Integracion Wompi PSE - Refugio La Arboleda
-- Este archivo NO se ejecuta automaticamente.
-- Ejecutalo manualmente en Supabase SQL Editor antes de activar los pagos reales.
-- Importante: public.reservas.id es bigint/int8 y NO se modifica.

alter table public.reservas
  add column if not exists pago_proveedor text default 'wompi',
  add column if not exists pago_estado text default 'pendiente',
  add column if not exists pago_referencia text,
  add column if not exists pago_url text,
  add column if not exists pago_monto numeric,
  add column if not exists pago_moneda text default 'COP',
  add column if not exists pago_transaction_id text,
  add column if not exists pago_metodo text,
  add column if not exists pago_creado_en timestamptz,
  add column if not exists pago_confirmado_en timestamptz,
  add column if not exists pago_error text,
  add column if not exists pago_raw jsonb;

alter table public.reservas
  alter column pago_proveedor set default 'wompi',
  alter column pago_estado set default 'pendiente',
  alter column pago_moneda set default 'COP';

create index if not exists reservas_pago_referencia_idx
  on public.reservas(pago_referencia);

create index if not exists reservas_pago_transaction_id_idx
  on public.reservas(pago_transaction_id);

comment on column public.reservas.pago_proveedor is
  'Proveedor de pago usado para el anticipo. Valor esperado en V1: wompi.';

comment on column public.reservas.pago_estado is
  'Estados Wompi normalizados: pendiente, link_generado, aprobado, rechazado, error o estado recibido.';

comment on column public.reservas.pago_referencia is
  'Referencia enviada a Wompi para asociar la transaccion con la reserva.';

comment on column public.reservas.pago_url is
  'URL del checkout Wompi generado desde la Edge Function.';

comment on column public.reservas.pago_monto is
  'Monto del anticipo en pesos colombianos usado para crear el checkout.';

comment on column public.reservas.pago_transaction_id is
  'Identificador de la transaccion retornado por Wompi en el webhook.';

comment on column public.reservas.pago_metodo is
  'Metodo de pago reportado por Wompi, por ejemplo PSE o CARD.';

comment on column public.reservas.pago_raw is
  'Payload completo recibido desde el webhook de Wompi para auditoria.';