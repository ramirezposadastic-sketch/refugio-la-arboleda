# Reservas, saldos y notificaciones

Cambios locales realizados en main. No se ejecutaron SQL, despliegues, push,
envios reales de correo ni pagos. No se inspeccionaron secrets ni logs remotos.

## Hallazgos comprobados en el codigo

- `Reservas.jsx` ya invocaba `enviar-correos-reserva` inmediatamente despues del
  INSERT, antes de cualquier pago. No habia una condicion que esperara Wompi.
- La funcion tenia dos bloques try/catch, pero no guardaba el ID de Resend,
  aceptaba un HTTP exitoso sin exigir ID y no reintentaba fallos temporales.
  Un fallo de transporte al registrar un error podia interrumpir el otro envio.
  No se puede atribuir la falta de entrega real a una causa concreta sin logs
  del proyecto y del proveedor. No se presupone que falte un secret.
- El SQL anterior borraba la tabla de logs. Ahora conserva las filas, agrega
  `provider_id`, admite los tipos nuevos y mantiene `creado_en` existente.
- Admin permitia editar Saldo independientemente. Al guardar y mostrarlo daba
  prioridad al saldo almacenado. Un empleado abria una edicion con recálculo
  automatico activo; cambiar fechas podia sustituir importes manuales.
- Correo y resumen copiado tambien podian mostrar el saldo antiguo. La formula
  publica era correcta y se conserva. Se elimino ademas el fallback antiguo
  que deducia Total como dos veces Anticipo si faltaba Total.
- Los botones Confirmar y Pago recibido usaban `esAdmin` y `validarSoloAdmin`.
  Ahora usan admin/empleado y `validarRolOperativo`. Cancelar, exportar, fotos y
  resumen financiero conservan sus restricciones. El checkbox y selector de
  estado del modal siguen restringidos: empleado confirma con los dos botones
  operativos, sin obtener permiso para desmarcar pagos ni cancelar.
- `seguridad-final-supabase.sql` ya concede UPDATE de reservas a ambos roles
  mediante `is_panel_user()`. No se ampliaron esas politicas ni se creo una RPC.
  Debe comprobarse que esta configuracion coincide con la base desplegada.

## Comportamiento monetario

Saldo = Math.max(Number(total) - Number(anticipo), 0).
Total y Anticipo son editables; Saldo es derivado y de solo lectura.
Guardar vuelve a derivarlo y rechaza negativos, no finitos y Anticipo > Total.
En ediciones, cambiar fechas/personas no sustituye los importes manuales.
Recalcular 40% mantiene Total y obtiene Anticipo y Saldo de nuevo.
Las reservas nuevas conservan su calculo inicial de tarifas y anticipo.

El historial almacenado NO se repara automaticamente. El Admin y los resumenes
leen el saldo derivado; guardar una edicion persiste el saldo correcto.
El monto del checkout Wompi se muestra separado del anticipo registrado.
Confirmar un pago manual nunca cambia `pago_estado` ni la transaccion Wompi.

## Pruebas locales sin servicios externos

Desde PowerShell (Node 24 disponible en este proyecto):

```powershell
Set-Location 'C:\Users\Usuario\refugio-la-arboleda'
git branch --show-current
node --test tests/valores-reserva.test.mjs tests/admin-reservas.test.mjs tests/notificaciones-reserva.test.mjs
npm.cmd run lint
npm.cmd run build
```

`npm.cmd` ejecuta los mismos scripts que `npm`; evita el bloqueo local de npm.ps1.
Las pruebas usan funciones reales y simulan Supabase/Resend. No envian correos.
Cubren guardar/reabrir 620000/200000/420000, Total 700000 conservando Anticipo
200000, Recalcular a 280000/420000, validaciones, permisos y fallos de correo.
No sustituyen pruebas de Auth/RLS, bandejas de correo o webhook desplegados.

La descarga de Playwright fue rechazada por la revision automatica; se continuo
con pruebas locales sin descarga, segun la indicacion del usuario.

## SQL manual y orden de activacion

1. Ejecutar `supabase/diagnostico-reservas-notificaciones.sql` en SQL Editor,
   por bloques si la tabla de logs no existe. Es solo lectura: muestra saldos
   inconsistentes, politicas, helpers, triggers, permisos y logs recientes.
2. Ejecutar `supabase/notificaciones-reserva.sql` ANTES del deploy de la funcion.
   No borra logs ni actualiza reservas. Agrega provider_id y tipos de correo;
   la lectura de logs queda para admin y la escritura para service_role.
   Es idempotente y conserva los tipos de logs antiguos. Si reserva_id y
   reservas.id tienen tipos distintos, aborta para no perder informacion.
   No volver a ejecutar versiones antiguas que contenian DROP TABLE.
3. Si el UPDATE remoto difiere del SQL del repositorio, revisar el resultado del
   diagnostico antes de cambiar permisos. No ejecutar todo el script de seguridad
   como solucion generica ni conceder permisos a todos los usuarios autenticados.

## Secrets y despliegue manual posterior

En Supabase > Edge Functions > Secrets, verificar:

- `RESEND_API_KEY`: clave del servicio de correo.
- `CORREO_REMITENTE`: remitente autorizado en Resend.
- `CORREO_RESERVAS`: correo oficial del equipo. No hay fallback hardcodeado.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: variables del runtime Supabase;
  nunca deben copiarse a React ni a variables VITE.

Comando para ejecutar MANUALMENTE cuando se apruebe publicar (no ejecutado):

```powershell
npx.cmd supabase functions deploy enviar-correos-reserva --project-ref asbrqmsecvuptztfnruc --no-verify-jwt
```

La funcion es invocada por el formulario publico sin login, por eso se despliega
sin verificacion JWT. Consulta la reserva guardada y obtiene de ella los datos;
no envia contenido de una reserva inventada en el body.
Cada correo tiene una clave de idempotencia para los reintentos limitados a tres.
Resend conserva estas claves durante 24 horas:
https://resend.com/docs/dashboard/emails/idempotency-keys

No se ha agregado una cola permanente/cron: si el navegador no llega a invocar
la funcion, no existe un worker que recupere ese intento. No se garantiza entrega
en bandeja solo por un HTTP exitoso; `enviado` significa aceptado con ID por Resend.

## Aceptacion con servicios configurados

La web local apunta al Supabase de `src/supabase.js`, actualmente el proyecto real.
Abrir localhost NO aisla los datos. Hacer pruebas de escritura en un entorno de
pruebas previamente configurado, o con una reserva real de prueba autorizada.

1. Crear una reserva publica con correo controlado, sin pagar ni abrir WhatsApp.
   Comprobar INSERT exitoso e invocacion de `enviar-correos-reserva` en Network.
2. Verificar `cliente_enviado`, `equipo_enviado` y `logs_ok` en la respuesta.
   En SQL Editor revisar dos filas por la reserva: `cliente_reserva` y
   `equipo_nueva_reserva`, con destinatario, estado y provider_id.
3. Buscar cada provider_id en Resend y confirmar entrega en ambas bandejas/spam.
   Si falla, revisar `error` y logs de Edge. La reserva debe permanecer pendiente.
4. Entrar como empleado; editar Total 620000 y Anticipo 200000. Saldo debe ser
   420000. Guardar y recargar; comprobar esos tres valores en Supabase.
5. Cambiar Total a 700000: Anticipo permanece en 200000 y Saldo pasa a 500000.
   Pulsar Recalcular 40%: 280000 y 420000. Guardar y recargar otra vez.
6. Probar Pago recibido y Confirmar. Empleado sigue sin resumen financiero,
   exportacion, cancelacion ni gestion de usuarios/configuraciones exclusivas.
   Repetir como admin. Probar que Anticipo mayor que Total impide guardar.
7. En entorno Wompi Sandbox configurado, pagar otra reserva y comprobar
   pago_estado=aprobado y pago_confirmado=true. Checkout y webhook no se editaron.
8. Comparar el anticipo registrado con Valor checkout Wompi. Si se confirma
   manualmente tras un rechazo, debe aparecer advertencia y conservarse el
   estado rechazado de la transaccion del proveedor.

## Archivos

- src/components/Admin.jsx
- src/components/Reservas.jsx
- src/lib/reservas.js
- src/lib/valoresReserva.js
- src/lib/notificacionesReserva.js
- supabase/functions/enviar-correos-reserva/index.ts
- supabase/notificaciones-reserva.sql
- supabase/diagnostico-reservas-notificaciones.sql
- tests/valores-reserva.test.mjs
- tests/admin-reservas.test.mjs
- tests/notificaciones-reserva.test.mjs
- docs/verificacion-reservas-notificaciones.md
