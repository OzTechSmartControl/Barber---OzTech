import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

  // 3. Cria o agendamento
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
    }),
  });
  const appts = await apptRes.json();
  if (!Array.isArray(appts) || !appts[0])
    return err("Erro ao criar agendamento. Tente novamente.");

  return ok({ appointment: appts[0], client_id }, 201);
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
