# Manual de uso - Refugio La Arboleda

## 1. Enlaces importantes

- Página pública: https://refugio-la-arboleda.vercel.app/
- Panel Admin: https://refugio-la-arboleda.vercel.app/admin

## 2. Cómo entrar al panel

Para entrar al panel administrativo se debe abrir `/admin` y usar el correo y la contraseña creados en Supabase Auth.

El usuario también debe estar registrado en la tabla `admin_users`. Si existe en Supabase Auth pero no está autorizado en `admin_users`, no podrá entrar al panel.

## 3. Cómo ver reservas pendientes

1. Entrar al panel Admin.
2. Revisar la tarjeta `Solicitudes nuevas`.
3. Revisar las filas destacadas con estado `Pendiente` y badge `Nueva`.
4. Usar filtros por estado, cabaña, pago o fecha si hace falta.

## 4. Cómo confirmar una reserva

1. Revisar la solicitud pendiente.
2. Contactar al cliente.
3. Confirmar fechas, cabaña y datos.
4. Solicitar el anticipo del 40%.
5. Cuando el anticipo esté confirmado, marcar pago recibido.
6. Confirmar la reserva.

## 5. Cómo confirmar pago

1. Verificar manualmente el pago en el medio usado por el cliente.
2. Entrar al Admin.
3. Buscar la reserva.
4. Usar el botón `Pago recibido`.

La confirmación final del pago se realiza manualmente desde el Admin.

## 6. Cómo cancelar reserva

1. Buscar la reserva.
2. Revisar que sea la reserva correcta.
3. Usar el botón `Cancelar`.
4. Confirmar que el estado quede como `Cancelada`.

Una reserva cancelada no debe bloquear disponibilidad.

## 7. Cómo eliminar con motivo

1. Buscar la reserva.
2. Usar el botón `Eliminar`.
3. Escribir el motivo cuando el sistema lo solicite.
4. Confirmar la eliminación.

La eliminación queda registrada en el historial si el SQL de auditoría está aplicado.

## 8. Cómo revisar historial

1. Entrar como administrador.
2. Usar el botón de historial de eliminadas.
3. Revisar cliente, cabaña, fechas, total, usuario que eliminó, fecha y motivo.

El historial completo solo debe estar disponible para usuarios con rol admin.

## 9. Qué puede hacer admin

- Ver reservas.
- Crear reservas.
- Editar reservas.
- Confirmar reserva.
- Confirmar pago.
- Cancelar reserva.
- Eliminar con motivo.
- Ver historial de eliminadas.
- Exportar reservas.
- Copiar resumen de reserva.
- Copiar link de pago si existe.

## 10. Qué puede hacer empleado

- Ver reservas.
- Crear reservas.
- Editar datos permitidos.
- Eliminar con motivo.
- Copiar resumen de reserva.

## 11. Qué no puede hacer empleado

- Confirmar pago.
- Exportar reservas.
- Cambiar total, anticipo o saldo.
- Confirmar reservas desde acciones reservadas para admin.

## 12. Cómo cambiar imágenes

- Las imágenes principales están en `public/imagenes/refugio`.
- Para cambiar una imagen se puede reemplazar por otra con el mismo nombre.
- Se recomienda no usar espacios, tildes ni ñ en nombres de archivos.
- Mantener imágenes livianas y nítidas.
- Después de cambiar imágenes, probar la página pública en móvil y escritorio.

## 13. Cómo funcionan pagos en V1

En esta versión, el sistema calcula el anticipo del 40%. El pago en línea queda preparado para Bold. Cuando se configuren las llaves o el link oficial, el botón Pagar anticipo quedará activo. La confirmación final del pago se realiza manualmente desde el Admin.

Actualmente:

- El cliente envía la solicitud de reserva.
- La reserva queda pendiente.
- El sistema muestra el valor exacto del anticipo.
- El botón `Pagar anticipo` muestra aviso si Bold no está configurado.
- WhatsApp queda como respaldo.
- Salomé verifica el pago manualmente.
- Salomé marca `Pago recibido` desde Admin.

## 14. Qué queda pendiente para Bold automático

- Configurar cuenta Bold.
- Confirmar si se usará link manual, API de links de pago o botón de pagos.
- Configurar variables de entorno.
- Probar ambiente de pruebas.
- Ejecutar `supabase/preparacion-bold-v1.sql` cuando se vaya a activar la fase de pagos.
- Completar la Edge Function `crear-pago-bold`.
- Completar y validar el webhook `bold-webhook`.
- Probar con pago real pequeño antes de publicar.

## Correos automáticos

- Cuando un huésped envía una solicitud de reserva, el sistema intenta enviar un correo a `refugiolaarboleda@gmail.com`.
- El cliente recibe un correo indicando que su solicitud fue recibida y queda pendiente de confirmación.
- La reserva no queda confirmada automáticamente. Debe revisarse en el Admin.
- Si el correo falla o falta configuración, la reserva queda guardada igual.
- Para activar correos reales hay que configurar los secretos indicados en `CORREOS_CONFIGURACION.md` y desplegar la Edge Function.

## Gestión de fotos

1. Entrar al Admin con usuario administrador.
2. Presionar `Gestión de fotos`.
3. Seleccionar una imagen.
4. Elegir la categoría: hero, cabanas, galeria, actividades, rio, zonas, exterior o interior.
5. Escribir título y, si aplica, descripción corta.
6. Marcar si la foto estará activa y si será principal.
7. Guardar.
8. Desde la lista se puede activar/desactivar, copiar la URL, abrir vista previa o eliminar.

Recomendaciones:

- Usar fotos horizontales, nítidas y bien iluminadas.
- Evitar fotos borrosas o muy pesadas.
- Si no hay fotos dinámicas o Supabase falla, la página sigue usando las imágenes locales del proyecto.
- El bucket de Storage debe llamarse `imagenes-refugio`.
