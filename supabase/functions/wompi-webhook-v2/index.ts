import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;

const ESTADOS_ERROR = ["ERROR", "VOIDED"];

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNestedValue(source: unknown, path: string): unknown {
  if (!source || !path) return undefined;

  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as JsonRecord)[key];
    }

    return undefined;
  }, source);
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function validarFirmaEventoWompi(payload: JsonRecord, eventsSecret: string) {
  const signature = payload.signature as { properties?: string[]; checksum?: string } | undefined;
  const properties = Array.isArray(signature?.properties) ? signature.properties : [];
  const checksumEsperado = signature?.checksum || "";
  const timestamp = payload.timestamp;

  if (!properties.length || !checksumEsperado || timestamp === undefined || timestamp === null) {
    console.error("Firma Wompi incompleta", {
      properties,
      tieneChecksum: Boolean(checksumEsperado),
      timestamp,
    });
    return false;
  }

  const valores = properties.map((property) => String(getNestedValue(payload.data, property) ?? ""));
  const stringToSign = valores.join("") + String(timestamp) + eventsSecret;
  const checksumCalculado = await sha256Hex(stringToSign);
  const valida = checksumCalculado === checksumEsperado;

  console.log("Firma Wompi validada", {
    properties,
    valores,
    timestamp,
    checksumCalculado,
    checksumEsperado,
    valida,
  });

  return valida;
}

function normalizarEstadoPago(status: string) {
  const statusUpper = status.trim().toUpperCase();

  if (statusUpper === "APPROVED") return "aprobado";
  if (statusUpper === "DECLINED") return "rechazado";
  if (ESTADOS_ERROR.includes(statusUpper)) return "error";

  return statusUpper.toLowerCase() || "pendiente";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo no permitido" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const eventsSecret = Deno.env.get("WOMPI_EVENTS_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !eventsSecret) {
    console.error("Webhook Wompi sin variables requeridas", {
      supabaseUrl: Boolean(supabaseUrl),
      serviceRoleKey: Boolean(serviceRoleKey),
      eventsSecret: Boolean(eventsSecret),
    });
    return jsonResponse({ ok: false, error: "Webhook no configurado" }, 503);
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch (error) {
    console.error("No se pudo leer JSON del webhook Wompi", error);
    return jsonResponse({ ok: false, error: "JSON invalido" }, 400);
  }

  if (!isRecord(payload)) {
    console.error("Payload Wompi no es objeto", payload);
    return jsonResponse({ ok: true, warning: "Payload ignorado" });
  }

  console.log("Evento Wompi recibido", {
    event: payload.event,
    environment: payload.environment,
    timestamp: payload.timestamp,
  });

  if (payload.event !== "transaction.updated") {
    console.log("Evento Wompi ignorado", payload.event);
    return jsonResponse({ ok: true, ignored: true });
  }

  const transaction = getNestedValue(payload, "data.transaction");

  if (!isRecord(transaction)) {
    console.error("Evento Wompi sin data.transaction", payload);
    return jsonResponse({ ok: true, warning: "Evento sin transaccion" });
  }

  const transactionId = String(transaction.id || "");
  const status = String(transaction.status || "").toUpperCase();
  const reference = String(transaction.reference || "");
  const amountInCents = Number(transaction.amount_in_cents || 0);
  const currency = String(transaction.currency || "").toUpperCase();
  const paymentMethodType = String(transaction.payment_method_type || "");

  console.log("Transaccion Wompi recibida", {
    transactionId,
    status,
    reference,
    amountInCents,
    currency,
    paymentMethodType,
  });

  const firmaValida = await validarFirmaEventoWompi(payload, eventsSecret);

  if (!firmaValida) {
    console.error("Firma Wompi invalida", { reference, signature: payload.signature });
    return jsonResponse({ ok: false, error: "Firma invalida" }, 401);
  }

  if (!reference) {
    console.error("Transaccion Wompi sin referencia", transaction);
    return jsonResponse({ ok: true, warning: "Referencia no recibida" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .select("id, anticipo, pago_monto, pago_moneda, pago_referencia")
    .eq("pago_referencia", reference)
    .maybeSingle();

  if (reservaError) {
    console.error("Error buscando reserva Wompi", { reference, reservaError });
    return jsonResponse({ ok: true, warning: "Error buscando reserva" });
  }

  if (!reserva) {
    console.error("Reserva no encontrada para referencia Wompi", { reference });
    return jsonResponse({ ok: true, warning: "Reserva no encontrada" });
  }

  console.log("Reserva encontrada", {
    reservaId: reserva.id,
    pagoReferencia: reserva.pago_referencia,
    pagoMonto: reserva.pago_monto,
    anticipo: reserva.anticipo,
    pagoMoneda: reserva.pago_moneda,
  });

  const montoEsperadoCentavos = Math.round(Number(reserva.pago_monto || reserva.anticipo || 0) * 100);
  const monedaEsperada = String(reserva.pago_moneda || "COP").toUpperCase();

  if (currency !== "COP" || currency !== monedaEsperada || amountInCents !== montoEsperadoCentavos) {
    console.error("Monto o moneda Wompi no coinciden", {
      reference,
      amountInCents,
      montoEsperadoCentavos,
      currency,
      monedaEsperada,
    });
    return jsonResponse({ ok: true, warning: "Monto o moneda no coinciden" });
  }

  const pagoEstado = normalizarEstadoPago(status);
  const updatePayload: JsonRecord = {
    pago_estado: pagoEstado,
    pago_transaccion_id: transactionId || null,
    pago_metodo: paymentMethodType || null,
    pago_evento_raw: payload,
    pago_error: pagoEstado === "aprobado" ? null : status || pagoEstado,
  };

  if (status === "APPROVED") {
    updatePayload.pago_estado = "aprobado";
    updatePayload.pago_confirmado = true;
    updatePayload.pago_confirmado_en = new Date().toISOString();
    updatePayload.pago_error = null;
    updatePayload.estado = "confirmada";
  } else if (status === "DECLINED") {
    updatePayload.pago_estado = "rechazado";
    updatePayload.pago_error = "Transaccion rechazada por Wompi";
  } else if (ESTADOS_ERROR.includes(status)) {
    updatePayload.pago_estado = "error";
    updatePayload.pago_error = "Transaccion no aprobada por Wompi";
  }

  const { error: updateError } = await supabase
    .from("reservas")
    .update(updatePayload)
    .eq("id", reserva.id);

  if (updateError) {
    console.error("No se pudo actualizar reserva con Wompi", { reference, updateError });
    return jsonResponse({ ok: false, error: "No se pudo actualizar la reserva" }, 500);
  }

  console.log("Reserva actualizada por Wompi", {
    reservaId: reserva.id,
    reference,
    status,
    pagoEstado: updatePayload.pago_estado,
  });

  return jsonResponse({ ok: true });
});