-- Preparacion Bold V1 - Refugio La Arboleda
-- Este archivo NO se ejecuta automaticamente.
-- Objetivo: dejar la tabla public.reservas preparada para pagos con Bold sin tocar datos existentes.

alter table public.reservas
  add column if not exists pago_proveedor text default 'bold',
  add column if not exists pago_estado text default 'pendiente',
  add column if not exists pago_referencia text,
  add column if not exists pago_url text,
  add column if not exists pago_monto numeric,
  add column if not exists pago_moneda text default 'COP',
  add column if not exists pago_creado_en timestamptz,
  add column if not exists pago_confirmado_en timestamptz,
  add column if not exists pago_confirmado_por uuid;

comment on column public.reservas.pago_proveedor is
  'Proveedor de pago preparado para la reserva. V1 usa bold como valor por defecto.';

comment on column public.reservas.pago_estado is
  'Estados esperados: pendiente, link_generado, pagado, rechazado, vencido o cancelado.';

comment on column public.reservas.pago_referencia is
  'Referencia interna o referencia retornada por Bold para asociar el pago con la reserva.';

comment on column public.reservas.pago_url is
  'Link de pago generado por Bold cuando la integracion automatica este activa.';

comment on column public.reservas.pago_monto is
  'Monto exacto del anticipo enviado a Bold, normalmente el 40% calculado por la reserva.';

-- Guia de estados futuros:
-- pendiente: el cliente todavia no ha pagado.
-- link_generado: se creo un link de pago, pero no hay confirmacion.
-- pagado: pago verificado por Bold o por confirmacion manual.
-- rechazado / vencido / cancelado: estados futuros segun respuesta real de Bold.

-- Importante:
-- - No eliminar columnas.
-- - No modificar politicas RLS existentes.
-- - No tocar datos existentes.
-- - Ejecutar manualmente en Supabase solo cuando se vaya a preparar la fase de pagos.
