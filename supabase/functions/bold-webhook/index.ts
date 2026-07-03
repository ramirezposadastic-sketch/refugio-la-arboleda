// Plantilla futura para webhook de Bold.
// No activa pagos sin validar firma, secreto y formato real del evento.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bold-signature",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const boldSecretKey = Deno.env.get("BOLD_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey || !boldSecretKey) {
    return jsonResponse({ error: "Bold no esta configurado todavia." }, 503);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-bold-signature");

  // TODO: Validar firma real de Bold usando BOLD_SECRET_KEY antes de confiar en el evento.
  // Si la firma no es valida, retornar 401 y no actualizar ninguna reserva.
  if (!signature) {
    return jsonResponse({ error: "Firma de Bold ausente. Webhook no procesado." }, 401);
  }

  const event = JSON.parse(rawBody || "{}");

  // TODO: Confirmar nombres reales de campos en el evento de Bold.
  const referencia = event?.reference || event?.data?.reference || event?.payment?.reference;
  const estadoBold = event?.status || event?.data?.status || event?.payment?.status;

  if (!referencia) {
    return jsonResponse({ error: "Referencia de pago ausente." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // TODO: Mapear estados reales de Bold.
  // aprobado -> pagado
  // rechazado -> rechazado
  // vencido -> vencido
  // cancelado -> cancelado
  const pagoEstadoPreparado = String(estadoBold || "pendiente").toLowerCase();

  // Esta actualizacion queda intencionalmente comentada hasta validar firma y payload real:
  // await supabase
  //   .from("reservas")
  //   .update({
  //     pago_estado: pagoEstadoPreparado,
  //     pago_confirmado_en: pagoEstadoPreparado === "pagado" ? new Date().toISOString() : null,
  //   })
  //   .eq("pago_referencia", referencia);

  await supabase
    .from("reservas")
    .select("id")
    .eq("pago_referencia", referencia)
    .maybeSingle();

  return jsonResponse({
    recibido: true,
    procesado: false,
    motivo: "Plantilla pendiente de validar firma y formato real de Bold.",
    referencia,
    estado_detectado: pagoEstadoPreparado,
  });
});
