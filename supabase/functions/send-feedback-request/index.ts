import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const GMAIL_USER  = Deno.env.get("GMAIL_USER")         ?? "";
const GMAIL_PASS  = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";
const SUPA_URL    = Deno.env.get("SUPABASE_URL")       ?? "";
const SUPA_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL     = "https://ozbarber.vercel.app";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = (path: string, opts: RequestInit = {}) =>
  fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey:        SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer:        "return=minimal",
      ...(opts.headers ?? {}),
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const {
      attendance_id,
      barbershop_id,
      barber_name,
      client_name,
      client_email,
    } = await req.json();

    if (!client_email) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "sem e-mail do cliente" }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Busca dados da barbearia
    const shopRes  = await db(`barbershops?id=eq.${barbershop_id}&select=name,accent_color,logo_url`);
    const shopData = await shopRes.json();
    const shop     = shopData[0] ?? { name: "Barbearia", accent_color: "#4db8ff", logo_url: null };

    // Gera token único
    const token = crypto.randomUUID();

    // Insere feedback_request no banco
    const ins = await db("feedback_requests", {
      method: "POST",
      body: JSON.stringify({
        token,
        barbershop_id,
        attendance_id:   attendance_id ?? null,
        barber_name:     barber_name   ?? null,
        client_name:     client_name   ?? null,
        client_email,
        barbershop_name: shop.name,
        logo_url:        shop.logo_url    ?? null,
        accent_color:    shop.accent_color ?? "#4db8ff",
      }),
    });

    if (!ins.ok) {
      const err = await ins.text();
      throw new Error(`Erro ao salvar feedback_request: ${err}`);
    }

    // Monta e-mail
    const feedbackUrl = `${APP_URL}/feedback?token=${token}`;
    const accent      = shop.accent_color || "#4db8ff";
    const starsHtml   = [1,2,3,4,5]
      .map(n => `<a href="${feedbackUrl}&rating=${n}" style="display:inline-block;margin:0 3px;text-decoration:none;font-size:38px;">⭐</a>`)
      .join("");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    await transporter.sendMail({
      from:    `"${shop.name}" <${GMAIL_USER}>`,
      to:      client_email,
      subject: `⭐ Como foi seu atendimento na ${shop.name}?`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      ${shop.logo_url ? `<img src="${shop.logo_url}" style="height:60px;object-fit:contain;margin-bottom:12px;" alt="${shop.name}"/>` : ""}
      <h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:1px;">${shop.name}</h1>
    </div>
    <div style="background:#1a1a1a;border-radius:16px;padding:32px 28px;border:1px solid #2a2a2a;">
      <h2 style="color:#fff;font-size:19px;margin:0 0 10px;">
        Olá${client_name ? `, ${client_name}` : ""}! 👋
      </h2>
      <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Seu atendimento${barber_name ? ` com <strong style="color:#fff">${barber_name}</strong>` : ""} foi finalizado.
        Sua opinião é muito importante para continuarmos melhorando!
      </p>
      <p style="color:#aaa;font-size:14px;margin:0 0 16px;text-align:center;">
        Clique nas estrelas para avaliar:
      </p>
      <div style="text-align:center;margin-bottom:24px;">${starsHtml}</div>
      <div style="text-align:center;">
        <a href="${feedbackUrl}"
           style="display:inline-block;background:${accent};color:#000;font-weight:700;
                  font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">
          Avaliar Atendimento
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#444;font-size:11px;margin-top:20px;">
      Powered by <strong style="color:#666">Oz.Barber</strong>
    </p>
  </div>
</body>
</html>`,
    });

    console.log(`[send-feedback-request] E-mail enviado para ${client_email}, token: ${token}`);
    return new Response(
      JSON.stringify({ ok: true, token }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[send-feedback-request]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
