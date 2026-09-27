import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

// Execute the real Edge handler, replacing only Deno, Supabase and HTTP boundaries.
const source = (await readFile(new URL('../supabase/functions/enviar-correos-reserva/index.ts', import.meta.url), 'utf8'))
  .replace(/^\uFEFF/, '').replace(/^import .*from "https:[^\n]+\n/gm, '');
const script = stripTypeScriptTypes(source);
const baseReserva = {
  id: 23, nombre: 'Prueba <script>', correo: 'cliente@example.test', celular: '3000000000',
  cabana: 'Cabaña 1', fecha_ingreso: '2026-09-28', fecha_salida: '2026-09-29',
  total: 620000, anticipo: 200000, saldo_pendiente: 372000,
  adultos: 2, ninos_menores: 0, estado: 'Pendiente', pago_confirmado: false,
  created_at: '2026-07-03T15:24:00Z', observaciones: '<b>nota</b>',
};

function escenario({ reserva = baseReserva, secrets = {}, provider, logError = false } = {}) {
  const logs = [];
  const requests = [];
  const warnings = [];
  let handler;
  const env = {
    SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-service',
    RESEND_API_KEY: 'test-secret', CORREO_REMITENTE: 'equipo@example.test',
    CORREO_RESERVAS: 'interno@example.test', ...secrets,
  };
  const db = {
    from(table) {
      let datos;
      let id;
      let actualizacion = false;
      const query = {
        select() { return query; }, eq(campo, valor) { if (campo === 'id') id = valor; return query; },
        order() { return query; }, limit() { return query; },
        insert(valor) { assert.equal(table, 'notificaciones_reserva'); datos = valor; return query; },
        update(valor) { assert.equal(table, 'notificaciones_reserva'); datos = valor; actualizacion = true; return query; },
        async single() {
          if (table === 'reservas') return { data: reserva, error: null };
          if (logError) return { data: null, error: { message: 'log unavailable' } };
          if (actualizacion) Object.assign(logs.find((item) => item.id === id), datos);
          else { id = String(logs.length + 1); logs.push({ ...datos, id }); }
          return { data: { id }, error: null };
        },
        then(resolve, reject) { return Promise.resolve({ data: reserva ? [reserva] : [], error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  const context = vm.createContext({
    serve(fn) { handler = fn; }, createClient() { return db; },
    Deno: { env: { get: (name) => env[name] } }, Response, Request, AbortSignal,
    console: { info() {}, warn: (...args) => warnings.push(args), error: (...args) => warnings.push(args) },
    setTimeout: (fn) => { fn(); return 0; },
    fetch: async (_url, init) => {
      const body = JSON.parse(init.body);
      requests.push({ ...body, key: init.headers['Idempotency-Key'] });
      return provider ? provider(body, requests) : Response.json({ id: `provider-${requests.length}` });
    },
  });
  vm.runInContext(script, context);
  return {
    logs, requests, warnings,
    async run(body = { reservaId: 23 }) {
      const response = await handler(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify(body) }));
      return { status: response.status, data: await response.json() };
    },
  };
}

test('reserva sin pago envia dos correos y dos logs con provider_id', async () => {
  const caso = escenario();
  const { data } = await caso.run({ reserva_lookup: { celular: baseReserva.celular, cabana: baseReserva.cabana, fecha_ingreso: baseReserva.fecha_ingreso, fecha_salida: baseReserva.fecha_salida, correo: baseReserva.correo } });
  assert.equal(data.ok, true);
  assert.equal(caso.requests.length, 2);
  assert.deepEqual(caso.logs.map((log) => log.tipo).sort(), ['cliente_reserva', 'equipo_nueva_reserva']);
  assert.ok(caso.logs.every((log) => log.estado === 'enviado' && log.provider_id && log.reserva_id === 23));
  const equipo = caso.requests.find((request) => request.to[0] === 'interno@example.test');
  assert.match(equipo.subject, /Nueva reserva pendiente.*Cabaña 1/);
  assert.match(equipo.html, /420\.000/);
  assert.doesNotMatch(equipo.html, /372\.000|<script>|<b>nota/);
  assert.match(equipo.html, /10:24/);
  assert.match(equipo.html, /refugiolaarboleda.com\/admin/);
  assert.doesNotMatch(JSON.stringify(data), /interno@example|test-secret/);
});

for (const destinatario of ['cliente@example.test', 'interno@example.test']) {
  test(`fallo de ${destinatario} no impide enviar al otro destinatario`, async () => {
    const caso = escenario({ provider: (body) => body.to[0] === destinatario
      ? Response.json({ message: 'Rejected' }, { status: 403 }) : Response.json({ id: 'accepted' }) });
    const { data } = await caso.run();
    assert.equal(data.ok, false);
    assert.equal(caso.requests.length, 2);
    assert.equal(caso.logs.filter((log) => log.estado === 'enviado').length, 1);
    assert.match(caso.logs.find((log) => log.estado === 'error').error, /403.*Rejected/);
  });
}

test('sin CORREO_RESERVAS registra error pero envia al cliente', async () => {
  const caso = escenario({ secrets: { CORREO_RESERVAS: undefined } });
  const { data } = await caso.run();
  assert.equal(data.cliente_enviado, true);
  assert.equal(data.equipo_enviado, false);
  assert.equal(data.configured, false);
  assert.equal(caso.requests.length, 1);
  assert.match(caso.logs.find((log) => log.tipo === 'equipo_nueva_reserva').error, /CORREO_RESERVAS/);
});

test('sin correo cliente igualmente notifica al equipo', async () => {
  const caso = escenario({ reserva: { ...baseReserva, correo: '' } });
  assert.equal((await caso.run()).data.equipo_enviado, true);
  assert.equal(caso.requests.length, 1);
});

test('respuesta 200 sin id no cuenta como correo enviado', async () => {
  const caso = escenario({ provider: () => Response.json({}) });
  assert.equal((await caso.run()).data.ok, false);
  assert.ok(caso.logs.every((log) => log.estado === 'error' && !log.provider_id));
});

test('reintenta 429 con la misma clave de idempotencia', async () => {
  let rechazado = false;
  const caso = escenario({ provider: (body) => {
    if (body.to[0] === 'interno@example.test' && !rechazado) {
      rechazado = true;
      return Response.json({ message: 'Rate limited' }, { status: 429 });
    }
    return Response.json({ id: 'accepted' });
  } });
  assert.equal((await caso.run()).data.ok, true);
  const intentos = caso.requests.filter((request) => request.to[0] === 'interno@example.test');
  assert.equal(intentos.length, 2);
  assert.equal(intentos[0].key, intentos[1].key);
});

test('fallos persistentes terminan despues de tres intentos por destinatario', async () => {
  const caso = escenario({ provider: () => Response.json({ message: 'Unavailable' }, { status: 503 }) });
  assert.equal((await caso.run()).data.ok, false);
  assert.equal(caso.requests.length, 6);
});

test('tabla de logs inaccesible no impide enviar y se informa el fallo', async () => {
  const caso = escenario({ logError: true });
  const { data } = await caso.run();
  assert.equal(data.ok, true);
  assert.equal(data.logs_ok, false);
  assert.equal(caso.requests.length, 2);
});

test('no envia datos inventados por el navegador si no existe la reserva', async () => {
  const caso = escenario({ reserva: null });
  assert.equal((await caso.run({ reserva: baseReserva })).status, 404);
  assert.equal(caso.requests.length, 0);
});
