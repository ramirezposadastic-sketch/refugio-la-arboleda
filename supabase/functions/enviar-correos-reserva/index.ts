import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Reserva = Record<string, any>;

type LogEstado = "enviado" | "error" | "pendiente";

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

function formatearFechaColombia(fecha: unknown) {
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

const resumenReserva = (reserva: Reserva) => {
  const total = Number(reserva.total || 0);
  const anticipo = Number(reserva.anticipo || 0);
  const saldo = Number(reserva.saldo_pendiente ?? Math.max(total - anticipo, 0));
  const totalNoches = noches(reserva.fecha_ingreso, reserva.fecha_salida);

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
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
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Anticipo 40%</td><td style="padding:8px;border-bottom:1px solid #eee;">${moneda(anticipo)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Saldo pendiente</td><td style="padding:8px;border-bottom:1px solid #eee;">${moneda(saldo)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Estado</td><td style="padding:8px;border-bottom:1px solid #eee;">Pendiente de confirmación</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Fecha de solicitud</td><td style="padding:8px;border-bottom:1px solid #eee;">${formatearFechaColombia(reserva.created_at)}</td></tr>
    </table>
  `;
};

async function registrarLog(
  supabase: any,
  reservaId: unknown,
  tipo: "correo_refugio" | "correo_cliente",
  destinatario: string,
  estado: LogEstado,
  error = "",
) {
  const payload = {
    reserva_id: normalizarReservaId(reservaId),
    tipo,
    destinatario,
    estado,
    error,
  };

  const { error: logError } = await supabase.from("notificaciones_reserva").insert(payload);
  if (logError) {
    console.error("No se pudo registrar log de notificación:", logError, payload);
  }
}

async function enviarCorreo(apiKey: string, from: string, to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || `No se pudo enviar el correo a ${to}.`);
  }
  return body;
}

async function buscarReserva(supabase: any, reservaId: unknown, lookup: Record<string, string> | null) {
  if (reservaId) {
    const { data, error } = await supabase.from("reservas").select("*").eq("id", reservaId).single();
    if (error) throw error;
    return data;
  }

  if (!lookup) return null;

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

function reservaDesdePayload(payload: Record<string, any>): Reserva | null {
  const reservaPayload = payload.reserva || payload.reservaPayload || null;
  if (reservaPayload) return reservaPayload;

  if (!payload.nombre && !payload.correoCliente && !payload.fechaIngreso) return null;

  return {
    id: payload.reservaId || payload.reserva_id || null,
    nombre: payload.nombre || "",
    correo: payload.correoCliente || payload.correo || "",
    celular: payload.celular || "",
    cabana: payload.cabana || "",
    fecha_ingreso: payload.fechaIngreso || payload.fecha_ingreso || "",
    fecha_salida: payload.fechaSalida || payload.fecha_salida || "",
    adultos: payload.adultos,
    ninos_menores: payload.ninosMenores ?? payload.ninos_menores,
    total: payload.total,
    anticipo: payload.anticipo,
    saldo_pendiente: payload.saldoPendiente ?? payload.saldo_pendiente,
    created_at: payload.created_at || new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const correoReservas = Deno.env.get("CORREO_RESERVAS") || "refugiolaarboleda@gmail.com";
    const correoRemitente = Deno.env.get("CORREO_REMITENTE");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ ok: false, message: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY." }, { status: 500, headers: corsHeaders });
    }

    const payload = await req.json().catch(() => ({}));
    const reservaId = payload.reservaId || payload.reserva_id || null;
    const lookup = payload.reserva_lookup || null;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const reservaEncontrada = await buscarReserva(supabaseAdmin, reservaId, lookup);
    const reservaPayload = reservaDesdePayload(payload);
    const reserva = reservaEncontrada || reservaPayload;

    if (!reserva) {
      return Response.json({ ok: false, message: "Reserva no encontrada y payload insuficiente." }, { status: 404, headers: corsHeaders });
    }

    const idParaLog = reserva.id || reservaEncontrada?.id || null;
    const correoCliente = reserva.correo || payload.correoCliente || "";

    if (!resendKey || !correoRemitente) {
      await registrarLog(supabaseAdmin, idParaLog, "correo_refugio", correoReservas, "pendiente", "Correos no configurados todavía.");
      if (correoCliente) {
        await registrarLog(supabaseAdmin, idParaLog, "correo_cliente", correoCliente, "pendiente", "Correos no configurados todavía.");
      }
      return Response.json({ ok: false, configured: false, message: "Correos no configurados todavía." }, { headers: corsHeaders });
    }

    const resumen = resumenReserva(reserva);
    const htmlRefugio = htmlBase(
      "Nueva solicitud de reserva",
      `${resumen}<p><strong>Ingresa al panel administrativo para revisar disponibilidad, verificar pago y confirmar la reserva.</strong></p>`,
    );

    const htmlCliente = htmlBase(
      "Recibimos tu solicitud de reserva",
      `<p>Hola ${reserva.nombre || ""},</p>
       <p>Recibimos tu solicitud de reserva en Refugio La Arboleda. Tu reserva queda <strong>pendiente de confirmación</strong>.</p>
       ${resumen}
       <p>Nuestro equipo revisará la disponibilidad y el pago del anticipo para confirmar la reserva.</p>
       <p>WhatsApp: <a href="https://wa.me/573136303649">+57 313 630 3649</a></p>`,
    );

    const errores: string[] = [];

    try {
      await enviarCorreo(resendKey, correoRemitente, correoReservas, "Nueva solicitud de reserva - Refugio La Arboleda", htmlRefugio);
      await registrarLog(supabaseAdmin, idParaLog, "correo_refugio", correoReservas, "enviado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error enviando correo al refugio.";
      errores.push(`Refugio: ${message}`);
      await registrarLog(supabaseAdmin, idParaLog, "correo_refugio", correoReservas, "error", message);
    }

    if (correoCliente) {
      try {
        await enviarCorreo(resendKey, correoRemitente, correoCliente, "Recibimos tu solicitud de reserva - Refugio La Arboleda", htmlCliente);
        await registrarLog(supabaseAdmin, idParaLog, "correo_cliente", correoCliente, "enviado");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error enviando correo al cliente.";
        errores.push(`Cliente: ${message}`);
        await registrarLog(supabaseAdmin, idParaLog, "correo_cliente", correoCliente, "error", message);
      }
    }

    if (errores.length > 0) {
      console.error("Errores enviando correos de reserva:", errores);
      return Response.json(
        { ok: false, configured: true, message: "La reserva se registró, pero uno o más correos fallaron.", errors: errores },
        { status: 502, headers: corsHeaders },
      );
    }

    return Response.json({ ok: true, configured: true, message: "Correos enviados correctamente." }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error enviando correos de reserva:", error);
    const message = error instanceof Error ? error.message : "No se pudieron enviar los correos.";
    return Response.json(
      { ok: false, message },
      { status: 500, headers: corsHeaders },
    );
  }
});


