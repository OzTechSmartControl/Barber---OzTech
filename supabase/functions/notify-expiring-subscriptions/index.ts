import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL   = "contato@oztechsmartcontrol.com.br";
const APP_URL      = "https://ozbarber.vercel.app";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = (path: string, opts: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer:         "return=representation",
      ...(opts.headers ?? {}),
    },
  });

function planLabel(plan: string): string {
  if (plan === "annual")    return "Anual";
  if (plan === "semestral") return "Semestral";
  return "Mensal";
}

function fDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

async function sendExpiryEmail(opts: {
  to:              string;
  barbershop_name: string;
  logo_url:        string | null;
  accent_color:    string;
  plan:            string;
  expires_at:      string;
  days_left:       number;
}) {
  const color       = opts.accent_color || "#4db8ff";
  const isUrgent    = opts.days_left <= 3;
  const alertColor  = isUrgent ? "#ef4444" : "#f59e0b";
  const emoji       = isUrgent ? "🚨" : "⚠️";

  const logoHtml = (opts.logo_url && opts.logo_url !== "null" && opts.logo_url !== "")
    ? `<img src="${opts.logo_url}" alt="${opts.barbershop_name}" style="max-height:56px;max-width:140px;width:auto;height:auto;border-radius:10px;display:block;margin:0 auto 10px;" />`
    : `<div style="width:52px;height:52px;border-radius:14px;background:${color}22;border:2px solid ${color}44;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:24px;font-weight:900;color:${color};font-family:'Segoe UI',Arial,sans-serif;">${(opts.barbershop_name || "O")[0].toUpperCase()}</div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#08090c;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;margin-bottom:24px;">
      ${logoHtml}
      <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:2px;text-transform:uppercase;">${opts.barbershop_name}</div>
      <div style="font-size:11px;color:#4b5563;margin-top:3px;">Oz.Barber · Gestão de Barbearias</div>
    </div>

    <div style="background:#13141a;border:1px solid #1e2030;border-radius:18px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,${alertColor},${alertColor}aa);height:5px;"></div>
      <div style="padding:32px 28px;">

        <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:6px;">
          ${emoji} Seu plano vence em ${opts.days_left} ${opts.days_left === 1 ? "dia" : "dias"}!
        </div>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;line-height:1.6;">
          O plano <strong style="color:#e5e7eb;">${planLabel(opts.plan)}</strong> da
          <strong style="color:${color};">${opts.barbershop_name}</strong> expira em
          <strong style="color:${alertColor};">${fDate(opts.expires_at)}</strong>.
          Renove agora para não perder o acesso ao sistema.
        </p>

        <div style="background:#0d0e14;border:1px solid ${alertColor}44;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span style="font-size:20px;line-height:1;">📋</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:2px;">Plano atual</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;">${planLabel(opts.plan)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:20px;line-height:1;">📅</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:2px;">Vence em</div>
              <div style="font-size:15px;color:${alertColor};font-weight:700;">${fDate(opts.expires_at)}</div>
            </div>
          </div>
        </div>

        <div style="text-align:center;">
          <a href="${APP_URL}?view=meuPlano"
             style="display:inline-block;background:${color};color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
            Renovar Agora
          </a>
          <p style="color:#6b7280;font-size:12px;margin:12px 0 0;line-height:1.6;">
            Após o vencimento, o acesso ao painel será bloqueado automaticamente.
          </p>
        </div>

      </div>
      <div style="padding:14px 28px;border-top:1px solid #1e2030;text-align:center;">
        <p style="color:#374151;font-size:11px;margin:0;">
          Enviado automaticamente por <strong style="color:${color};">Oz.Barber</strong>
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    `Oz.Barber <${FROM_EMAIL}>`,
      to:      [opts.to],
      subject: `${emoji} Seu plano vence em ${opts.days_left} ${opts.days_left === 1 ? "dia" : "dias"} — ${opts.barbershop_name}`,
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Erro Resend");
  return data.id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const now = new Date();

    // Datas-alvo: hoje + 7 e hoje + 3 (UTC)
    const d7 = new Date(now); d7.setUTCDate(now.getUTCDate() + 7);
    const d3 = new Date(now); d3.setUTCDate(now.getUTCDate() + 3);

    const date7 = d7.toISOString().split("T")[0];
    const date3 = d3.toISOString().split("T")[0];

    let totalSent = 0;
    const errors: string[] = [];

    for (const { daysLeft, targetDate } of [
      { daysLeft: 7, targetDate: date7 },
      { daysLeft: 3, targetDate: date3 },
    ]) {
      const shopsRes = await db(
        `barbershops?plan_expires_at=gte.${targetDate}T00:00:00&plan_expires_at=lte.${targetDate}T23:59:59&select=id,name,plan,plan_expires_at,accent_color,logo_url`
      );
      const shops = await shopsRes.json();
      if (!Array.isArray(shops) || shops.length === 0) continue;

      for (const shop of shops) {
        // Busca id do perfil admin da barbearia
        const profRes   = await db(
          `profiles?barbershop_id=eq.${shop.id}&role=eq.admin&select=id&limit=1`
        );
        const profs     = await profRes.json();
        const profileId = Array.isArray(profs) && profs[0]?.id ? profs[0].id : null;

        if (!profileId) {
          console.warn(`[notify-expiring] Sem perfil admin para shop ${shop.id} (${shop.name})`);
          continue;
        }

        // Busca e-mail via Auth Admin API (profiles não tem coluna email)
        const authRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${profileId}`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        const authUser   = await authRes.json();
        const adminEmail = authUser?.email ?? null;

        if (!adminEmail) {
          console.warn(`[notify-expiring] Sem e-mail para perfil ${profileId} (${shop.name})`);
          continue;
        }

        try {
          const msgId = await sendExpiryEmail({
            to:              adminEmail,
            barbershop_name: shop.name,
            logo_url:        shop.logo_url     || null,
            accent_color:    shop.accent_color || "#4db8ff",
            plan:            shop.plan         || "monthly",
            expires_at:      shop.plan_expires_at,
            days_left:       daysLeft,
          });
          console.log(`[notify-expiring] ✓ ${adminEmail} | ${shop.name} | ${daysLeft}d | id: ${msgId}`);
          totalSent++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[notify-expiring] ✗ ${adminEmail} | ${shop.name}:`, msg);
          errors.push(`${shop.name}: ${msg}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent: totalSent, errors }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    console.error("[notify-expiring]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
