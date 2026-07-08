import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;
type SupabaseClientLike = ReturnType<typeof createClient>;

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

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as JsonRecord)[key];
    }

    return undefined;
  }, obj);
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function validarFirmaWompi(payload: JsonRecord, secret: string) {
  const signature = payload.signature as { properties?: string[]; checksum?: string } | undefined;
  const properties = Array.isArray(signature?.properties) ? signature.properties : [];
  const expected = signature?.checksum || "";
  const timestamp = payload.timestamp;

  if (!properties.length || !expected || timestamp === undefined || timestamp === null) {
    console.error("Firma Wompi incompleta", { properties, expected: Boolean(expected), timestamp });
    return false;
  }

  const values = properties.map((property) => String(getNestedValue(payload.data, property) ?? ""));
  const stringToSign = values.join("") + String(timestamp) + secret;
  const checksum = await sha256(stringToSign);
  const valid = checksum === expected;

  console.log("Validacion de firma Wompi", {
    properties,
    values,
    timestamp,
    checksum,
    expected,
    valid,
  });

  return valid;
}

function normalizarEstadoWompi(status: string) {
  const statusUpper = status.trim().toUpperCase();

  if (statusUpper === "APPROVED") return "aprobado";
  if (statusUpper === "DECLINED") return "rechazado";
  if (ESTADOS_ERROR.includes(statusUpper)) return "error";

  return statusUpper.toLowerCase() || "pendiente";
}

function esErrorColumnaInexistente(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42703" || message.includes("column") || message.includes("schema cache");
}

async function actualizarReserva(
  supabase: SupabaseClientLike,
  reservaId: string | number,
  payloadPreferido: JsonRecord,
  payloadFallback: JsonRecord,
) {
  let { error } = await supabase.from("reservas").update(payloadPreferido).eq("id", reservaId);

  if (!error) return { error: null, modo: "preferido" };

  console.error("No se pudo actualizar con columnas preferidas Wompi", error);

  if (!esErrorColumnaInexistente(error)) return { error, modo: "preferido" };

  ({ error } = await supabase.from("reservas").update(payloadFallback).eq("id", reservaId));

  if (!error) return { error: null, modo: "fallback" };

  console.error("No se pudo actualizar con columnas fallback Wompi", error);

  if (!esErrorColumnaInexistente(error) || !("pago_confirmado" in payloadFallback)) {
    return { error, modo: "fallback" };
  }

  const { pago_confirmado: _pagoConfirmado, ...sinPagoConfirmado } = payloadFallback;
  ({ error } = await supabase.from("reservas").update(sinPagoConfirmado).eq("id", reservaId));

  return { error, modo: "sin_pago_confirmado" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const eventsSecret = Deno.env.get("WOMPI_EVENTS_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !eventsSecret) {
    console.error("Webhook Wompi sin variables completas", {
      supabaseUrl: Boolean(supabaseUrl),
      serviceRoleKey: Boolean(serviceRoleKey),
      eventsSecret: Boolean(eventsSecret),
    });
    return jsonResponse({ ok: false, error: "Webhook no configurado." }, 503);
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch (error) {
    console.error("No se pudo leer JSON del webhook Wompi", error);
    return jsonResponse({ ok: false, error: "JSON invalido." }, 400);
  }

  if (!isRecord(payload)) {
    console.error("Payload Wompi recibido no es objeto", payload);
    return jsonResponse({ ok: true, warning: "Payload ignorado porque no es objeto." });
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
    console.error("Evento transaction.updated sin data.transaction", payload);
    return jsonResponse({ ok: true, warning: "Evento sin transaccion." });
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

  const firmaValida = await validarFirmaWompi(payload, eventsSecret);

  if (!firmaValida) {
    console.error("Firma Wompi invalida", { reference, signature: payload.signature });
    return jsonResponse({ ok: false, error: "Firma invalida." }, 401);
  }

  if (!reference) {
    console.error("Transaccion Wompi sin referencia", transaction);
    return jsonResponse({ ok: true, warning: "Referencia no recibida." });
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
    return jsonResponse({ ok: true, warning: "Error buscando reserva." });
  }

  if (!reserva) {
    console.error("Reserva no encontrada para Wompi", { reference });
    return jsonResponse({ ok: true, warning: "Reserva no encontrada" });
  }

  console.log("Reserva encontrada para Wompi", {
    reservaId: reserva.id,
    pagoReferencia: reserva.pago_referencia,
    pagoMonto: reserva.pago_monto,
    anticipo: reserva.anticipo,
    pagoMoneda: reserva.pago_moneda,
  });

  const expectedAmountInCents = Math.round(Number(reserva.pago_monto || reserva.anticipo || 0) * 100);
  const expectedCurrency = String(reserva.pago_moneda || "COP").toUpperCase();

  if (currency !== "COP" || currency !== expectedCurrency || amountInCents !== expectedAmountInCents) {
    console.error("Monto o moneda Wompi no coinciden", {
      reference,
      amountInCents,
      expectedAmountInCents,
      currency,
      expectedCurrency,
    });
    return jsonResponse({ ok: true, warning: "Monto o moneda no coinciden." });
  }

  const pagoEstado = normalizarEstadoWompi(status);
  const preferredUpdate: JsonRecord = {
    pago_proveedor: "wompi",
    pago_estado: pagoEstado,
    pago_transaccion_id: transactionId || null,
    pago_metodo: paymentMethodType || null,
    pago_evento_raw: payload,
    pago_error: pagoEstado === "aprobado" ? null : status || pagoEstado,
  };
  const fallbackUpdate: JsonRecord = {
    pago_proveedor: "wompi",
    pago_estado: pagoEstado,
    pago_transaction_id: transactionId || null,
    pago_metodo: paymentMethodType || null,
    pago_raw: payload,
    pago_error: pagoEstado === "aprobado" ? null : status || pagoEstado,
  };

  if (status === "APPROVED") {
    const confirmedAt = new Date().toISOString();
    preferredUpdate.pago_estado = "aprobado";
    preferredUpdate.pago_confirmado = true;
    preferredUpdate.pago_confirmado_en = confirmedAt;
    preferredUpdate.estado = "confirmada";
    preferredUpdate.pago_error = null;

    fallbackUpdate.pago_estado = "aprobado";
    fallbackUpdate.pago_confirmado = true;
    fallbackUpdate.pago_confirmado_en = confirmedAt;
    fallbackUpdate.estado = "confirmada";
    fallbackUpdate.pago_error = null;
  } else if (status === "DECLINED") {
    preferredUpdate.pago_estado = "rechazado";
    preferredUpdate.pago_error = "Transaccion rechazada por Wompi";
    fallbackUpdate.pago_estado = "rechazado";
    fallbackUpdate.pago_error = "Transaccion rechazada por Wompi";
  } else if (ESTADOS_ERROR.includes(status)) {
    preferredUpdate.pago_estado = "error";
    preferredUpdate.pago_error = "Transaccion no aprobada por Wompi";
    fallbackUpdate.pago_estado = "error";
    fallbackUpdate.pago_error = "Transaccion no aprobada por Wompi";
  }

  const updateResult = await actualizarReserva(supabase, reserva.id as string | number, preferredUpdate, fallbackUpdate);

  if (updateResult.error) {
    console.error("No se pudo actualizar la reserva desde Wompi", updateResult.error);
    return jsonResponse({ ok: false, error: "No se pudo actualizar la reserva." }, 500);
  }

  console.log("Actualizacion Wompi hecha", {
    reservaId: reserva.id,
    reference,
    status,
    pagoEstado: preferredUpdate.pago_estado,
    modo: updateResult.modo,
  });

  return jsonResponse({ ok: true });
});