import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Esta Edge Function processa os cliques nos botões do e-mail de lembrete.
// Aceita GET com ?token=<uuid>&action=confirm|cancel
// Retorna uma página HTML com o resultado da ação.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY")            ?? "";
const FROM_EMAIL   = "contato@oztechsmartcontrol.com.br";

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

function fDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Página HTML de resposta (sem React — retornada direto pelo Edge Function)
function htmlPage(opts: {
  title:   string;
  emoji:   string;
  message: string;
  color:   string;
  sub?:    string;
}): Response {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#08090c;font-family:'DM Sans',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
  </style>
</head>
<body>
  <div style="max-width:420px;width:100%;text-align:center;">
    <div style="width:80px;height:80px;border-radius:50%;background:${opts.color}22;border:2px solid ${opts.color}55;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 1.5rem;">
      ${opts.emoji}
    </div>
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin-bottom:12px;">${opts.title}</h1>
    <p style="color:#9ca3af;font-size:15px;line-height:1.7;">${opts.message}</p>
    ${opts.sub ? `<p style="color:#6b7280;font-size:13px;line-height:1.6;margin-top:8px;">${opts.sub}</p>` : ""}
    <div style="margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid #1e2030;">
      <span style="color:#374151;font-size:12px;">Oz.Barber · <strong style="color:${opts.color};">OzTech SmartControl</strong></span>
    </div>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// E-mail de cancelamento enviado ao barbeiro
async function notifyBarberCancellation(opts: {
  barber_email:    string;
  barbershop_name: string;
  barbershop_logo: string | null;
  accent_color:    string;
  client_name:     string;
  services:        string;
  scheduled_date:  string;
  scheduled_time:  string;
}): Promise<void> {
  if (!RESEND_KEY || !opts.barber_email) return;

  const color    = opts.accent_color || "#4db8ff";
  const logoHtml = opts.barbershop_logo && opts.barbershop_logo !== "null"
    ? `<img src="${opts.barbershop_logo}" alt="${opts.barbershop_name}" style="max-height:48px;width:auto;display:block;margin:0 auto 12px;border-radius:8px;" />`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#08090c;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
    ${logoHtml}
    <div style="background:#13141a;border:1px solid #1e2030;border-radius:18px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#ef4444,#ef444488);height:5px;"></div>
      <div style="padding:28px 28px;">
        <div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:8px;">❌ Agendamento Cancelado</div>
        <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 20px;">
          O cliente <strong style="color:#e5e7eb;">${opts.client_name}</strong> cancelou o agendamento.<br>
          O horário de <strong style="color:#ef4444;">${opts.scheduled_time.slice(0,5)} do dia ${fDate(opts.scheduled_date)}</strong> está disponível novamente.
        </p>
        <div style="background:#0d0e14;border:1px solid #2a2b38;border-radius:10px;padding:14px 16px;">
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px;">Serviço cancelado</div>
          <div style="font-size:14px;color:#e5e7eb;font-weight:600;">${opts.services}</div>
        </div>
      </div>
      <div style="padding:12px 28px;border-top:1px solid #1e2030;text-align:center;">
        <p style="color:#374151;font-size:11px;margin:0;">Oz.Barber · <strong style="color:${color};">OzTech SmartControl</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    `${opts.barbershop_name} <${FROM_EMAIL}>`,
        to:      [opts.barber_email],
        subject: `❌ Cancelamento: ${opts.client_name} — ${fDate(opts.scheduled_date)} ${opts.scheduled_time.slice(0,5)}`,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? "Erro Resend");
    console.log(`[appointment-action] Barbeiro notificado: ${opts.barber_email}`);
  } catch (e) {
    console.error("[appointment-action] Erro ao notificar barbeiro:", e);
  }
}

serve(async (req) => {
  // OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" },
    });
  }

  const url    = new URL(req.url);
  const token  = url.searchParams.get("token")?.trim();
  const action = url.searchParams.get("action")?.trim(); // "confirm" | "cancel"

  if (!token || (action !== "confirm" && action !== "cancel")) {
    return htmlPage({ title: "Link Inválido", emoji: "⚠️", message: "Este link não é válido ou já expirou.", color: "#f59e0b" });
  }

  // Busca agendamento pelo action_token
  const apptRes  = await db(`appointments?action_token=eq.${token}&select=*&limit=1`);
  const apptData = await apptRes.json();
  const appt     = Array.isArray(apptData) ? apptData[0] : null;

  if (!appt) {
    return htmlPage({ title: "Não encontrado", emoji: "🔍", message: "Agendamento não encontrado ou link expirado.", color: "#6b7280" });
  }

  // Dados da barbearia (para exibir na página e no e-mail)
  const shopRes  = await db(`barbershops?id=eq.${appt.barbershop_id}&select=name,logo_url,accent_color&limit=1`);
  const shop     = (await shopRes.json())[0] ?? { name: "Barbearia", logo_url: null, accent_color: "#4db8ff" };
  const color    = shop.accent_color || "#4db8ff";
  const timeStr  = (appt.scheduled_time || "").slice(0, 5);
  const dateStr  = fDate(appt.scheduled_date);

  // ── Ação já processada ─────────────────────────────────────────
  if (appt.status === "confirmed" && action === "confirm") {
    return htmlPage({
      title:   "Já confirmado!",
      emoji:   "✅",
      message: "Este agendamento já havia sido confirmado.",
      color,
      sub:     `${dateStr} às ${timeStr} · ${shop.name}`,
    });
  }

  if (appt.status === "cancelled") {
    return htmlPage({
      title:   "Agendamento cancelado",
      emoji:   "❌",
      message: "Este agendamento já havia sido cancelado.",
      color:   "#ef4444",
    });
  }

  if (appt.status === "completed") {
    return htmlPage({
      title:   "Atendimento concluído",
      emoji:   "✂️",
      message: "Este atendimento já foi realizado.",
      color,
    });
  }

  // ── Confirmar ──────────────────────────────────────────────────
  if (action === "confirm") {
    await db(`appointments?id=eq.${appt.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "confirmed", updated_at: new Date().toISOString() }),
    });
    console.log(`[appointment-action] Confirmado: ${appt.id}`);

    return htmlPage({
      title:   "Presença confirmada! 🎉",
      emoji:   "✅",
      message: `Tudo certo, <strong style="color:#fff;">${appt.client_name || "cliente"}</strong>! Seu agendamento está confirmado. Até lá!`,
      color,
      sub:     `${dateStr} às ${timeStr} · ${shop.name}`,
    });
  }

  // ── Cancelar ───────────────────────────────────────────────────
  await db(`appointments?id=eq.${appt.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled", updated_at: new Date().toISOString() }),
  });
  console.log(`[appointment-action] Cancelado: ${appt.id}`);

  // Notifica barbeiro por e-mail (se tiver notification_email)
  const barberRes  = await db(`barbers?id=eq.${appt.barber_id}&select=name,notification_email&limit=1`);
  const barber     = (await barberRes.json())[0];

  if (barber?.notification_email) {
    const serviceIds: number[] = Array.isArray(appt.service_ids) && appt.service_ids.length > 0
      ? appt.service_ids
      : appt.service_id ? [appt.service_id] : [];

    let serviceNames = "Serviço";
    if (serviceIds.length > 0) {
      const svcsRes  = await db(`services?id=in.(${serviceIds.join(",")})&select=name`);
      const svcsData = await svcsRes.json();
      if (Array.isArray(svcsData) && svcsData.length > 0) {
        serviceNames = svcsData.map((s: { name: string }) => s.name).join(" + ");
      }
    }

    await notifyBarberCancellation({
      barber_email:    barber.notification_email,
      barbershop_name: shop.name,
      barbershop_logo: shop.logo_url,
      accent_color:    shop.accent_color,
      client_name:     appt.client_name || "Cliente",
      services:        serviceNames,
      scheduled_date:  appt.scheduled_date,
      scheduled_time:  appt.scheduled_time,
    });
  }

  return htmlPage({
    title:   "Agendamento cancelado",
    emoji:   "❌",
    message: "Seu agendamento foi cancelado. O horário está livre novamente.",
    color:   "#ef4444",
    sub:     `Se quiser remarcar, acesse o link de agendamento da ${shop.name}.`,
  });
});
