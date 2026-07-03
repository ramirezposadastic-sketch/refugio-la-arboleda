# Configuración pendiente de Bold

## Datos necesarios

- Cuenta Bold activa.
- Confirmar si tiene Botón de pagos activo.
- Confirmar si tiene API Link de pagos disponible.
- Llave de identidad o API Key.
- Llave secreta.
- Ambiente de pruebas.
- Link del comercio si se usará como respaldo.
- Confirmar webhook si se usará fase automática.

## Importante

- No enviar llaves secretas por WhatsApp.
- Las llaves deben configurarse como variables de entorno.
- Nunca poner llaves privadas en React.
- Primero probar con ambiente de pruebas.
- Luego probar con pago real pequeño.

## Flujo V1

- Cliente solicita reserva.
- Sistema calcula anticipo 40%.
- Cliente paga por Bold cuando esté activo.
- Salomé verifica en Bold.
- Salomé marca pago recibido en Admin.

## Flujo fase automática futura

- Sistema crea link con valor exacto.
- Cliente paga.
- Bold notifica por webhook.
- Sistema marca pago automáticamente.

## Variables de entorno esperadas

- `BOLD_API_KEY`
- `BOLD_SECRET_KEY`
- `BOLD_ENVIRONMENT`
- `PUBLIC_SITE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
