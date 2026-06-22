export const CABANAS = ["Cabaña 1", "Cabaña 2", "Cabaña 3"];

export const ESTADOS_BLOQUEAN = ["pendiente", "confirmada"];

const MS_DIA = 24 * 60 * 60 * 1000;
const PORCENTAJE_ANTICIPO = 0.4;

export const TARIFAS = {
  semana: {
    personaSola: 300000,
    pareja: 420000,
    adultoAdicional: 180000,
    nino: 130000,
  },
  finDeSemana: {
    personaSola: 600000,
    pareja: 650000,
    adultoAdicional: 240000,
    nino: 180000,
  },
};

export function normalizarEstado(estado = "") {
  return estado.toString().trim().toLowerCase();
}

export function normalizarCabana(cabana = "") {
  return cabana
    .toString()
    .trim()
    .replaceAll("CabaÃ±a", "Cabaña")
    .replaceAll("Cabana", "Cabaña");
}

export function fechaToISO(fecha) {
  if (!fecha) return "";
  if (typeof fecha === "string") return fecha.slice(0, 10);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoToFecha(valor) {
  if (!valor) return null;
  return new Date(`${valor.slice(0, 10)}T00:00:00`);
}

export function sumarDias(fecha, dias) {
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(nuevaFecha.getDate() + dias);
  return nuevaFecha;
}

export function calcularNoches(fechaIngreso, fechaSalida) {
  if (!fechaIngreso || !fechaSalida) return 0;
  const ingreso = isoToFecha(fechaToISO(fechaIngreso));
  const salida = isoToFecha(fechaToISO(fechaSalida));
  return Math.ceil((salida - ingreso) / MS_DIA);
}

export function obtenerTipoTarifa(fechaIngreso) {
  const fecha = isoToFecha(fechaToISO(fechaIngreso));
  const dia = fecha?.getDay();
  return dia === 5 || dia === 6 || dia === 0 ? "finDeSemana" : "semana";
}

export function etiquetaTipoTarifa(tipoTarifa) {
  return tipoTarifa === "finDeSemana" ? "Fin de semana / Festivo" : "Entre semana";
}

export function calcularDescuentoPorNoches(noches) {
  if (noches === 2) return 10;
  if (noches === 3) return 15;
  return 0;
}

export function calcularTarifaReserva({ adultos, ninosMenores, fechaIngreso, fechaSalida }) {
  const adultosNum = Math.max(1, Number(adultos || 1));
  const ninosNum = Math.max(0, Number(ninosMenores || 0));
  const noches = calcularNoches(fechaIngreso, fechaSalida);
  const tipoTarifa = obtenerTipoTarifa(fechaIngreso);
  const tarifa = TARIFAS[tipoTarifa];
  const desglose = [];

  let valorAdultos;

  if (adultosNum === 1) {
    valorAdultos = tarifa.personaSola;
    desglose.push({ label: "Persona sola", valor: tarifa.personaSola });
  } else {
    valorAdultos = tarifa.pareja;
    desglose.push({ label: "Pareja", valor: tarifa.pareja });

    if (adultosNum > 2) {
      const adultosAdicionales = adultosNum - 2;
      const valorAdicionales = adultosAdicionales * tarifa.adultoAdicional;
      valorAdultos += valorAdicionales;
      desglose.push({ label: `Adultos adicionales (${adultosAdicionales})`, valor: valorAdicionales });
    }
  }

  const valorNinos = ninosNum * tarifa.nino;
  if (ninosNum > 0) {
    desglose.push({ label: `Niños menores (${ninosNum})`, valor: valorNinos });
  }

  const valorNoche = valorAdultos + valorNinos;
  const subtotalSinDescuento = valorNoche * (noches > 0 ? noches : 1);
  const descuentoPorcentaje = noches > 0 ? calcularDescuentoPorNoches(noches) : 0;
  const descuentoValor = Math.round(subtotalSinDescuento * (descuentoPorcentaje / 100));
  const total = subtotalSinDescuento - descuentoValor;
  const anticipo = Math.round(total * PORCENTAJE_ANTICIPO);
  const saldoPendiente = total - anticipo;
  const reservaLarga = noches > 3;

  return {
    adultos: adultosNum,
    ninosMenores: ninosNum,
    personas: adultosNum + ninosNum,
    noches,
    tipoTarifa,
    tipoReserva: etiquetaTipoTarifa(tipoTarifa),
    valorNoche,
    subtotalSinDescuento,
    descuentoPorcentaje,
    descuentoValor,
    total,
    anticipo,
    saldoPendiente,
    reservaLarga,
    desglose,
  };
}

export function reservaBloquea(reserva) {
  return ESTADOS_BLOQUEAN.includes(normalizarEstado(reserva?.estado));
}

export function cruzaFechas(inicioA, salidaA, inicioB, salidaB) {
  if (!inicioA || !salidaA || !inicioB || !salidaB) return false;
  return fechaToISO(inicioA) < fechaToISO(salidaB) && fechaToISO(salidaA) > fechaToISO(inicioB);
}

export function tieneConflictoCabana({
  reservas,
  cabana,
  fechaIngreso,
  fechaSalida,
  ignorarId,
}) {
  const cabanaNormalizada = normalizarCabana(cabana);

  return reservas.some((reserva) => {
    if (ignorarId && reserva.id === ignorarId) return false;
    if (!reservaBloquea(reserva)) return false;
    if (normalizarCabana(reserva.cabana) !== cabanaNormalizada) return false;

    return cruzaFechas(
      fechaIngreso,
      fechaSalida,
      reserva.fecha_ingreso,
      reserva.fecha_salida,
    );
  });
}

export function obtenerCabanasDisponibles({
  reservas,
  fechaIngreso,
  fechaSalida,
  ignorarId,
}) {
  if (!fechaIngreso || !fechaSalida) return CABANAS;

  return CABANAS.filter(
    (cabana) =>
      !tieneConflictoCabana({
        reservas,
        cabana,
        fechaIngreso,
        fechaSalida,
        ignorarId,
      }),
  );
}

export function asignarPrimeraCabanaDisponible({
  reservas,
  fechaIngreso,
  fechaSalida,
  cabanaPreferida,
  ignorarId,
}) {
  const cabanaNormalizada = normalizarCabana(cabanaPreferida);

  if (
    cabanaNormalizada &&
    CABANAS.includes(cabanaNormalizada) &&
    !tieneConflictoCabana({
      reservas,
      cabana: cabanaNormalizada,
      fechaIngreso,
      fechaSalida,
      ignorarId,
    })
  ) {
    return cabanaNormalizada;
  }

  return obtenerCabanasDisponibles({
    reservas,
    fechaIngreso,
    fechaSalida,
    ignorarId,
  })[0] || "";
}

export function fechaEstaLlena(reservas, fecha) {
  const nocheSalida = sumarDias(fecha, 1);
  return obtenerCabanasDisponibles({
    reservas,
    fechaIngreso: fecha,
    fechaSalida: nocheSalida,
  }).length === 0;
}

export function fechaOcupadaPorCabana(reservas, fecha, cabana) {
  const nocheSalida = sumarDias(fecha, 1);
  return tieneConflictoCabana({
    reservas,
    cabana,
    fechaIngreso: fecha,
    fechaSalida: nocheSalida,
  });
}

export function rangoDisponible({ reservas, fechaIngreso, fechaSalida, cabana, ignorarId }) {
  if (!fechaIngreso || !fechaSalida || calcularNoches(fechaIngreso, fechaSalida) <= 0) {
    return false;
  }

  if (cabana) {
    return !tieneConflictoCabana({
      reservas,
      cabana,
      fechaIngreso,
      fechaSalida,
      ignorarId,
    });
  }

  return obtenerCabanasDisponibles({
    reservas,
    fechaIngreso,
    fechaSalida,
    ignorarId,
  }).length > 0;
}

export function formatoMoneda(valor) {
  return Number(valor || 0).toLocaleString("es-CO");
}
