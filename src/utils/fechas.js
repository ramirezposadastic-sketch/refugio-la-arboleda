const ZONA_HORARIA_COLOMBIA = "America/Bogota";

export function formatearFechaHoraColombia(fecha) {
  if (!fecha) return "-";

  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "-";

  return new Intl.DateTimeFormat("es-CO", {
    timeZone: ZONA_HORARIA_COLOMBIA,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(valor);
}

export function formatearFechaReserva(fechaYYYYMMDD) {
  if (!fechaYYYYMMDD) return "-";

  const texto = String(fechaYYYYMMDD).slice(0, 10);
  const [anio, mes, dia] = texto.split("-");

  if (!anio || !mes || !dia) return "-";
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
}

export function formatearFechaColombia(fecha) {
  return formatearFechaReserva(fecha);
}
