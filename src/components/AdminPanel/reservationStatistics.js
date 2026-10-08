import { isoToFecha, normalizarCabana, normalizarEstado } from "../../lib/reservas.js";

// The input is the existing filtered cohort. Never refilter or use created_at here.
export function calcularEstadisticasReservas(reservasFiltradas) {
  const estados = { pendiente: 0, confirmada: 0, cancelada: 0 };
  const meses = new Map();
  const cabanas = new Map();

  for (const reserva of reservasFiltradas) {
    const estado = normalizarEstado(reserva.estado);
    if (Object.hasOwn(estados, estado)) estados[estado] += 1;
    // isoToFecha uses the same local midnight interpretation as the listing filter.
    const ingreso = isoToFecha(reserva.fecha_ingreso);
    const mes = ingreso && !Number.isNaN(ingreso.getTime())
      ? `${ingreso.getFullYear()}-${String(ingreso.getMonth() + 1).padStart(2, "0")}`
      : "sin-fecha";
    const cabana = normalizarCabana(reserva.cabana || "") || "Sin cabaña registrada";
    meses.set(mes, (meses.get(mes) || 0) + 1);
    cabanas.set(cabana, (cabanas.get(cabana) || 0) + 1);
  }

  return {
    total: reservasFiltradas.length,
    estados,
    porMes: [...meses.entries()].sort(([a], [b]) => a === "sin-fecha" ? 1 : b === "sin-fecha" ? -1 : b.localeCompare(a)),
    porCabana: [...cabanas.entries()].sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true })),
  };
}

export function nombreMesEstadisticas(mes) {
  if (mes === "sin-fecha") return "Sin fecha de ingreso";
  const [year, month] = mes.split("-").map(Number);
  const nombre = new Date(year, month - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}
