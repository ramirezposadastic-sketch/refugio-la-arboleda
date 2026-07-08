import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReservaLookup = {
  correo?: string;
  celular?: string;
  cabana?: string;
  fecha_ingreso?: string;
  fecha_salida?: string;
};

type CrearPagoRequest = {
  reserva_id?: number | string | null;
  reserva_lookup?: ReservaLookup;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizarEstado(estado = "") {
  return estado.toString().trim().toLowerCase();
}

function normalizarUrl(url: string) {
  return url.replace(/\/+$/, "");
}

async function sha256Hex(texto: string) {
  const data = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function crearCheckoutUrl(checkoutBaseUrl: string, params: Record<string, string | number>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    query.set(key, String(value));
  });

  return `${checkoutBaseUrl}?${query.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido." }, 405);
  }

  const wompiPublicKey = Deno.env.get("WOMPI_PUBLIC_KEY");
  const wompiIntegritySecret = Deno.env.get("WOMPI_INTEGRITY_SECRET");
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const checkoutBaseUrl = Deno.env.get("WOMPI_CHECKOUT_URL") || "https://checkout.wompi.co/p/";

  const variablesFaltantes = [
    ["WOMPI_PUBLIC_KEY", wompiPublicKey],
    ["WOMPI_INTEGRITY_SECRET", wompiIntegritySecret],
    ["PUBLIC_SITE_URL", publicSiteUrl],
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (variablesFaltantes.length > 0) {
    return jsonResponse(
      {
        error: "Wompi no esta configurado todavia.",
        variables_faltantes: variablesFaltantes,
      },
      503,
    );
  }

  const body = (await req.json().catch(() => ({}))) as CrearPagoRequest;
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("reservas")
    .select("*")
    .limit(1);

  if (body.reserva_id) {
    query = query.eq("id", body.reserva_id);
  } else if (body.reserva_lookup) {
    const lookup = body.reserva_lookup;

    if (!lookup.celular || !lookup.cabana || !lookup.fecha_ingreso || !lookup.fecha_salida) {
      return jsonResponse({ error: "reserva_id o reserva_lookup completo es obligatorio." }, 400);
    }

    query = query
      .eq("celular", lookup.celular)
      .eq("cabana", lookup.cabana)
      .eq("fecha_ingreso", lookup.fecha_ingreso)
      .eq("fecha_salida", lookup.fecha_salida)
      .order("created_at", { ascending: false });

    if (lookup.correo) query = query.eq("correo", lookup.correo);
  } else {
    return jsonResponse({ error: "reserva_id es obligatorio." }, 400);
  }

  const { data: reservas, error: reservaError } = await query;
  const reserva = reservas?.[0];

  if (reservaError || !reserva) {
    console.error("Reserva no encontrada para Wompi:", reservaError);
    return jsonResponse({ error: "Reserva no encontrada." }, 404);
  }

  const estadoReserva = normalizarEstado(reserva.estado);
  const estadoPago = normalizarEstado(reserva.pago_estado);
  const anticipo = Number(reserva.anticipo || 0);

  if (["cancelada", "eliminada"].includes(estadoReserva)) {
    return jsonResponse({ error: "No se puede pagar una reserva cancelada o eliminada." }, 400);
  }

  if (anticipo <= 0) {
    return jsonResponse({ error: "La reserva no tiene un anticipo valido." }, 400);
  }

  if (reserva.pago_confirmado || ["aprobado", "approved", "pagado"].includes(estadoPago)) {
    return jsonResponse({ error: "Esta reserva ya registra un pago aprobado." }, 409);
  }

  const referencia = `REFUGIO-${reserva.id}-${Date.now()}`;
  const moneda = "COP";
  const amountInCents = Math.round(anticipo * 100);
  const redirectUrl = `${normalizarUrl(publicSiteUrl!)}/reserva-pago?reserva_id=${encodeURIComponent(String(reserva.id))}&reference=${encodeURIComponent(referencia)}`;
  const integrity = await sha256Hex(`${referencia}${amountInCents}${moneda}${wompiIntegritySecret}`);
  const checkoutUrl = crearCheckoutUrl(checkoutBaseUrl, {
    "public-key": wompiPublicKey!,
    currency: moneda,
    "amount-in-cents": amountInCents,
    reference: referencia,
    "redirect-url": redirectUrl,
    "signature:integrity": integrity,
  });

  const { error: updateError } = await supabase
    .from("reservas")
    .update({
      pago_proveedor: "wompi",
      pago_estado: "link_generado",
      pago_referencia: referencia,
      pago_url: checkoutUrl,
      pago_monto: anticipo,
      pago_moneda: moneda,
      pago_creado_en: new Date().toISOString(),
      pago_error: null,
    })
    .eq("id", reserva.id);

  if (updateError) {
    console.error("No se pudo guardar el pago Wompi en reservas:", updateError);
    return jsonResponse(
      {
        error: "No se pudo preparar el pago. Ejecuta supabase/wompi-pagos.sql y revisa permisos.",
        detalle: updateError.message,
      },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    reserva_id: reserva.id,
    checkout: {
      provider: "wompi",
      publicKey: wompiPublicKey,
      currency: moneda,
      amountInCents,
      amount_in_cents: amountInCents,
      reference: referencia,
      redirectUrl,
      redirect_url: redirectUrl,
      integrity,
      checkoutUrl,
    },
  });
});