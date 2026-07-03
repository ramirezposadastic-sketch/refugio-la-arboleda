# Configuración de correos automáticos

Los correos automáticos de reservas quedan preparados con una Supabase Edge Function llamada `enviar-correos-reserva`.

## Correo oficial

El correo interno de reservas es:

`refugiolaarboleda@gmail.com`

Cuando una persona envía una solicitud de reserva, el sistema intenta enviar:

- Un correo interno al refugio con el resumen de la solicitud.
- Un correo al cliente indicando que la solicitud fue recibida y queda pendiente de confirmación.

Importante: el correo del cliente no confirma la reserva. La confirmación final se hace manualmente desde el Admin.

## Variables necesarias

Configurar estos secretos en Supabase, no en React:

```bash
RESEND_API_KEY=
CORREO_RESERVAS=refugiolaarboleda@gmail.com
CORREO_REMITENTE=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`CORREO_REMITENTE` debe ser un remitente validado en Resend, por ejemplo `Reservas <reservas@tudominio.com>` cuando el dominio esté configurado.

## Comportamiento si falta configuración

Si falta `RESEND_API_KEY` o `CORREO_REMITENTE`, la reserva se guarda igual en Supabase. El cliente verá un mensaje de solicitud registrada y el error quedará en consola o en la tabla opcional de logs si está instalada.

## SQL opcional

Ejecutar `supabase/notificaciones-reserva.sql` si se quiere guardar historial de intentos de correo.

## Despliegue de la función

Ejemplo:

```bash
supabase functions deploy enviar-correos-reserva
```

Después de desplegar, crear una reserva de prueba con un correo válido y verificar el correo al refugio y al cliente.
