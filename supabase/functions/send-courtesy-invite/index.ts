import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")             ?? "";
const FROM_EMAIL = "contato@oztechsmartcontrol.com.br";
const SUPA_URL   = Deno.env.get("SUPABASE_URL")               ?? "";
const SUPA_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")  ?? "";
const APP_URL    = "https://ozbarber.oztechsmartcontrol.com.br";
const LOGO_URL   = `${APP_URL}/ozbarber-logo.png`;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { email, redirect_to } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) throw new Error("E-mail não informado.");

    const redirectTo = redirect_to || `${APP_URL}/`;

    // 1. Generate magic link via Supabase Admin Auth API
    const genRes = await fetch(`${SUPA_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey:          SUPA_KEY,
        Authorization:   `Bearer ${SUPA_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        type:  "magiclink",
        email: normalizedEmail,
        options: { redirect_to: redirectTo },
      }),
    });

    const genData = await genRes.json();
    if (!genRes.ok) throw new Error(genData?.message ?? "Erro ao gerar link de acesso.");

    const magicLink: string = genData.action_link;
    if (!magicLink) throw new Error("Link de acesso não retornado pelo servidor.");

    // 2. Send branded email via Resend
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:40px 16px;">

    <div style="text-align:center;margin-bottom:32px;">
      <img src="${LOGO_URL}" alt="Oz.Barber" style="height:56px;object-fit:contain;" />
    </div>

    <div style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">

      <div style="background:linear-gradient(135deg,#1e3a5f,#0f2744);padding:28px 28px 24px;">
        <h1 style="color:#4db8ff;font-size:20px;font-weight:900;margin:0 0 6px;letter-spacing:.3px;">
          Você recebeu um acesso cortesia! 🎉
        </h1>
        <p style="color:#93c5fd;font-size:13px;margin:0;line-height:1.5;">
          A equipe Oz.Barber liberou seu acesso à plataforma.
        </p>
      </div>

      <div style="padding:28px;">
        <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0 0 20px;">
          Olá! Você foi selecionado para receber um
          <strong style="color:#4db8ff;">acesso cortesia</strong>
          ao sistema de gestão <strong style="color:#fff;">Oz.Barber</strong>.
          Clique no botão abaixo para criar sua conta e começar a usar a plataforma:
        </p>

        <a href="${magicLink}"
           style="display:block;text-align:center;background:#4db8ff;
                  color:#ffffff;text-decoration:none;border-radius:12px;padding:15px 24px;
                  font-size:15px;font-weight:900;letter-spacing:.3px;margin-bottom:24px;">
          Criar minha conta
        </a>

        <div style="background:#0f172a;border-radius:10px;padding:16px;border:1px solid #1e293b;">
          <p style="color:#6b7280;font-size:11px;margin:0 0 10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">
            O que você pode fazer no Oz.Barber:
          </p>
          ${[
            "Gerenciar agendamentos online",
            "Controlar atendimentos e caixa",
            "Cadastrar barbeiros e serviços",
            "Acompanhar relatórios em tempo real",
          ].map(item => `
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
            <span style="color:#4db8ff;font-size:13px;font-weight:900;flex-shrink:0;">✓</span>
            <span style="color:#9ca3af;font-size:13px;">${item}</span>
          </div>`).join("")}
        </div>

        <p style="color:#4b5563;font-size:11px;margin:20px 0 0;text-align:center;line-height:1.6;">
          O link acima é de uso único e expira em 24 horas.<br/>
          Caso tenha dúvidas, entre em contato com nossa equipe de suporte.
        </p>
      </div>
    </div>

    <p style="text-align:center;color:#374151;font-size:11px;margin-top:20px;">
      Oz.Barber · <strong style="color:#4db8ff;">OzTech SmartControl</strong>
    </p>
  </div>
</body>
</html>`;

    const mailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    `Oz.Barber <${FROM_EMAIL}>`,
        to:      [normalizedEmail],
        subject: "🎉 Seu acesso cortesia ao Oz.Barber está pronto",
        html,
      }),
    });

    const mailData = await mailRes.json();
    if (!mailRes.ok) throw new Error(mailData?.message ?? "Erro ao enviar e-mail.");

    console.log(`[send-courtesy-invite] E-mail enviado para ${normalizedEmail}`);
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[send-courtesy-invite]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
