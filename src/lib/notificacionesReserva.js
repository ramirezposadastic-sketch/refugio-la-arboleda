import { calcularNoches, formatoMoneda } from "./reservas";
import { formatearFechaReserva } from "../utils/fechas";
import { calcularSaldo } from "./valoresReserva";

function fechaLegible(fecha) {
  if (!fecha) return "Pendiente";
  return formatearFechaReserva(fecha);
}

function valorReserva(reserva, campo) {
  return Number(reserva?.[campo] || 0);
}

function nochesReserva(reserva) {
  if (reserva?.noches) return Number(reserva.noches);
  return calcularNoches(reserva?.fecha_ingreso, reserva?.fecha_salida);
}

export function generarMensajeReservaWhatsApp(reserva) {
  const noches = nochesReserva(reserva);

  return `
REFUGIO LA ARBOLEDA - RESUMEN DE RESERVA

Nombre: ${reserva?.nombre || "-"}
Celular: ${reserva?.celular || "-"}
Correo: ${reserva?.correo || "-"}
Cabaña: ${reserva?.cabana || "-"}
Fecha de ingreso: ${fechaLegible(reserva?.fecha_ingreso)}
Fecha de salida: ${fechaLegible(reserva?.fecha_salida)}
Noches: ${noches || 0}
Adultos: ${reserva?.adultos ?? "-"}
Niños menores de 8 años: ${reserva?.ninos_menores ?? 0}
Total: $${formatoMoneda(valorReserva(reserva, "total"))}
Anticipo registrado: $${formatoMoneda(valorReserva(reserva, "anticipo"))}
Saldo pendiente: $${formatoMoneda(calcularSaldo(valorReserva(reserva, "total"), valorReserva(reserva, "anticipo")))}
Estado: ${reserva?.estado || "Pendiente"}
Observaciones: ${reserva?.observaciones?.trim() || "Sin observaciones"}
Términos aceptados: Sí
  `.trim();
}

export function generarAsuntoReservaCorreo(reserva) {
  return `Nueva solicitud de reserva - ${reserva?.nombre || "Refugio La Arboleda"}`;
}

export function generarCuerpoReservaCorreo(reserva) {
  return `
Hola,

Llegó una nueva solicitud de reserva para Refugio La Arboleda.

${generarMensajeReservaWhatsApp(reserva)}

El anticipo se confirma manualmente por el equipo de Refugio La Arboleda.
  `.trim();
}
