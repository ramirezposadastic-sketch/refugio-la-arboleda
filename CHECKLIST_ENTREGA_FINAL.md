# Checklist de entrega final - Refugio La Arboleda

## Página pública

- [ ] Navbar.
- [ ] Hero.
- [ ] Experiencias.
- [ ] Cabañas.
- [ ] Tarifas.
- [ ] Galería.
- [ ] Río de Oro.
- [ ] Reservas.
- [ ] Contacto.
- [ ] WhatsApp.
- [ ] Responsive móvil.

## Reservas

- [ ] Reserva de 1 noche.
- [ ] Reserva de 2 noches con descuento del 10%.
- [ ] Reserva de 3 noches con descuento del 15%.
- [ ] Reserva de más de 3 noches.
- [ ] Reserva con 1 adulto + 1 niño.
- [ ] Reserva con 2 adultos.
- [ ] Anticipo 40%.
- [ ] Términos obligatorios.
- [ ] Envío correcto.
- [ ] No doble envío después de solicitud exitosa.
- [ ] Guardado correcto en Supabase.

## Pagos

- [ ] Botón Pagar anticipo sin Bold configurado.
- [ ] Mensaje correcto de pago no disponible.
- [ ] Valor exacto del anticipo visible después de enviar solicitud.
- [ ] WhatsApp como respaldo.
- [ ] Admin mantiene confirmación manual de pago.
- [ ] No se marca pago como recibido automáticamente.

## Admin

- [ ] Login admin.
- [ ] Login empleado.
- [ ] Usuario no autorizado bloqueado.
- [ ] Reservas pendientes destacadas.
- [ ] Crear reserva.
- [ ] Editar reserva.
- [ ] Confirmar pago.
- [ ] Confirmar reserva.
- [ ] Cancelar.
- [ ] Eliminar con motivo.
- [ ] Historial eliminadas.
- [ ] Exportar.
- [ ] Copiar resumen de reserva.
- [ ] Ver información de pago si existe.

## Supabase

- [ ] Reserva aparece en tabla `reservas`.
- [ ] Pendiente bloquea disponibilidad.
- [ ] Confirmada bloquea disponibilidad.
- [ ] Cancelada no bloquea disponibilidad.
- [ ] Eliminada no bloquea disponibilidad.
- [ ] SQL `preparacion-bold-v1.sql` revisado antes de ejecutar.
- [ ] Edge Function `crear-pago-bold` queda como plantilla.
- [ ] Edge Function `bold-webhook` queda como plantilla.

## SEO

- [ ] `robots.txt`.
- [ ] `sitemap.xml`.
- [ ] Imagen al compartir.
- [ ] Favicon.
- [ ] Título y descripción correctos.

## Pruebas finales agregadas

### Correos

- Crear una reserva con correo válido.
- Verificar correo interno en `refugiolaarboleda@gmail.com`.
- Verificar correo al cliente con texto de solicitud recibida, no confirmada.
- Probar qué ocurre si faltan secretos de correo: la reserva debe quedar guardada igual.

### Admin

- Ver tarjetas de `Estado de reservas` agrupadas.
- Ver tarjetas de `Resumen financiero` agrupadas.
- Confirmar que ventas, anticipos, saldos e ingresos del mes mantienen los mismos cálculos.

### Fotos

- Entrar como admin.
- Abrir `Gestión de fotos`.
- Subir una foto al bucket `imagenes-refugio`.
- Asignar categoría y título.
- Ver vista previa y copiar URL.
- Activar/desactivar foto.
- Eliminar foto.
- Confirmar que la página pública no se rompe si no hay fotos dinámicas.
- Confirmar fallback a imágenes locales.
