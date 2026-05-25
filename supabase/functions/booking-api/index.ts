import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GMAIL_USER   = Deno.env.get("GMAIL_USER") ?? "";
const GMAIL_PASS   = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const db = (path: string, opts: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers ?? {}),
    },
  });

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Helpers de tempo ─────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

// ── Notificação e-mail para o barbeiro ───────────────────────────

async function notifyBarber(opts: {
  barber_email: string;
  barber_name:  string;
  barbershop_name: string;
  barbershop_logo: string | null;
  accent_color:    string;
  client_name:  string;
  client_phone: string;
  services:     string;
  scheduled_date: string;
  scheduled_time: string;
  confirm_url?:   string;
}) {
  if (!GMAIL_USER || !GMAIL_PASS || !opts.barber_email) return;

  const color = opts.accent_color || "#4db8ff";
  const dateFormatted = new Date(`${opts.scheduled_date}T12:00:00`)
    .toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  const logoHtml = (opts.barbershop_logo && opts.barbershop_logo !== "null")
    ? `<img src="${opts.barbershop_logo}" alt="${opts.barbershop_name}" style="max-height:56px;max-width:140px;width:auto;height:auto;border-radius:10px;display:block;margin:0 auto 10px;" />`
    : `<div style="width:52px;height:52px;border-radius:14px;background:${color}22;border:2px solid ${color}44;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:24px;font-weight:900;color:${color};font-family:'Segoe UI',Arial,sans-serif;">${(opts.barbershop_name||"B")[0].toUpperCase()}</div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#08090c;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      ${logoHtml}
      <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:2px;text-transform:uppercase;">${opts.barbershop_name}</div>
      <div style="font-size:11px;color:#4b5563;margin-top:3px;">Agendamento Online · Oz.Barber</div>
    </div>
    <div style="background:#13141a;border:1px solid #1e2030;border-radius:18px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,${color},${color}aa);height:5px;"></div>
      <div style="padding:28px 26px;">
        <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">📅 Nova Solicitação!</div>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;line-height:1.6;">
          Olá, <strong style="color:#e5e7eb;">${opts.barber_name}</strong>!
          Você recebeu uma nova solicitação de agendamento.
        </p>
        <div style="background:#0d0e14;border:1px solid #1e2030;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
          <div style="margin-bottom:14px;display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:20px;line-height:1;">👤</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:2px;">Cliente</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;">${opts.client_name}</div>
              <div style="font-size:13px;color:#9ca3af;margin-top:2px;">${opts.client_phone}</div>
            </div>
          </div>
          <div style="margin-bottom:14px;display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:20px;line-height:1;">📅</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:2px;">Data</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;text-transform:capitalize;">${dateFormatted}</div>
            </div>
          </div>
          <div style="margin-bottom:14px;display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:20px;line-height:1;">🕐</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:2px;">Horário</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;">${opts.scheduled_time}</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:20px;line-height:1;">✂️</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:2px;">Serviço</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;">${opts.services}</div>
            </div>
          </div>
        </div>
        ${opts.confirm_url ? `
        <div style="text-align:center;margin-top:8px;">
          <a href="${opts.confirm_url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;border-radius:10px;padding:14px 32px;font-size:15px;font-weight:700;font-family:'Segoe UI',Arial,sans-serif;letter-spacing:0.3px;">
            ✓ Confirmar Agendamento
          </a>
          <p style="color:#6b7280;font-size:11px;margin:10px 0 0;line-height:1.6;">
            Ou acesse o painel para gerenciar o agendamento.
          </p>
        </div>` : `
        <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.7;text-align:center;">
          Acesse o painel para confirmar ou cancelar o agendamento.
        </p>`}
      </div>
      <div style="padding:14px 26px;border-top:1px solid #1e2030;text-align:center;">
        <p style="color:#374151;font-size:11px;margin:0;">
          Enviado automaticamente por <strong style="color:${color};">Oz.Barber</strong>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    await transporter.sendMail({
      from:    `"${opts.barbershop_name}" <${GMAIL_USER}>`,
      to:      opts.barber_email,
      subject: `📅 Nova solicitação — ${opts.client_name} (${opts.scheduled_time})`,
      html,
    });
    console.log("[notify-barber] Enviado para:", opts.barber_email);
  } catch (e) {
    console.error("[notify-barber]", e);
  }
}

// ── action: get_shop ─────────────────────────────────────────────
// Retorna dados públicos da barbearia + barbeiros ativos + serviços ativos

async function getShop(slug: string) {
  const shopRes = await db(
    `barbershops?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,logo_url,accent_color&limit=1`
  );
  const shops = await shopRes.json();
  if (!Array.isArray(shops) || !shops[0]) return err("Barbearia não encontrada.", 404);
  const shop = shops[0];

  const [barbersRes, servicesRes] = await Promise.all([
    db(`barbers?barbershop_id=eq.${shop.id}&status=eq.active&select=id,name`),
    db(`services?barbershop_id=eq.${shop.id}&active=eq.true&select=id,name,price,duration&order=name.asc`),
  ]);

  const barbers  = await barbersRes.json();
  const services = await servicesRes.json();

  return ok({ shop, barbers, services });
}

// ── action: get_client ───────────────────────────────────────────
// Busca cliente pelo WhatsApp para pré-preencher o formulário público

async function getClient(params: URLSearchParams) {
  const phone         = params.get("phone") ?? "";
  const barbershop_id = params.get("barbershop_id") ?? "";
  if (!phone || !barbershop_id) return ok({ client: null });

  const res = await db(
    `clients?barbershop_id=eq.${barbershop_id}&whatsapp=eq.${encodeURIComponent(phone.trim())}&select=id,name,email&limit=1`
  );
  const rows = await res.json();
  return ok({ client: (Array.isArray(rows) && rows[0]) ? rows[0] : null });
}

// ── action: get_slots ────────────────────────────────────────────
// Retorna horários disponíveis para um barbeiro + serviço(s) + data
// Aceita service_ids="1,2,3" (multi-serviço) ou service_id="1" (legado)

async function getSlots(params: URLSearchParams) {
  const barber_id     = params.get("barber_id");
  const service_ids   = params.get("service_ids");  // novo: "1,2,3"
  const service_id    = params.get("service_id");   // legado: "1"
  const date          = params.get("date");          // YYYY-MM-DD
  const barbershop_id = params.get("barbershop_id");

  if (!barber_id || (!service_ids && !service_id) || !date || !barbershop_id)
    return err("barber_id, service_ids (ou service_id), date e barbershop_id são obrigatórios.");

  // Dia da semana (0=domingo ... 6=sábado)
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();

  // 1. Disponibilidade do barbeiro nesse dia
  const availRes = await db(
    `barber_availability?barber_id=eq.${barber_id}&day_of_week=eq.${dayOfWeek}&is_active=eq.true&limit=1`
  );
  const avail = await availRes.json();
  if (!Array.isArray(avail) || !avail[0]) return ok({ slots: [] });

  const { start_time, end_time } = avail[0];
  const startMin = timeToMinutes(start_time);
  const endMin   = timeToMinutes(end_time);

  // 2. Duração total = soma das durações de todos os serviços selecionados
  let duration = 30; // fallback

  if (service_ids) {
    // Multi-serviço: soma as durações
    const ids = service_ids.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      const svcsRes = await db(`services?id=in.(${ids.join(",")})&select=id,duration`);
      const svcs = await svcsRes.json() as { id: number; duration: number }[];
      if (Array.isArray(svcs) && svcs.length > 0) {
        duration = svcs.reduce((sum, s) => sum + (s.duration ?? 30), 0);
      }
    }
  } else if (service_id) {
    // Legado: serviço único
    const svcRes = await db(`services?id=eq.${service_id}&select=duration&limit=1`);
    const svcs   = await svcRes.json();
    if (Array.isArray(svcs) && svcs[0]) duration = svcs[0].duration ?? 30;
  }

  // 3. Agendamentos já existentes nesse dia/barbeiro
  const apptRes = await db(
    `appointments?barber_id=eq.${barber_id}&scheduled_date=eq.${date}&status=in.(pending,confirmed)&select=scheduled_time,duration_minutes`
  );
  const existing = await apptRes.json() as { scheduled_time: string; duration_minutes: number }[];

  // 4. Marca minutos ocupados (minuto a minuto)
  const occupied = new Set<string>();
  for (const a of existing) {
    const s = timeToMinutes(a.scheduled_time);
    for (let m = s; m < s + a.duration_minutes; m++) {
      occupied.add(minutesToTime(m));
    }
  }

  // 5. Gera grade de slots e remove os que colidem com ocupados.
  // Passo fixo de 30 min: permite encaixar agendamentos logo após o término
  // de um anterior (ex: 09:30 disponível depois de um 09:00-09:30), sem
  // depender da duração do serviço atual como incremento.
  const SLOT_STEP = 30;
  const slots: string[] = [];
  for (let m = startMin; m + duration <= endMin; m += SLOT_STEP) {
    let free = true;
    for (let i = m; i < m + duration; i++) {
      if (occupied.has(minutesToTime(i))) { free = false; break; }
    }
    if (free) slots.push(minutesToTime(m));
  }

  return ok({ slots, duration, date });
}

// ── action: book ─────────────────────────────────────────────────
// Cria (ou encontra) o cliente e registra o agendamento
// Aceita service_ids (array) para multi-serviço

async function book(body: Record<string, unknown>) {
  const {
    barbershop_id, barber_id, service_id,
    scheduled_date, scheduled_time, duration_minutes,
    client_name, client_phone, client_email, notes,
  } = body as Record<string, string>;

  // Multi-serviço: service_ids é um array de números enviado pelo frontend
  const service_ids_raw = body.service_ids;
  const serviceIdsArr: number[] = Array.isArray(service_ids_raw)
    ? (service_ids_raw as unknown[]).map(Number).filter(Boolean)
    : service_id ? [Number(service_id)] : [];

  if (!barbershop_id || !barber_id || !service_id || !scheduled_date || !scheduled_time)
    return err("Campos obrigatórios: barbershop_id, barber_id, service_id, scheduled_date, scheduled_time.");
  if (!client_name || !client_phone)
    return err("Nome e telefone do cliente são obrigatórios.");

  // 1. Checa duplicidade pelo telefone
  const clientRes = await db(
    `clients?barbershop_id=eq.${barbershop_id}&whatsapp=eq.${encodeURIComponent(client_phone.trim())}&select=id,name&limit=1`
  );
  const clients = await clientRes.json();

  let client_id: string | null = null;

  if (Array.isArray(clients) && clients[0]) {
    // Cliente já existe → usa o existente
    client_id = clients[0].id;
  } else {
    // Cria novo cliente
    const newClientRes = await db("clients", {
      method: "POST",
      body: JSON.stringify({
        barbershop_id,
        name:      client_name.trim(),
        whatsapp:  client_phone.trim(),
        email:     client_email?.trim() || null,
        points:    0,
      }),
    });
    const newClients = await newClientRes.json();
    if (Array.isArray(newClients) && newClients[0]) {
      client_id = newClients[0].id;
    }
  }

  // 2. Verifica conflito de horário (double-booking)
  const conflictRes = await db(
    `appointments?barber_id=eq.${barber_id}&scheduled_date=eq.${scheduled_date}&scheduled_time=eq.${scheduled_time}&status=in.(pending,confirmed)&select=id&limit=1`
  );
  const conflicts = await conflictRes.json();
  if (Array.isArray(conflicts) && conflicts.length > 0)
    return err("Esse horário já foi reservado. Por favor, escolha outro.");

  // 3. Gera token de confirmação único
  const confirmToken = crypto.randomUUID();

  // 4. Cria o agendamento
  const apptRes = await db("appointments", {
    method: "POST",
    body: JSON.stringify({
      barbershop_id,
      barber_id,
      client_id,
      service_id,                                    // serviço principal (legado)
      service_ids: serviceIdsArr,                    // todos os serviços (multi)
      scheduled_date,
      scheduled_time,
      duration_minutes: Number(duration_minutes) || 30,
      status:           "pending",
      client_name:      client_name.trim(),
      client_phone:     client_phone.trim(),
      client_email:     client_email?.trim() || null,
      notes:            notes?.trim() || null,
      booked_via:       "public",
      confirm_token:    confirmToken,
    }),
  });
  const appts = await apptRes.json();
  if (!Array.isArray(appts) || !appts[0])
    return err("Erro ao criar agendamento. Tente novamente.");

  // 5. Notifica o barbeiro por e-mail (fire-and-forget)
  (async () => {
    try {
      const [barberRes, shopRes, svcsRes] = await Promise.all([
        db(`barbers?id=eq.${barber_id}&select=name,notification_email&limit=1`),
        db(`barbershops?id=eq.${barbershop_id}&select=name,logo_url,accent_color&limit=1`),
        serviceIdsArr.length > 0
          ? db(`services?id=in.(${serviceIdsArr.join(",")})&select=name`)
          : Promise.resolve(null),
      ]);
      const barber = (await barberRes.json())[0];
      const shop   = (await shopRes.json())[0];
      const svcs   = svcsRes ? await svcsRes.json() : [];

      if (barber?.notification_email) {
        const serviceNames = Array.isArray(svcs) && svcs.length > 0
          ? svcs.map((s: { name: string }) => s.name).join(" + ")
          : "Serviço";
        const confirmUrl = `${SUPABASE_URL}/functions/v1/booking-api?action=confirm&token=${confirmToken}`;
        await notifyBarber({
          barber_email:    barber.notification_email,
          barber_name:     barber.name,
          barbershop_name: shop?.name        || "Barbearia",
          barbershop_logo: shop?.logo_url    || null,
          accent_color:    shop?.accent_color || "#4db8ff",
          client_name:     client_name.trim(),
          client_phone:    client_phone.trim(),
          services:        serviceNames,
          scheduled_date,
          scheduled_time,
          confirm_url:     confirmUrl,
        });
      }
    } catch (e) {
      console.error("[notify-barber background]", e);
    }
  })();

  return ok({ appointment: appts[0], client_id }, 201);
}

// ── action: confirm (via link no e-mail) ─────────────────────────

function htmlPage(title: string, emoji: string, color: string, msg: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#08090c;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;padding:2.5rem 1.5rem;max-width:400px;">
    <div style="font-size:72px;margin-bottom:1rem;">${emoji}</div>
    <h1 style="color:${color};font-size:24px;margin:0 0 0.75rem;">${title}</h1>
    <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0;">${msg}</p>
  </div>
</body></html>`;
}

async function confirmByToken(token: string) {
  const htmlHeader = { "Content-Type": "text/html; charset=utf-8" };

  if (!token) return new Response(
    htmlPage("Link inválido", "❌", "#ef4444", "Este link de confirmação é inválido."),
    { status: 400, headers: htmlHeader }
  );

  // Busca o agendamento pelo token
  const apptRes = await db(
    `appointments?confirm_token=eq.${token}&select=id,status,client_name,client_email,client_phone,scheduled_date,scheduled_time,service_id,service_ids,barber_id,barbershop_id&limit=1`
  );
  const appts = await apptRes.json();
  const appt  = Array.isArray(appts) ? appts[0] : null;

  if (!appt) return new Response(
    htmlPage("Link inválido", "❌", "#ef4444", "Agendamento não encontrado ou link expirado."),
    { status: 404, headers: htmlHeader }
  );

  if (appt.status === "confirmed") return new Response(
    htmlPage("Já confirmado", "✅", "#22c55e", "Este agendamento já foi confirmado anteriormente."),
    { status: 200, headers: htmlHeader }
  );

  if (appt.status === "cancelled") return new Response(
    htmlPage("Cancelado", "🚫", "#ef4444", "Este agendamento foi cancelado e não pode ser confirmado."),
    { status: 200, headers: htmlHeader }
  );

  // Confirma o agendamento
  await db(`appointments?id=eq.${appt.id}`, {
    method:  "PATCH",
    body:    JSON.stringify({ status: "confirmed", updated_at: new Date().toISOString() }),
    headers: { Prefer: "return=minimal" },
  });

  // Envia e-mail de confirmação ao cliente (fire-and-forget)
  if (appt.client_email) {
    (async () => {
      try {
        const serviceIds: number[] = Array.isArray(appt.service_ids) && appt.service_ids.length > 0
          ? appt.service_ids : appt.service_id ? [appt.service_id] : [];

        const [barberRes, shopRes, svcsRes] = await Promise.all([
          db(`barbers?id=eq.${appt.barber_id}&select=name&limit=1`),
          db(`barbershops?id=eq.${appt.barbershop_id}&select=name,logo_url,accent_color&limit=1`),
          serviceIds.length > 0 ? db(`services?id=in.(${serviceIds.join(",")})&select=name`) : Promise.resolve(null),
        ]);
        const barber = (await barberRes.json())[0];
        const shop   = (await shopRes.json())[0];
        const svcs   = svcsRes ? await svcsRes.json() : [];
        const serviceNames = Array.isArray(svcs) && svcs.length > 0
          ? svcs.map((s: { name: string }) => s.name).join(" + ")
          : "Serviço";

        await fetch(`${SUPABASE_URL}/functions/v1/notify-appointment`, {
          method:  "POST",
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            client_name:     appt.client_name  || "",
            client_email:    appt.client_email,
            barbershop_name: shop?.name         || "Barbearia",
            barbershop_logo: shop?.logo_url     || null,
            accent_color:    shop?.accent_color || "#4db8ff",
            barber_name:     barber?.name       || "—",
            services:        serviceNames,
            scheduled_date:  appt.scheduled_date,
            scheduled_time:  (appt.scheduled_time || "").slice(0, 5),
          }),
        });
      } catch (e) {
        console.error("[confirm-notify-client]", e);
      }
    })();
  }

  return new Response(
    htmlPage("Confirmado!", "✅", "#22c55e", `O agendamento de <strong style="color:#e5e7eb;">${appt.client_name}</strong> foi confirmado com sucesso.<br>O cliente será notificado por e-mail.`),
    { status: 200, headers: htmlHeader }
  );
}

// ── Handler principal ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET") {
      if (action === "get_shop") {
        const slug = url.searchParams.get("slug") ?? "";
        return await getShop(slug);
      }
      if (action === "get_slots") {
        return await getSlots(url.searchParams);
      }
      if (action === "get_client") {
        return await getClient(url.searchParams);
      }
      if (action === "confirm") {
        const token = url.searchParams.get("token") ?? "";
        return await confirmByToken(token);
      }
      return err("action inválida.", 400);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (action === "book") return await book(body);
      return err("action inválida.", 400);
    }

    return err("Método não suportado.", 405);

  } catch (e) {
    console.error("[booking-api]", e);
    return err("Erro interno do servidor.", 500);
  }
});
