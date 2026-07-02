# Manual de uso - Refugio La Arboleda

## 1. Enlaces importantes

- Página pública: https://refugio-la-arboleda.vercel.app/
- Panel Admin: https://refugio-la-arboleda.vercel.app/admin

## 2. Cómo entrar al panel

Para entrar al panel administrativo se debe abrir el enlace `/admin` y usar el correo y la contraseña creados previamente en Supabase Auth.

Si el usuario existe en Supabase Auth pero no está registrado en la tabla `admin_users`, no podrá acceder al panel.

## 3. Qué puede hacer el administrador

- Ver reservas.
- Crear reservas.
- Editar reservas.
- Confirmar reserva.
- Confirmar pago.
- Cancelar reserva.
- Eliminar una reserva con motivo.
- Ver historial de reservas eliminadas.
- Exportar reservas.

## 4. Qué puede hacer el empleado

- Ver reservas.
- Crear reservas.
- Editar datos permitidos.
- Eliminar una reserva con motivo.

## 5. Qué no puede hacer el empleado

- Confirmar pago.
- Exportar reservas.
- Cambiar total, anticipo o saldo.
- Confirmar reservas desde los botones administrativos reservados para admin.

## 6. Cómo gestionar una reserva nueva

1. Entrar al panel Admin.
2. Revisar el indicador de solicitudes nuevas o reservas pendientes.
3. Abrir la reserva pendiente en la tabla.
4. Contactar al cliente por WhatsApp o teléfono.
5. Confirmar disponibilidad y datos de la reserva.
6. Solicitar el anticipo del 40%.
7. Cuando el pago esté confirmado, usar el botón de pago recibido.
8. Confirmar la reserva desde el panel.

## 7. Cómo cancelar una reserva

1. Entrar al panel Admin.
2. Buscar la reserva por nombre, celular, cabaña o estado.
3. Revisar que sea la reserva correcta.
4. Usar el botón Cancelar.
5. Confirmar el cambio y verificar que el estado quede como Cancelada.

Una reserva cancelada no debe bloquear disponibilidad.

## 8. Cómo eliminar una reserva con motivo

1. Entrar al panel Admin.
2. Buscar la reserva.
3. Usar el botón Eliminar.
4. Escribir el motivo de eliminación cuando el sistema lo solicite.
5. Confirmar la eliminación.

La eliminación queda registrada en el historial si el SQL de auditoría está aplicado en Supabase.

## 9. Cómo revisar historial de eliminadas

1. Entrar como administrador.
2. Usar el botón de historial de eliminadas.
3. Revisar cliente, cabaña, fechas, total, usuario que eliminó, fecha y motivo.

El historial completo solo debe estar disponible para usuarios con rol admin.

## 10. Cómo cambiar imágenes

- Las imágenes principales están en `public/imagenes/refugio`.
- Para cambiar una imagen se puede reemplazar por otra con el mismo nombre.
- Se recomienda no usar espacios, tildes ni ñ en nombres de archivos.
- Mantener imágenes livianas y nítidas para que la página cargue rápido.
- Después de cambiar imágenes, probar la página pública en móvil y escritorio.

## 11. Pagos

- En la V1 el pago es manual.
- El sistema calcula el anticipo del 40%.
- El cliente puede enviar la solicitud de reserva desde la página.
- El botón de pago queda preparado para un link manual de Bold, pero Bold automático no está integrado.
- La confirmación de pago se marca desde Admin con el botón de pago recibido.
- El anticipo se confirma manualmente por el equipo de Refugio La Arboleda.

## 12. Fase 2 recomendada

- Integración Bold automática.
- Correos automáticos reales.
- Galería administrable.
- Dominio personalizado.
- Seguridad avanzada anti doble reserva desde base de datos.
