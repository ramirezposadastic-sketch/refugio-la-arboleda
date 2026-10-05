export function calcularSaldo(total, anticipo) {
  return Math.max(Number(total ?? 0) - Number(anticipo ?? 0), 0);
}

export function normalizarValoresReserva(reserva) {
  const total = Number(reserva.total ?? 0);
  const anticipo = Number(reserva.anticipo ?? 0);

  if (!Number.isFinite(total) || !Number.isFinite(anticipo) || total < 0 || anticipo < 0) {
    throw new Error("Total y anticipo deben ser números válidos mayores o iguales a cero.");
  }
  if (anticipo > total) {
    throw new Error("El anticipo no puede ser mayor que el total de la reserva.");
  }

  return { total, anticipo, saldo_pendiente: calcularSaldo(total, anticipo) };
}

export function recalcularAnticipo(total) {
  const numero = Number(total ?? 0);
  return normalizarValoresReserva({ total: numero, anticipo: Math.round(numero * 0.4) });
}
