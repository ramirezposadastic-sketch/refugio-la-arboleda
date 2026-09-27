import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseSync } from '@babel/core';
import * as reservasLib from '../src/lib/reservas.js';
import * as valoresLib from '../src/lib/valoresReserva.js';

// Run actual Admin handlers with in-memory state and a fake Supabase transport.
// JSX rendering and real Auth/RLS remain part of the manual acceptance test.
const source = await readFile(new URL('../src/components/Admin.jsx', import.meta.url), 'utf8');
const ast = parseSync(source, { parserOpts: { sourceType: 'module', plugins: ['jsx'] } });
const admin = ast.program.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'Admin');
const helpers = new Set(['valorTotal', 'valorAnticipo', 'valorSaldo', 'adultosReserva', 'ninosReserva', 'personasReserva', 'normalizarReservaParaEditar', 'aplicarCalculoAutomatico', 'ordenarReservas']);
const handlers = new Set(['validarAdminAutorizado', 'esAdmin', 'esEmpleado', 'puedeEditarTarifas', 'puedeConfirmarPagos',
  'validarSoloAdmin', 'validarRolOperativo', 'validarReserva', 'confirmarReserva', 'confirmarPago', 'cancelarReserva',
  'editarReserva', 'guardarEdicion', 'actualizarCampoReserva', 'actualizarImporte', 'recalcularValoresEstandar', 'exportarCsv']);
const code = [
  ...ast.program.body.filter((node) => node.type === 'FunctionDeclaration' && helpers.has(node.id.name)),
  ...admin.body.body.filter((node) => node.type === 'VariableDeclaration' && node.declarations.some((declaration) => handlers.has(declaration.id.name))),
].map((node) => source.slice(node.start, node.end)).join('\n');

const baseReserva = {
  id: 23, nombre: 'Prueba', celular: '3000000000', correo: 'test@example.test',
  cabana: 'Cabaña 1', fecha_ingreso: '2026-09-28', fecha_salida: '2026-09-29',
  total: 620000, anticipo: 248000, saldo_pendiente: 372000,
  adultos: 3, ninos_menores: 0, estado: 'Pendiente', pago_confirmado: false,
};

function panel(rol = 'empleado', opciones = {}) {
  let guardada = { ...baseReserva, ...opciones.reserva };
  const updates = [];
  const alerts = [];
  const confirmations = [];
  const context = vm.createContext({
    ...reservasLib, ...valoresLib,
    rolUsuario: rol, ROL_ADMIN: 'admin', ROL_EMPLEADO: 'empleado', MENSAJE_SIN_PERMISOS: 'Sin permisos',
    adminAutorizado: opciones.autorizado ?? true, reservas: [guardada], reservaEditando: null,
    modoCrear: false, valoresManuales: false, mostrarModal: false, accionEnProceso: null,
    alert: (message) => alerts.push(message), console: { error() {} },
    window: { confirm: (message) => { confirmations.push(message); return opciones.aceptarAdvertencia ?? true; } },
    supabase: {
      from(table) {
        assert.equal(table, 'reservas');
        let payload;
        let id;
        const query = {
          update(values) { payload = values; return query; }, eq(_campo, value) { id = value; return query; },
          select() { return query; },
          async single() {
            assert.equal(id, guardada.id);
            updates.push(JSON.parse(JSON.stringify(payload)));
            guardada = { ...guardada, ...payload };
            return { data: { ...guardada }, error: null };
          },
        };
        return query;
      },
    },
  });
  for (const [setter, state] of Object.entries({ setModoCrear: 'modoCrear', setValoresManuales: 'valoresManuales',
    setReservaEditando: 'reservaEditando', setMostrarModal: 'mostrarModal', setAccionEnProceso: 'accionEnProceso', setReservas: 'reservas' })) {
    context[setter] = (value) => { context[state] = typeof value === 'function' ? value(context[state]) : value; };
  }
  vm.runInContext(code, context);
  return { context, updates, alerts, confirmations, saved: () => ({ ...guardada }),
    run: (expression) => vm.runInContext(expression, context),
  };
}

for (const rol of ['admin', 'empleado']) {
  test(`${rol}: editar anticipo, guardar y volver a abrir mantiene 620000/200000/420000`, async () => {
    const caso = panel(rol);
    caso.run('editarReserva(reservas[0]); actualizarImporte("anticipo", "200000")');
    assert.equal(caso.context.reservaEditando.saldo_pendiente, 420000);
    await caso.run('guardarEdicion()');
    const saved = caso.saved();
    assert.deepEqual([saved.total, saved.anticipo, saved.saldo_pendiente], [620000, 200000, 420000]);
    caso.context.reservas = [saved];
    caso.run('editarReserva(reservas[0])');
    assert.equal(caso.context.reservaEditando.saldo_pendiente, 420000);
  });
}

test('empleado: cambiar fechas no sobrescribe el anticipo manual; Total y Recalcular funcionan', () => {
  const caso = panel('empleado', { reserva: { anticipo: 200000 } });
  caso.run('editarReserva(reservas[0]); actualizarCampoReserva("fecha_salida", "2026-09-30")');
  assert.equal(caso.context.reservaEditando.anticipo, 200000);
  caso.run('actualizarImporte("total", "700000")');
  assert.equal(caso.context.reservaEditando.saldo_pendiente, 500000);
  caso.run('recalcularValoresEstandar()');
  assert.equal(caso.context.reservaEditando.total, 700000);
  assert.equal(caso.context.reservaEditando.anticipo, 280000);
  assert.equal(caso.context.reservaEditando.saldo_pendiente, 420000);
});

test('guardar bloquea anticipo mayor que Total y Saldo no acepta edicion manual', async () => {
  const caso = panel();
  caso.run('editarReserva(reservas[0]); actualizarImporte("saldo_pendiente", "1")');
  assert.equal(caso.context.reservaEditando.saldo_pendiente, 372000);
  caso.run('actualizarImporte("anticipo", "700000")');
  await caso.run('guardarEdicion()');
  assert.equal(caso.updates.length, 0);
  assert.match(caso.alerts.at(-1), /El anticipo no puede ser mayor/);
});

test('empleado confirma reserva y pago usando updates limitados', async () => {
  const caso = panel();
  await caso.run('confirmarReserva(reservas[0])');
  await caso.run('confirmarPago(reservas[0])');
  assert.deepEqual(caso.updates, [{ estado: 'Confirmada' }, { pago_confirmado: true, estado: 'Confirmada' }]);
  assert.equal(caso.saved().pago_confirmado, true);
});

test('empleado sigue sin cancelar, exportar ni modificar estado arbitrariamente', async () => {
  const caso = panel();
  caso.run('editarReserva(reservas[0])');
  await caso.run('cancelarReserva(23)');
  caso.run('exportarCsv(); actualizarCampoReserva("estado", "Cancelada")');
  assert.equal(caso.updates.length, 0);
  assert.equal(caso.context.reservaEditando.estado, 'Pendiente');
  assert.equal(caso.alerts.length, 3);
});

test('usuario no autorizado no puede confirmar reserva o pago', async () => {
  const caso = panel('empleado', { autorizado: false });
  await caso.run('confirmarReserva(reservas[0])');
  await caso.run('confirmarPago(reservas[0])');
  assert.equal(caso.updates.length, 0);
  assert.equal(caso.alerts.length, 2);
});

test('pago manual advierte ante rechazo Wompi y no reescribe datos del proveedor', async () => {
  const caso = panel('empleado', { reserva: { pago_estado: 'rechazado', pago_monto: 248000 } });
  await caso.run('confirmarPago(reservas[0])');
  assert.equal(caso.confirmations.length, 1);
  assert.equal(caso.saved().pago_estado, 'rechazado');
  assert.equal(caso.saved().pago_monto, 248000);
  const cancelado = panel('empleado', { reserva: { pago_estado: 'rechazado' }, aceptarAdvertencia: false });
  await cancelado.run('confirmarPago(reservas[0])');
  assert.equal(cancelado.updates.length, 0);
});

test('editar valores conserva confirmacion y transaccion Wompi aprobada', async () => {
  const caso = panel('empleado', { reserva: { pago_estado: 'aprobado', pago_confirmado: true, pago_transaccion_id: 'wompi-test' } });
  caso.run('editarReserva(reservas[0]); actualizarImporte("anticipo", "200000")');
  await caso.run('guardarEdicion()');
  assert.equal(caso.saved().pago_estado, 'aprobado');
  assert.equal(caso.saved().pago_confirmado, true);
  assert.equal(caso.saved().pago_transaccion_id, 'wompi-test');
});
