# Configuración Wompi PSE - Refugio La Arboleda

Esta integración no guarda llaves reales en React ni en el repositorio. Las llaves privadas se configuran como secrets de Supabase Edge Functions.

## 1. Ejecutar SQL

En Supabase SQL Editor, ejecuta primero:

```sql
-- Archivo local
supabase/wompi-pagos.sql
```

Este script agrega columnas de pago a `public.reservas` sin modificar `reservas.id`, que en este proyecto es `bigint/int8`.

## 2. Configurar secrets

Reemplaza los valores por los reales de Wompi:

```bash
supabase secrets set WOMPI_PUBLIC_KEY="pub_prod_xxx"
supabase secrets set WOMPI_INTEGRITY_SECRET="integrity_xxx"
supabase secrets set WOMPI_EVENTS_SECRET="events_xxx"
supabase secrets set PUBLIC_SITE_URL="https://tudominio.com"
supabase secrets set SUPABASE_URL="https://asbrqmsecvuptztfnruc.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="service_role_xxx"
```

Opcional para pruebas:

```bash
supabase secrets set WOMPI_CHECKOUT_URL="https://checkout.wompi.co/p/"
```

## 3. Desplegar funciones

```bash
supabase functions deploy crear-pago-wompi
supabase functions deploy wompi-webhook --no-verify-jwt
```

## 4. Configurar webhook en Wompi

URL del webhook:

```text
https://asbrqmsecvuptztfnruc.functions.supabase.co/wompi-webhook
```

Activa eventos de transacción, especialmente actualización de transacciones aprobadas, rechazadas o con error.

## 5. Flujo esperado

1. El huésped envía la reserva.
2. La reserva queda en `public.reservas` con anticipo calculado.
3. Al hacer clic en `Pagar anticipo`, React llama `crear-pago-wompi`.
4. La Edge Function genera referencia, firma de integridad y URL de checkout.
5. Wompi procesa el pago.
6. Wompi llama `wompi-webhook`.
7. Si el pago llega `APPROVED`, la reserva queda `Confirmada` y `pago_confirmado = true`.

## 6. Cómo probar

1. Ejecuta el SQL.
2. Configura secrets de pruebas Wompi.
3. Despliega ambas funciones.
4. Crea una reserva pública normal.
5. Haz clic en `Pagar anticipo`.
6. Completa un pago de prueba en Wompi.
7. Revisa en Supabase que la reserva tenga:
   - `pago_proveedor = wompi`
   - `pago_estado = aprobado` cuando el webhook confirme
   - `pago_referencia`
   - `pago_transaction_id`
   - `pago_metodo`
   - `pago_confirmado = true`
   - `estado = Confirmada`

Si el pago se abre pero no confirma, revisa el secret `WOMPI_EVENTS_SECRET` y que el webhook esté configurado con la URL correcta.