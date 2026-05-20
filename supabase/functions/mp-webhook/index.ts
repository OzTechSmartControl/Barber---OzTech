import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") ?? "";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")    ?? "";
const SUPABASE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MP: Record<string, string> = {
  Authorization:  `Bearer ${MP_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};

const DB: Record<string, string> = {
  apikey:         SUPABASE_KEY,
  Authorization:  `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer:         "return=minimal",
};

function expiresAtForPlan(planId: string): string {
  const d = new Date();
  if      (planId === "annual")    d.setFullYear(d.getFullYear() + 1);
  else if (planId === "semestral") d.setMonth(d.getMonth() + 6);
  else                             d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function parsePlanId(externalRef: string): string {
  return externalRef.split(":")[0] ?? "monthly";
}

/**
 * Atualiza o checkout pendente para 'paid' usando o external_reference.
 * O e-mail correto já está gravado desde a criação da preferência.
 * Fallback: se não encontrar registro pendente, insere um novo.
 */
async function markCheckoutPaid(params: {
  externalRef:  string;
  mpPaymentId:  string;
  mpPayerEmail: string;
  amount:       number;
  paidAt:       string;
  mpSubId?:     string;
}) {
  // Tenta atualizar registro pendente existente
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/payment_checkouts?mp_external_reference=eq.${encodeURIComponent(params.externalRef)}&status=eq.pending`,
    {
      method:  "PATCH",
      headers: { ...DB, Prefer: "return=representation" },
      body: JSON.stringify({
        status:             "paid",
        mp_payment_id:      params.mpPaymentId,
        mp_payer_email:     params.mpPayerEmail,
        mp_subscription_id: params.mpSubId ?? null,
        paid_at:            params.paidAt,
        updated_at:         new Date().toISOString(),
        metadata:           { source: "mp_webhook" },
      }),
    }
  );

  const updated = await patchRes.json().catch(() => []);

  // Fallback: se não havia registro pendente, insere
  if (!Array.isArray(updated) || updated.length === 0) {
    const planId = parsePlanId(params.externalRef);
    // Busca email pelo external_reference (qualquer status)
    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/payment_checkouts?mp_external_reference=eq.${encodeURIComponent(params.externalRef)}&select=email&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await findRes.json().catch(() => []);
    const email = (Array.isArray(rows) && rows[0]?.email) ? rows[0].email : params.mpPayerEmail;

    await fetch(`${SUPABASE_URL}/rest/v1/payment_checkouts`, {
      method:  "POST",
      headers: DB,
      body: JSON.stringify({
        email:                 email.toLowerCase().trim(),
        status:                "paid",
        plan:                  planId,
        amount:                params.amount,
        mp_payment_id:         params.mpPaymentId,
        mp_payer_email:        params.mpPayerEmail,
        mp_external_reference: params.externalRef,
        mp_subscription_id:    params.mpSubId ?? null,
        paid_at:               params.paidAt,
        redeemed_at:           null,
        user_id:               null,
        barbershop_id:         null,
        metadata:              { source: "mp_webhook_fallback" },
        created_at:            new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      }),
    });
  }
}

async function callRenewSubscription(mpSubscriptionId: string, mpPaymentId: string, newExpiresAt: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/renew_subscription`, {
    method:  "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_mp_subscription_id: mpSubscriptionId,
      p_mp_payment_id:      mpPaymentId,
      p_new_expires_at:     newExpiresAt,
    }),
  });
}

async function callCancelSubscription(externalRef?: string, mpSubId?: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/cancel_subscription`, {
    method:  "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_external_reference:  externalRef ?? null,
      p_mp_subscription_id:  mpSubId     ?? null,
    }),
  });
}

serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { type, data } = body as {
    type?: string;
    data?: { id?: string | number };
  };

  try {
    if (type === "payment" && data?.id) {
      const payRes  = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, { headers: MP });
      const payment = await payRes.json();

      const email       = (payment.payer?.email ?? "") as string;
      const externalRef = (payment.external_reference ?? "") as string;
      const amount      = (payment.transaction_amount ?? 0) as number;
      const paidAt      = (payment.date_approved ?? new Date().toISOString()) as string;
      const mpPayId     = String(data.id);

      if (payment.status === "approved") {
        if (externalRef) {
          await markCheckoutPaid({
            externalRef, mpPaymentId: mpPayId,
            mpPayerEmail: email, amount, paidAt,
          });
        } else {
          // Renovação automática mensal
          const preapprovalId =
            (payment.metadata?.preapproval_id ?? payment.preapproval_id ?? "") as string;
          if (preapprovalId) {
            await callRenewSubscription(preapprovalId, mpPayId, expiresAtForPlan("monthly"));
          }
        }
      }

      if (["refunded", "cancelled", "charged_back"].includes(payment.status ?? "")) {
        if (externalRef) await callCancelSubscription(externalRef);
      }
    }

    if (type === "preapproval" && data?.id) {
      const subRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, { headers: MP });
      const mpSub  = await subRes.json();

      const email       = (mpSub.payer_email ?? mpSub.payer?.email ?? "") as string;
      const externalRef = (mpSub.external_reference ?? "") as string;
      const mpSubId     = String(data.id);
      const amount      = (mpSub.auto_recurring?.transaction_amount ?? 0) as number;
      const paidAt      = new Date().toISOString();

      if (["authorized", "active"].includes(mpSub.status ?? "")) {
        if (externalRef) {
          await markCheckoutPaid({
            externalRef, mpPaymentId: mpSubId,
            mpPayerEmail: email, amount, paidAt, mpSubId,
          });
          // Garante mp_subscription_id no registro
          await fetch(
            `${SUPABASE_URL}/rest/v1/payment_checkouts?mp_external_reference=eq.${encodeURIComponent(externalRef)}`,
            {
              method:  "PATCH",
              headers: DB,
              body: JSON.stringify({ mp_subscription_id: mpSubId, updated_at: new Date().toISOString() }),
            }
          );
        }
      }

      if (["cancelled", "paused"].includes(mpSub.status ?? "")) {
        await callCancelSubscription(undefined, mpSubId);
      }
    }

  } catch (err) {
    console.error("[mp-webhook]", err instanceof Error ? err.message : err);
  }

  return new Response("OK", { status: 200 });
});
