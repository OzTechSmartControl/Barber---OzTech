import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL     = "contato@oztechsmartcontrol.com.br";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const {
      client_name,
      client_email,
      barbershop_name,
      barbershop_logo,  // URL da logo (pode ser null)
      accent_color,     // cor da barbearia ex: "#f5c518"
      barber_name,
      services,
      scheduled_date,
      scheduled_time,
    } = await req.json();

    if (!client_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "sem e-mail do cliente" }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const color  = accent_color || "#4db8ff";
    const colorDim = `${color}22`;

    // Formata data no padrão brasileiro
    const dateFormatted = new Date(`${scheduled_date}T12:00:00`)
      .toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

    // Cabeçalho: logo da barbearia se disponível, senão nome em texto
    const logoHtml = (barbershop_logo && barbershop_logo !== "null")
      ? `<img src="${barbershop_logo}" alt="${barbershop_name}" style="max-height:64px;max-width:160px;width:auto;height:auto;border-radius:10px;display:block;margin:0 auto 10px;" />`
      : `<div style="width:56px;height:56px;border-radius:14px;background:${colorDim};border:2px solid ${color}44;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:26px;font-weight:900;color:${color};font-family:'Segoe UI',Arial,sans-serif;">${(barbershop_name||"B")[0].toUpperCase()}</div>`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#08090c;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">

    <!-- Header barbearia -->
    <div style="text-align:center;margin-bottom:24px;">
      ${logoHtml}
      <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">${barbershop_name}</div>
      <div style="font-size:11px;color:#4b5563;margin-top:3px;letter-spacing:0.5px;">Agendamento Online · Oz.Barber</div>
    </div>

    <!-- Card principal -->
    <div style="background:#13141a;border:1px solid #1e2030;border-radius:18px;overflow:hidden;">

      <!-- Barra de cor personalizada -->
      <div style="background:linear-gradient(135deg,${color},${color}aa);height:5px;"></div>

      <div style="padding:32px 28px;">
        <div style="font-size:24px;font-weight:900;color:#ffffff;margin-bottom:6px;">
          ✂️ Agendamento Confirmado!
        </div>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 28px;line-height:1.6;">
          Olá, <strong style="color:#e5e7eb;">${client_name || "cliente"}</strong>!
          Sua visita à <strong style="color:${color};">${barbershop_name}</strong> foi confirmada com sucesso.
        </p>

        <!-- Detalhes -->
        <div style="background:#0d0e14;border:1px solid #1e2030;border-radius:12px;padding:20px 22px;margin-bottom:24px;">

          <div style="margin-bottom:16px;display:flex;align-items:flex-start;gap:14px;">
            <span style="font-size:22px;line-height:1;">📅</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:3px;">Data</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;text-transform:capitalize;">${dateFormatted}</div>
            </div>
          </div>

          <div style="margin-bottom:16px;display:flex;align-items:flex-start;gap:14px;">
            <span style="font-size:22px;line-height:1;">🕐</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:3px;">Horário</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;">${scheduled_time}</div>
            </div>
          </div>

          <div style="margin-bottom:16px;display:flex;align-items:flex-start;gap:14px;">
            <span style="font-size:22px;line-height:1;">✂️</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:3px;">Serviço</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;">${services}</div>
            </div>
          </div>

          <div style="display:flex;align-items:flex-start;gap:14px;">
            <span style="font-size:22px;line-height:1;">👤</span>
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:3px;">Barbeiro</div>
              <div style="font-size:15px;color:#e5e7eb;font-weight:700;">${barber_name}</div>
            </div>
          </div>

        </div>

        <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.7;text-align:center;">
          Em caso de imprevisto, entre em contato diretamente com a barbearia<br>para cancelar ou reagendar com antecedência.
        </p>
      </div>

      <!-- Rodapé -->
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
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${barbershop_name} <${FROM_EMAIL}>`,
        to: [client_email],
        subject: `✂️ Agendamento confirmado — ${barbershop_name}`,
        html,
      }),
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData?.message ?? "Erro Resend");

    console.log("[notify-appointment] Enviado para:", client_email, "id:", resData.id);
    return new Response(JSON.stringify({ sent: true, messageId: resData.id }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[notify-appointment]", e);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
