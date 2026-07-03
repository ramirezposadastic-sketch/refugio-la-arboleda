// Plantilla segura para futura integracion Bold.
// No contiene llaves reales y no realiza llamadas falsas a Bold.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CrearPagoRequest = {
  reserva_id?: number | string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido." }, 405);
  }

  const boldApiKey = Deno.env.get("BOLD_API_KEY");
  const boldSecretKey = Deno.env.get("BOLD_SECRET_KEY");
  const boldEnvironment = Deno.env.get("BOLD_ENVIRONMENT");
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const variablesFaltantes = [
    ["BOLD_API_KEY", boldApiKey],
    ["BOLD_SECRET_KEY", boldSecretKey],
    ["BOLD_ENVIRONMENT", boldEnvironment],
    ["PUBLIC_SITE_URL", publicSiteUrl],
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (variablesFaltantes.length > 0) {
    return jsonResponse(
      {
        error: "Bold no esta configurado todavia.",
        variables_faltantes: variablesFaltantes,
      },
      503,
    );
  }

  const body = (await req.json().catch(() => ({}))) as CrearPagoRequest;
  const reservaId = body.reserva_id;

  if (!reservaId) {
    return jsonResponse({ error: "reserva_id es obligatorio." }, 400);
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
  });

  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .select("id, nombre, correo, celular, anticipo, total, estado")
    .eq("id", reservaId)
    .single();

  if (reservaError || !reserva) {
    return jsonResponse({ error: "Reserva no encontrada." }, 404);
  }

  const anticipo = Number(reserva.anticipo || 0);

  if (anticipo <= 0) {
    return jsonResponse({ error: "La reserva no tiene un anticipo valido." }, 400);
  }

  const referencia = `REFUGIO-${reserva.id}-${Date.now()}`;

  const payloadBoldPreparado = {
    amount: anticipo,
    currency: "COP",
    reference: referencia,
    description: `Anticipo reserva Refugio La Arboleda #${reserva.id}`,
    customer: {
      name: reserva.nombre,
      email: reserva.correo,
      phone: reserva.celular,
    },
    redirect_url: `${publicSiteUrl}/reservas`,
  };

  // TODO: Confirmar con Bold el endpoint, autenticacion y payload final.
  // TODO: Llamar API Bold solo cuando existan credenciales reales y ambiente de pruebas.
  // TODO: Guardar pago_url, pago_referencia, pago_monto y pago_estado = 'link_generado'.
  // TODO: Retornar payment_url real de Bold.

  return jsonResponse(
    {
      error: "Bold no esta activo todavia. Payload preparado, pero no enviado.",
      referencia,
      monto: anticipo,
      modo: "plantilla",
      payload_preparado: payloadBoldPreparado,
    },
    503,
  );
});
