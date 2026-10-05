import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularSaldo, normalizarValoresReserva, recalcularAnticipo } from '../src/lib/valoresReserva.js';
import { calcularTarifaReserva } from '../src/lib/reservas.js';

test('reserva publica conserva tarifas y anticipo 40%', () => {
  const tarifa = calcularTarifaReserva({ adultos: 3, ninosMenores: 0, fechaIngreso: '2026-09-28', fechaSalida: '2026-09-29' });
  assert.equal(tarifa.total, 620000);
  assert.equal(tarifa.anticipo, 248000);
  assert.equal(tarifa.saldoPendiente, 372000);
});

test('anticipo manual sustituye un saldo antiguo al guardar y recargar', () => {
  const valores = normalizarValoresReserva({ total: '620000', anticipo: '200000', saldo_pendiente: 372000 });
  assert.deepEqual(valores, { total: 620000, anticipo: 200000, saldo_pendiente: 420000 });
  assert.deepEqual(normalizarValoresReserva(JSON.parse(JSON.stringify(valores))), valores);
});

test('cambiar Total mantiene el anticipo manual', () => {
  assert.deepEqual(normalizarValoresReserva({ total: 700000, anticipo: 200000 }), {
    total: 700000, anticipo: 200000, saldo_pendiente: 500000,
  });
});

test('recalcular 40% mantiene Total; otro anticipo vuelve a derivar saldo', () => {
  assert.deepEqual(recalcularAnticipo(700000), { total: 700000, anticipo: 280000, saldo_pendiente: 420000 });
  assert.deepEqual(recalcularAnticipo(620000), { total: 620000, anticipo: 248000, saldo_pendiente: 372000 });
  assert.equal(calcularSaldo(620000, 200000), 420000);
});

test('rechaza negativos, importes no finitos y anticipo mayor que Total', () => {
  for (const valores of [{ total: -1, anticipo: 0 }, { total: 100, anticipo: -1 }, { total: 'no', anticipo: 0 }, { total: Infinity, anticipo: 0 }, { total: NaN, anticipo: 0 }]) {
    assert.throws(() => normalizarValoresReserva(valores), /números válidos/);
  }
  assert.throws(() => normalizarValoresReserva({ total: 100, anticipo: 101 }), /El anticipo no puede ser mayor/);
});
