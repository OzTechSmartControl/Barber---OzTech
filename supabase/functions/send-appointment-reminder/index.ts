import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")               ?? "";
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")  ?? "";
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY")             ?? "";
const FROM_EMAIL    = "contato@oztechsmartcontrol.com.br";

// URL base da Edge Function que processa confirm/cancel do e-mail
const ACTION_BASE = "https://kqjzontxfwlwmvbddbnv.supabase.co/functions/v1/appointment-action";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

function fDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

async function sendReminderEmail(opts: {
  to:              string;
  client_name:     string;
  barbershop_name: string;
  barbershop_logo: string | null;
  accent_color:    string;
  barber_name:     string;
  services:        string;
  scheduled_date:  string;
  scheduled_time:  string;
  confirm_url:     string;
  cancel_url:      string;
}): Promise<string> {
  const color = opts.accent_color || "#4db8ff";

  const logoHtml = (opts.barbershop_logo && opts.barbershop_logo !== "null" && opts.barbershop_logo !== "")
    ? `<img src="${opts.barbershop_logo}" alt="${opts.barbershop_name}" style="max-height:52px;max-width:130px;width:auto;height:auto;border-radius:10px;display:block;margin:0 auto 10px;" />`
    : `<div style="width:48px;height:48px;border-radius:12px;background:${color}22;border:2px solid ${color}44;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px;font-weight:900;color:${color};font-family:'Segoe UI',Arial,sans-serif;">${(opts.barbershop_name || "B")[0].toUpperCase()}</div>`;

  const rows = [
    ["✂️", "Serviço",  opts.services],
    ["👤", "Barbeiro", opts.barber_name],
    ["📅", "Data",     fDate(opts.scheduled_date)],
    ["🕐", "Horário",  opts.scheduled_time.slice(0, 5)],
  ].map(([icon, label, value]) => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <span style="font-size:18px;line-height:1;flex-shrink:0;">${icon}</span>
      <div>
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:2px;">${label}</div>
        <div style="font-size:14px;color:#e5e7eb;font-weight:600;">${value}</div>
      </div>
    </div>`).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#08090c;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;margin-bottom:24px;">
      ${logoHtml}
      <div style="font-size:19px;font-weight:900;color:#fff;letter-spacing:2px;text-transform:uppercase;">${opts.barbershop_name}</div>
      <div style="font-size:11px;color:#4b5563;margin-top:3px;">Oz.Barber · Gestão de Barbearias</div>
    </div>

    <div style="background:#13141a;border:1px solid #1e2030;border-radius:18px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,${color},${color}aa);height:5px;"></div>
      <div style="padding:32px 28px;">

        <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">⏰ Lembrete de agendamento</div>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 22px;line-height:1.6;">
          Olá, <strong style="color:#e5e7eb;">${opts.client_name}</strong>!<br>
          Seu agendamento está marcado para <strong style="color:${color};">amanhã</strong>.
          Por favor, confirme sua presença ou cancele com antecedência.
        </p>

        <div style="background:#0d0e14;border:1px solid #2a2b38;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
          ${rows}
        </div>

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
          <a href="${opts.confirm_url}"
             style="display:inline-block;background:${color};color:#000;font-weight:700;font-size:15px;padding:13px 30px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
            ✅ Confirmar presença
          </a>
          <a href="${opts.cancel_url}"
             style="display:inline-block;background:transparent;color:#ef4444;font-weight:700;font-size:15px;padding:13px 30px;border-radius:10px;text-decoration:none;border:1px solid #ef444455;letter-spacing:0.3px;">
            ❌ Cancelar
          </a>
        </div>

        <p style="color:#6b7280;font-size:12px;margin:0;text-align:center;line-height:1.6;">
          Se não puder comparecer, cancele para liberar o horário para outros clientes.
        </p>

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
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    `${opts.barbershop_name} <${FROM_EMAIL}>`,
      to:      [opts.to],
      subject: `⏰ Seu agendamento é amanhã — ${opts.barbershop_name}`,
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
    const now = Date.now();

    // Busca todos os agendamentos pendentes/confirmados sem lembrete enviado
    const apptRes = await db(
      `appointments?status=in.(pending,confirmed)&reminder_sent_at=is.null` +
      `&select=id,scheduled_date,scheduled_time,client_name,client_email,` +
      `barber_id,barbershop_id,service_ids,service_id,action_token,created_at`
    );
    const allAppts = await apptRes.json();

    if (!Array.isArray(allAppts) || allAppts.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, checked: 0 }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const appt of allAppts) {
      // Datetime do agendamento em BRT (UTC-3)
      const apptMs  = new Date(`${appt.scheduled_date}T${appt.scheduled_time}-03:00`).getTime();
      const diffH   = (apptMs - now) / 3_600_000;

      // Janela: entre 22h e 26h no futuro (cobre fuso e intervalo do cron)
      if (diffH < 22 || diffH > 26) continue;

      // Regra: criado com antecedência mínima de 30h
      const createdMs  = new Date(appt.created_at).getTime();
      const leadHours  = (apptMs - createdMs) / 3_600_000;
      if (leadHours < 30) {
        console.log(`[reminder] Pulando ${appt.id} — lead de ${leadHours.toFixed(1)}h < 30h`);
        continue;
      }

      if (!appt.client_email) {
        console.log(`[reminder] Pulando ${appt.id} — sem e-mail do cliente`);
        continue;
      }

      try {
        // Dados da barbearia
        const shopRes  = await db(`barbershops?id=eq.${appt.barbershop_id}&select=name,logo_url,accent_color&limit=1`);
        const shop     = (await shopRes.json())[0] ?? { name: "Barbearia", logo_url: null, accent_color: "#4db8ff" };

        // Nome do barbeiro
        const barberRes  = await db(`barbers?id=eq.${appt.barber_id}&select=name&limit=1`);
        const barberName = (await barberRes.json())[0]?.name ?? "—";

        // Nomes dos serviços
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

        const token      = appt.action_token;
        const confirmUrl = `${ACTION_BASE}?token=${token}&action=confirm`;
        const cancelUrl  = `${ACTION_BASE}?token=${token}&action=cancel`;

        const msgId = await sendReminderEmail({
          to:              appt.client_email,
          client_name:     appt.client_name || "Cliente",
          barbershop_name: shop.name,
          barbershop_logo: shop.logo_url,
          accent_color:    shop.accent_color,
          barber_name:     barberName,
          services:        serviceNames,
          scheduled_date:  appt.scheduled_date,
          scheduled_time:  appt.scheduled_time,
          confirm_url:     confirmUrl,
          cancel_url:      cancelUrl,
        });

        // Marca lembrete como enviado
        await db(`appointments?id=eq.${appt.id}`, {
          method: "PATCH",
          body: JSON.stringify({ reminder_sent_at: new Date().toISOString() }),
        });

        console.log(`[reminder] ✓ ${appt.client_email} | ${shop.name} | ${appt.scheduled_date} ${appt.scheduled_time} | lead: ${leadHours.toFixed(1)}h | id: ${msgId}`);
        sent++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[reminder] ✗ appt ${appt.id}:`, msg);
        errors.push(`${appt.id}: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, checked: allAppts.length, errors }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    console.error("[reminder]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
