// Edge Function: appointment-action
// Processa confirm/cancel dos botões do e-mail de lembrete.
// Após processar, redireciona para o app React com ?booking=<resultado>

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY")            ?? "";
const FROM_EMAIL   = "contato@oztechsmartcontrol.com.br";
const APP_URL      = "https://ozbarber.oztechsmartcontrol.com.br";

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

// Redireciona para o app React — usa o handler ?booking= já existente
function toApp(booking: string, extra: Record<string, string> = {}): Response {
  const qs = new URLSearchParams({ booking, ...extra }).toString();
  return Response.redirect(`${APP_URL}/?${qs}`, 302);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" },
    });
  }

  const url    = new URL(req.url);
  const token  = url.searchParams.get("token")?.trim();
  const action = url.searchParams.get("action")?.trim();

  if (!token || (action !== "confirm" && action !== "cancel")) {
    return toApp("invalid");
  }

  const apptRes  = await db(`appointments?action_token=eq.${token}&select=*&limit=1`);
  const apptData = await apptRes.json();
  const appt     = Array.isArray(apptData) ? apptData[0] : null;

  if (!appt) {
    return toApp("notfound");
  }

  const shopRes = await db(`barbershops?id=eq.${appt.barbershop_id}&select=name,logo_url,accent_color&limit=1`);
  const shop    = (await shopRes.json())[0] ?? { name: "Barbearia", logo_url: null, accent_color: "#4db8ff" };
  const color   = shop.accent_color || "#4db8ff";
  const timeStr = (appt.scheduled_time || "").slice(0, 5);
  const dateStr = fDate(appt.scheduled_date);
  const name    = appt.client_name || "";
  const shopN   = shop.name;

  // Passa só o path da logo (ex: "shopId/file.jpg") para evitar problemas de encoding
  // A URL completa é reconstruída no React com SUPABASE_URL fixo
  const LOGO_BASE = `${SUPABASE_URL}/storage/v1/object/public/logos/`;
  const rawLogo   = (shop.logo_url || "").split("?")[0];
  const logo      = rawLogo.startsWith(LOGO_BASE) ? rawLogo.slice(LOGO_BASE.length) : "";

  // Ação já processada
  if (appt.status === "confirmed" && action === "confirm") {
    return toApp("already_confirmed", { name, shop: shopN, color, logo, date: dateStr, time: timeStr });
  }
  if (appt.status === "cancelled") {
    return toApp("already_cancelled", { shop: shopN, logo });
  }
  if (appt.status === "completed") {
    return toApp("completed", { shop: shopN, color, logo });
  }

  // Confirmar
  if (action === "confirm") {
    await db(`appointments?id=eq.${appt.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "confirmed", updated_at: new Date().toISOString() }),
    });
    console.log(`[appointment-action] Confirmado: ${appt.id}`);
    return toApp("confirmed_me", { name, shop: shopN, color, logo, date: dateStr, time: timeStr });
  }

  // Cancelar
  await db(`appointments?id=eq.${appt.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled", updated_at: new Date().toISOString() }),
  });
  console.log(`[appointment-action] Cancelado: ${appt.id}`);

  const barberRes = await db(`barbers?id=eq.${appt.barber_id}&select=name,notification_email&limit=1`);
  const barber    = (await barberRes.json())[0];

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

  return toApp("cancelled_me", { shop: shopN, logo });
});
