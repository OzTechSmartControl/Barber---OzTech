import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MP_ACCESS_TOKEN  = Deno.env.get("MP_ACCESS_TOKEN")  ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")     ?? "";
const SUPABASE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_URL      = `${SUPABASE_URL}/functions/v1/mp-webhook`;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Grava um checkout pendente com o e-mail do cliente antes do pagamento.
 *  O webhook depois atualiza para 'paid' usando o external_reference.
 */
async function insertPendingCheckout(params: {
  email:       string;
  plan:        string;
  amount:      number;
  externalRef: string;
}) {
  await fetch(`${SUPABASE_URL}/rest/v1/payment_checkouts`, {
    method:  "POST",
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer:         "return=minimal",
    },
    body: JSON.stringify({
      email:                 params.email,
      status:                "pending",
      plan:                  params.plan,
      amount:                params.amount,
      mp_external_reference: params.externalRef,
      metadata:              { source: "mp_preference_created" },
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    if (!MP_ACCESS_TOKEN)
      throw new Error("MP_ACCESS_TOKEN não configurado.");

    const body = await req.json().catch(() => ({}));
    const { plan_id, plan_label, price, payer_email, success_url, failure_url, pending_url, payment_type } = body;

    if (!plan_id || !price)
      throw new Error("plan_id e price são obrigatórios.");

    if (!payer_email)
      throw new Error("payer_email é obrigatório.");

    const email        = String(payer_email).toLowerCase().trim();
    const uuid         = crypto.randomUUID();
    const externalRef  = `${plan_id}:${uuid}`;
    const origin       = req.headers.get("origin") ?? "";

    const successUrl = success_url ?? `${origin}/?payment=success&plan=${plan_id}`;
    const failureUrl = failure_url ?? `${origin}/?payment=failure&plan=${plan_id}`;
    const pendingUrl = pending_url ?? `${origin}/?payment=pending&plan=${plan_id}`;

    // Usa assinatura recorrente apenas para plano mensal com cartão
    const useSubscription = plan_id === "monthly" && payment_type !== "pix";

    let checkoutUrl: string;

    if (useSubscription) {
      const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
        method:  "POST",
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          reason:           plan_label ?? "Oz.Barber — Plano Mensal",
          payer_email:      email,
          notification_url: WEBHOOK_URL,
          auto_recurring: {
            frequency:          1,
            frequency_type:     "months",
            transaction_amount: price,
            currency_id:        "BRL",
          },
          back_url:           successUrl,
          external_reference: externalRef,
          status:             "pending",
        }),
      });

      const preapproval = await mpRes.json();
      console.error("[preapproval] status:", mpRes.status, "body:", JSON.stringify(preapproval));
      if (!preapproval.init_point)
        throw new Error(preapproval.message ?? JSON.stringify(preapproval.cause ?? preapproval) ?? "Mercado Pago não retornou a URL de assinatura mensal.");

      checkoutUrl = preapproval.init_point;

    } else {
      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method:  "POST",
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            title:       plan_label ?? "Oz.Barber",
            quantity:    1,
            unit_price:  price,
            currency_id: "BRL",
          }],
          back_urls: {
            success: successUrl,
            failure: failureUrl,
            pending: pendingUrl,
          },
          auto_return:        "approved",
          notification_url:   WEBHOOK_URL,
          external_reference: externalRef,
        }),
      });

      const pref = await mpRes.json();
      if (!pref.init_point)
        throw new Error(pref.message ?? "Mercado Pago não retornou a URL de pagamento.");

      checkoutUrl = pref.init_point;
    }

    // Grava o e-mail do cliente ANTES do pagamento para que o webhook
    // encontre o registro correto ao confirmar o pagamento.
    await insertPendingCheckout({ email, plan: plan_id, amount: Number(price), externalRef });

    return jsonResponse({ init_point: checkoutUrl, external_reference: externalRef });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[create-mp-preference]", message);
    return jsonResponse({ error: message }, 500);
  }
});
