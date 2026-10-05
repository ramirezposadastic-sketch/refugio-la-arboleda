import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Reserva = Record<string, any>;

type LogEstado = "enviado" | "error" | "pendiente";
type TipoCorreo = "equipo_nueva_reserva" | "cliente_reserva";

const escaparHtml = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[caracter]!));

const moneda = (valor: unknown) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));

const fecha = (valor: unknown) => {
  if (!valor || typeof valor !== "string") return "Pendiente";
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "Pendiente";
  return dia.padStart(2, "0") + "/" + mes.padStart(2, "0") + "/" + anio;
};

function formatearFechaColombia(fecha: unknown, incluirHora = false) {
  if (!fecha) return "No disponible";

  const date = new Date(String(fecha));

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...(incluirHora ? { hour: "numeric", minute: "2-digit", hour12: true } as const : {}),
  }).format(date);
}

const diasDesdeFecha = (valor: string) => {
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  return Date.UTC(anio, mes - 1, dia) / 86400000;
};

const noches = (ingreso?: string, salida?: string) => {
  if (!ingreso || !salida) return 0;
  return Math.max(0, Math.round(diasDesdeFecha(salida) - diasDesdeFecha(ingreso)));
};

const normalizarReservaId = (valor: unknown) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : valor;
};

const htmlBase = (titulo: string, contenido: string) => `
  <div style="font-family:Arial,sans-serif;color:#1f2a1f;line-height:1.55;max-width:680px;margin:0 auto;padding:24px;background:#fbfaf4;">
    <div style="background:#1f4d2b;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;">
      <h1 style="margin:0;font-size:22px;">${titulo}</h1>
    </div>
    <div style="background:#fff;padding:22px;border:1px solid #e4e0d4;border-top:0;border-radius:0 0 14px 14px;">
      ${contenido}
      <p style="margin-top:24px;color:#49604d;">Refugio La Arboleda</p>
    </div>
  </div>
`;

const resumenReserva = (original: Reserva, interno = false) => {
  const reserva = Object.fromEntries(Object.entries(original).map(([campo, valor]) =>
    [campo, typeof valor === "string" ? escaparHtml(valor) : valor]));
  const total = Number(reserva.total || 0);
  const anticipo = Number(reserva.anticipo || 0);
  const saldo = Math.max(total - anticipo, 0);
  const totalNoches = noches(reserva.fecha_ingreso, reserva.fecha_salida);

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">ID / referencia</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.id || "-"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Cliente</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${reserva.nombre || "-"}</strong></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Teléfono</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.celular || "-"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Correo</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.correo || "No registrado"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Cabaña</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.cabana || "-"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Ingreso</td><td style="padding:8px;border-bottom:1px solid #eee;">${fecha(reserva.fecha_ingreso)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Salida</td><td style="padding:8px;border-bottom:1px solid #eee;">${fecha(reserva.fecha_salida)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Noches</td><td style="padding:8px;border-bottom:1px solid #eee;">${totalNoches}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Adultos</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.adultos ?? reserva.personas ?? 1}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Niños</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.ninos_menores ?? 0}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Total</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${moneda(total)}</strong></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Anticipo solicitado</td><td style="padding:8px;border-bottom:1px solid #eee;">${moneda(anticipo)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Saldo pendiente</td><td style="padding:8px;border-bottom:1px solid #eee;">${moneda(saldo)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Estado de reserva</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.estado || "Pendiente"}</td></tr>
      ${interno ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;">Estado del pago Wompi</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.pago_estado || "Sin pago registrado"}</td></tr>` : ""}
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">${interno ? "Fecha y hora de creación" : "Fecha de solicitud"}</td><td style="padding:8px;border-bottom:1px solid #eee;">${formatearFechaColombia(reserva.created_at, interno)}</td></tr>
      ${reserva.observaciones ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;">Observaciones</td><td style="padding:8px;border-bottom:1px solid #eee;">${reserva.observaciones}</td></tr>` : ""}
    </table>
  `;
};

async function registrarLog(
  supabase: any,
  reservaId: unknown,
  tipo: TipoCorreo,
  destinatario: string,
  estado: LogEstado,
  error = "",
  providerId: string | null = null,
  logId?: string,
) {
  const payload = {
    reserva_id: normalizarReservaId(reservaId),
    tipo,
    destinatario,
    estado,
    error,
    provider_id: providerId,
  };

  try {
    const query = logId
      ? supabase.from("notificaciones_reserva").update(payload).eq("id", logId)
      : supabase.from("notificaciones_reserva").insert(payload);
    const { data, error: logError } = await query.select("id").single();
    if (logError) throw logError;
    return { id: data.id as string, ok: true };
  } catch (logError) {
    console.error("No se pudo registrar log de notificación; revisar notificaciones-reserva.sql:", logError);
    return { id: logId, ok: false };
  }
}

async function enviarCorreo(apiKey: string, from: string, to: string, subject: string, html: string, clave: string) {
  for (let intento = 0; intento < 3; intento += 1) {
    let reintentable = true;
    let espera = 500 * 2 ** intento;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": clave,
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json().catch(() => ({}));
      reintentable = response.status === 429 || response.status >= 500 || body?.name === "concurrent_idempotent_requests";
      const retryAfter = Number(response.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) espera = Math.min(retryAfter * 1000, 5000);
      if (!response.ok || body?.error || typeof body?.id !== "string" || !body.id.trim()) {
        const detalle = typeof body?.error === "string" ? body.error : body?.error?.message;
        throw new Error(`Resend HTTP ${response.status}: ${body?.message || detalle || "Respuesta sin id de mensaje"}`);
      }
      return String(body.id);
    } catch (error) {
      if (!reintentable || intento === 2) throw error;
      console.warn("Reintentando correo por fallo temporal", { intento: intento + 1 });
      await new Promise((resolve) => setTimeout(resolve, espera));
    }
  }
  throw new Error("No se pudo completar el envío.");
}

async function notificarDestinatario(
  supabase: any, reservaId: unknown, tipo: TipoCorreo, destinatario: string,
  apiKey: string, remitente: string, asunto: string, html: string,
) {
  const pendiente = await registrarLog(supabase, reservaId, tipo, destinatario, "pendiente");
  let estado: LogEstado = "enviado";
  let providerId: string | null = null;
  let errorEnvio = "";
  try {
    const faltantes = [
      !apiKey && "RESEND_API_KEY", !remitente && "CORREO_REMITENTE",
      !destinatario && (tipo === "equipo_nueva_reserva" ? "CORREO_RESERVAS" : "correo del cliente"),
    ].filter(Boolean);
    if (faltantes.length) throw new Error(`Falta configurar: ${faltantes.join(", ")}.`);
    console.info("Intentando notificación de reserva", { reserva_id: reservaId, tipo });
    providerId = await enviarCorreo(apiKey, remitente, destinatario, asunto, html, `reserva/${reservaId}/${tipo}`);
    console.info("Correo aceptado por Resend", { reserva_id: reservaId, tipo, provider_id: providerId });
  } catch (error) {
    estado = "error";
    errorEnvio = error instanceof Error ? error.message : "Error enviando correo.";
    console.error("Falló notificación de reserva", { reserva_id: reservaId, tipo, error: errorEnvio });
  }
  const log = await registrarLog(supabase, reservaId, tipo, destinatario, estado, errorEnvio, providerId, pendiente.id);
  return { tipo, ok: estado === "enviado", log_ok: log.ok };
}

async function buscarReserva(supabase: any, reservaId: unknown, lookup: Record<string, string> | null) {
  if (reservaId) {
    const { data, error } = await supabase.from("reservas").select("*").eq("id", reservaId).single();
    if (error) throw error;
    return data;
  }

  if (!lookup?.celular || !lookup.cabana || !lookup.fecha_ingreso || !lookup.fecha_salida) return null;

  let query = supabase
    .from("reservas")
    .select("*")
    .eq("celular", lookup.celular || "")
    .eq("cabana", lookup.cabana || "")
    .eq("fecha_ingreso", lookup.fecha_ingreso || "")
    .eq("fecha_salida", lookup.fecha_salida || "")
    .order("created_at", { ascending: false })
    .limit(1);

  if (lookup.correo) query = query.eq("correo", lookup.correo);

  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return Response.json({ ok: false }, { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY")?.trim() || "";
    const correoReservas = Deno.env.get("CORREO_RESERVAS")?.trim() || "";
    const correoRemitente = Deno.env.get("CORREO_REMITENTE")?.trim() || "";

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ ok: false, message: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY." }, { status: 500, headers: corsHeaders });
    }

    const payload = await req.json().catch(() => ({}));
    const reservaId = payload.reservaId || payload.reserva_id || null;
    const lookup = payload.reserva_lookup || null;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
    });

    const reserva = await buscarReserva(supabaseAdmin, reservaId, lookup);

    if (!reserva) {
      return Response.json({ ok: false, message: "No se encontró la reserva guardada." }, { status: 404, headers: corsHeaders });
    }

    const idParaLog = reserva.id;
    const correoCliente = String(reserva.correo || "").trim();

    const resumen = resumenReserva(reserva);
    const htmlRefugio = htmlBase(
      "NUEVA SOLICITUD DE RESERVA",
      `<p><strong>Esta reserva fue creada desde la página web. Todavía puede estar pendiente de pago.</strong></p>
       ${resumenReserva(reserva, true)}
       <p><a href="https://refugiolaarboleda.com/admin">Revisar reserva en el panel administrativo</a></p>`,
    );

    const htmlCliente = htmlBase(
      "Recibimos tu solicitud de reserva",
      `<p>Hola ${escaparHtml(reserva.nombre || "")},</p>
       <p>Recibimos tu solicitud de reserva en Refugio La Arboleda. Tu reserva queda <strong>pendiente de confirmación</strong>.</p>
       ${resumen}
       <p>Nuestro equipo revisará la disponibilidad y el pago del anticipo para confirmar la reserva.</p>
       <p>WhatsApp: <a href="https://wa.me/573136303649">+57 313 630 3649</a></p>`,
    );

    // Independent jobs: errors or slow responses for one recipient do not block the other.
    const trabajos = [notificarDestinatario(supabaseAdmin, idParaLog, "equipo_nueva_reserva", correoReservas,
      resendKey, correoRemitente, `Nueva reserva pendiente — ${reserva.nombre || "Huésped"} — ${reserva.cabana || "Cabaña"}`, htmlRefugio)];
    if (correoCliente) {
      trabajos.push(notificarDestinatario(supabaseAdmin, idParaLog, "cliente_reserva", correoCliente,
        resendKey, correoRemitente, "Recibimos tu solicitud de reserva - Refugio La Arboleda", htmlCliente));
    }
    const resultados = await Promise.all(trabajos);
    const ok = resultados.every((resultado) => resultado.ok);
    // Provider details and internal addresses stay in server logs, not the public response.
    return Response.json({
      ok, configured: Boolean(resendKey && correoRemitente && correoReservas),
      logs_ok: resultados.every((resultado) => resultado.log_ok),
      cliente_enviado: resultados.some((resultado) => resultado.tipo === "cliente_reserva" && resultado.ok),
      equipo_enviado: resultados.some((resultado) => resultado.tipo === "equipo_nueva_reserva" && resultado.ok),
      message: ok ? "Correos aceptados por el proveedor." : "La reserva se registró, pero uno o más correos fallaron.",
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error enviando correos de reserva:", error);
    const message = "La reserva permanece guardada. No se pudieron procesar los correos.";
    return Response.json(
      { ok: false, message },
      { status: 500, headers: corsHeaders },
    );
  }
});


