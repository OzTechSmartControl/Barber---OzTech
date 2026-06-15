// Edge Function: create-trial-account
// Cria uma conta de teste gratuito por 7 dias para uma nova barbearia.
// Fluxo: recebe dados → cria auth user → cria barbershop (trial) → cria profile admin → faz sign-in → retorna sessão

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY")            ?? "";
const FROM_EMAIL    = "contato@oztechsmartcontrol.com.br";
const APP_URL       = "https://ozbarber.oztechsmartcontrol.com.br";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Chamadas REST ao Supabase com service_role (bypass RLS)
const db = (path: string, opts: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      "Content-Type":  "application/json",
      Prefer:          "return=representation",
      ...(opts.headers ?? {}),
    },
  });

// Gera slug a partir do nome da barbearia
function toSlug(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 32);
  return `${base}-${suffix}`;
}

async function sendWelcomeEmail(opts: {
  to:              string;
  owner_name:      string;
  barbershop_name: string;
  trial_days:      number;
}): Promise<void> {
  if (!RESEND_KEY) return;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#08090c;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;margin-bottom:28px;">
      <img src="${APP_URL}/ozbarber-logo.png" alt="Oz.Barber"
        style="max-height:56px;width:auto;display:block;margin:0 auto;filter:drop-shadow(0 0 16px rgba(77,184,255,.25));" />
    </div>

    <div style="background:#13141a;border:1px solid #1e2030;border-radius:18px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#4db8ff,#7dd3fc);height:5px;"></div>
      <div style="padding:32px 28px;">

        <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">
          Bem-vindo ao Oz.Barber! 🎉
        </div>
        <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 24px;">
          Olá, <strong style="color:#e5e7eb;">${opts.owner_name}</strong>!<br>
          Seu período de teste gratuito de <strong style="color:#4db8ff;">${opts.trial_days} dias</strong>
          foi ativado para a barbearia <strong style="color:#e5e7eb;">${opts.barbershop_name}</strong>.
        </p>

        <div style="background:#0d0e14;border:1px solid #2a2b38;border-radius:14px;padding:20px 20px;margin-bottom:24px;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:12px;">
            O que você pode fazer agora
          </div>
          ${[
            "Cadastrar barbeiros e serviços",
            "Registrar atendimentos e clientes",
            "Acompanhar financeiro em tempo real",
            "Gerar relatórios de desempenho",
            "Ativar agendamento online",
          ].map(item => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div style="width:18px;height:18px;border-radius:50%;background:#4db8ff22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <span style="color:#4db8ff;font-size:11px;font-weight:900;">✓</span>
              </div>
              <span style="color:#d1d5db;font-size:13px;">${item}</span>
            </div>
          `).join("")}
        </div>

        <a href="${APP_URL}"
          style="display:block;text-align:center;background:linear-gradient(135deg,#4db8ff,#7dd3fc);color:#061018;text-decoration:none;border-radius:12px;padding:14px 24px;font-size:14px;font-weight:900;letter-spacing:.3px;">
          Acessar Oz.Barber →
        </a>

      </div>
      <div style="padding:14px 28px;border-top:1px solid #1e2030;text-align:center;">
        <p style="color:#374151;font-size:11px;margin:0;">
          Oz.Barber · <strong style="color:#4db8ff;">OzTech SmartControl</strong>
          · Seu teste expira em ${opts.trial_days} dias
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    `Oz.Barber <${FROM_EMAIL}>`,
        to:      [opts.to],
        subject: `🎉 Teste grátis ativado — ${opts.barbershop_name}`,
        html,
      }),
    });
  } catch (e) {
    console.error("[create-trial] Erro ao enviar e-mail de boas-vindas:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido." }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const {
    owner_name      = "",
    email           = "",
    password        = "",
    barbershop_name = "",
    phone           = "",
    source          = "",
  } = body;

  // ── Validações básicas ──────────────────────────────────────────
  if (!owner_name.trim())      return err400("Informe seu nome completo.");
  if (!email.trim())           return err400("Informe seu e-mail.");
  if (password.length < 6)     return err400("A senha deve ter no mínimo 6 caracteres.");
  if (!barbershop_name.trim()) return err400("Informe o nome da sua barbearia.");

  const cleanEmail = email.trim().toLowerCase();

  try {
    // ── 1. Cria o usuário no Supabase Auth (sem verificação de e-mail) ──
    const createUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey:          SUPABASE_KEY,
        Authorization:   `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        email:          cleanEmail,
        password,
        email_confirm:  true,
        user_metadata:  { full_name: owner_name.trim() },
      }),
    });

    const createdUser = await createUserRes.json();

    if (!createUserRes.ok || !createdUser.id) {
      const msg = createdUser?.msg || createdUser?.message || createdUser?.error_description || "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
        return err409("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      }
      console.error("[create-trial] Erro ao criar auth user:", createdUser);
      return err500("Erro ao criar conta. Tente novamente.");
    }

    const userId = createdUser.id as string;

    // ── 2. Gera UUID e slug para a barbearia ────────────────────────
    const barbershopId  = crypto.randomUUID();
    const slugSuffix    = barbershopId.replace(/-/g, "").substring(0, 6);
    const slug          = toSlug(barbershop_name.trim(), slugSuffix);

    // ── 3. Cria a barbearia com plan='trial', status='trial' ────────
    const shopRes = await db("barbershops", {
      method: "POST",
      body: JSON.stringify({
        id:               barbershopId,
        name:             barbershop_name.trim(),
        slug,
        plan:             "trial",
        status:           "trial",
        trial_started_at: new Date().toISOString(),
        source:           source.trim() || null,
        phone:            phone.trim() || null,
        accent_color:     "#4db8ff",
      }),
    });

    if (!shopRes.ok) {
      const shopErr = await shopRes.json().catch(() => ({}));
      console.error("[create-trial] Erro ao criar barbearia:", shopErr);
      // Limpa o usuário criado para não deixar conta órfã
      await cleanupUser(userId);
      return err500("Erro ao configurar a barbearia. Tente novamente.");
    }

    // ── 4. Cria/atualiza o perfil admin (upsert porque um trigger pode ter criado o registro)
    const profileRes = await db("profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id:            userId,
        role:          "admin",
        barbershop_id: barbershopId,
      }),
    });

    if (!profileRes.ok) {
      const profErr = await profileRes.json().catch(() => ({}));
      console.error("[create-trial] Erro ao criar perfil:", profErr);
      await cleanupUser(userId);
      return err500("Erro ao configurar o perfil. Tente novamente.");
    }

    // ── 5. Faz sign-in para obter a sessão ──────────────────────────
    const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey:         SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const session = await signInRes.json();

    if (!signInRes.ok || !session.access_token) {
      console.error("[create-trial] Erro no sign-in pós-criação:", session);
      // Conta criada com sucesso, mas login falhou → retorna parcial
      return new Response(JSON.stringify({
        success:  true,
        message:  "Conta criada! Faça login com seu e-mail e senha para acessar.",
        auto_login: false,
      }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── 6. Busca o perfil completo para retornar ao frontend ────────
    const profileData = await db(
      `profiles?id=eq.${userId}&select=*&limit=1`
    ).then(r => r.json()).then(d => Array.isArray(d) ? d[0] : null);

    // ── 7. Envia e-mail de boas-vindas ──────────────────────────────
    await sendWelcomeEmail({
      to:              cleanEmail,
      owner_name:      owner_name.trim(),
      barbershop_name: barbershop_name.trim(),
      trial_days:      7,
    });

    console.log(`[create-trial] ✓ Conta trial criada: ${cleanEmail} | ${barbershopId}`);

    return new Response(JSON.stringify({
      success:      true,
      auto_login:   true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type:   session.token_type,
      expires_in:   session.expires_in,
      user:         session.user,
      profile:      profileData,
    }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[create-trial] Erro não tratado:", e);
    return err500("Erro interno. Tente novamente mais tarde.");
  }
});

// ── Helpers ─────────────────────────────────────────────────────────

function err400(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err409(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 409, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err500(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function cleanupUser(userId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
  } catch (e) {
    console.error("[create-trial] Falha ao limpar usuário órfão:", userId, e);
  }
}
