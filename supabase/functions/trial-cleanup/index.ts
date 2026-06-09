// Edge Function: trial-cleanup
// Automação de limpeza de contas trial expiradas.
// Chamada diariamente pelo pg_cron via net.http_post.
//
// ⚠️  CRITICAL SAFETY — 4 camadas de proteção antes de qualquer deleção:
//   1. status = 'expired'  (nunca 'active', 'trial', etc.)
//   2. plan   = 'trial'    (nunca planos pagos)
//   3. Nenhuma assinatura ativa no histórico (subscriptions)
//   4. Nenhum pagamento confirmado (payment_checkouts)
//
// Fases:
//   - Soft-delete: após 30 dias pós-expiry (anonimiza dados, não deleta)
//   - Hard-delete: após 60 dias pós-expiry (remove definitivamente)
//   - Máximo de 10 deleções por execução (evita acidentes em cascata)

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Segredo interno para evitar chamadas externas não autorizadas.
// Configure em: Supabase → Edge Functions → trial-cleanup → Secrets → CLEANUP_SECRET
// E passe o mesmo valor no cron job: headers → {"x-cleanup-secret":"<valor>"}
const CLEANUP_SECRET  = Deno.env.get("CLEANUP_SECRET")            ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
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
  }).then(r => r.json());

// Verifica 4 camadas de segurança antes de qualquer ação destrutiva
async function isSafeToDelete(barbershopId: string): Promise<{ safe: boolean; reason: string }> {
  // Camada 1+2: status='expired' e plan='trial'
  const [shop] = await db(`barbershops?id=eq.${barbershopId}&select=status,plan&limit=1`) as any[];
  if (!shop) return { safe: false, reason: "barbershop_not_found" };
  if (shop.status !== "expired")  return { safe: false, reason: `status_is_${shop.status}` };
  if (shop.plan   !== "trial")    return { safe: false, reason: `plan_is_${shop.plan}` };

  // Camada 3: nenhuma assinatura ativa
  const subs = await db(`subscriptions?barbershop_id=eq.${barbershopId}&status=eq.active&limit=1`) as any[];
  if (Array.isArray(subs) && subs.length > 0) {
    return { safe: false, reason: "has_active_subscription" };
  }

  // Camada 4: nenhum checkout pago (histórico de pagamento)
  const payments = await db(
    `payment_checkouts?barbershop_id=eq.${barbershopId}&status=eq.paid&limit=1`
  ) as any[];
  if (Array.isArray(payments) && payments.length > 0) {
    return { safe: false, reason: "has_payment_history" };
  }

  return { safe: true, reason: "all_checks_passed" };
}

// Registra na tabela deletion_audit antes de qualquer ação
async function auditLog(
  barbershopId: string,
  action: string,
  shopName: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db("deletion_audit", {
      method: "POST",
      body: JSON.stringify({
        barbershop_id:   barbershopId,
        action,
        barbershop_name: shopName,
        metadata,
        executed_by:     "trial-cleanup-edge-function",
        executed_at:     new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("[trial-cleanup] Falha ao registrar audit log:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  // ── Verificação de segredo interno ────────────────────────────
  // Rejeita chamadas sem o header correto (protege contra execução externa).
  // O pg_cron deve enviar: headers → {"x-cleanup-secret":"<CLEANUP_SECRET>"}
  if (CLEANUP_SECRET) {
    const incoming = req.headers.get("x-cleanup-secret") ?? "";
    if (incoming !== CLEANUP_SECRET) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  }

  const report: Record<string, unknown> = {
    started_at: new Date().toISOString(),
    kill_switch: false,
    soft_deletes: 0,
    hard_deletes: 0,
    skipped: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // ── Kill switch global ─────────────────────────────────────────
    const [killSwitchSetting] = await db(
      "system_settings?key=eq.trial_cleanup_enabled&select=value&limit=1"
    ) as any[];

    if (!killSwitchSetting || killSwitchSetting.value !== "true") {
      report.kill_switch = true;
      return jsonResponse({ ...report, message: "Kill switch ativado. Limpeza ignorada." });
    }

    // ── Lê configurações ──────────────────────────────────────────
    const settings = await db("system_settings?select=key,value") as any[];
    const cfg: Record<string, number> = {};
    for (const s of (settings || [])) {
      cfg[s.key] = parseInt(s.value, 10);
    }

    const softDeleteDays = cfg["trial_soft_delete_after_days"] || 30;
    const hardDeleteDays = cfg["trial_hard_delete_after_days"] || 60;
    const maxPerRun      = cfg["trial_max_deletions_per_run"]  || 10;

    const now = new Date();
    let totalActions = 0;

    // ══════════════════════════════════════════════════════════════
    // FASE 1 — HARD DELETE
    // Trials expirados há mais de hardDeleteDays dias, já soft-deletados
    // ══════════════════════════════════════════════════════════════
    const hardCutoff = new Date(now.getTime() - hardDeleteDays * 86400000).toISOString();

    const hardCandidates = await db(
      `barbershops?status=eq.deleted&plan=eq.trial` +
      `&trial_started_at=lte.${hardCutoff}` +
      `&select=id,name,trial_started_at&order=trial_started_at.asc&limit=${maxPerRun}`
    ) as any[];

    for (const shop of (hardCandidates || [])) {
      if (totalActions >= maxPerRun) break;

      const safety = await isSafeToDelete(shop.id);
      if (!safety.safe) {
        (report.details as string[]).push(`SKIP hard-delete ${shop.id}: ${safety.reason}`);
        (report.skipped as number)++;
        continue;
      }

      try {
        await auditLog(shop.id, "hard_delete", shop.name, { trial_started: shop.trial_started_at, cutoff: hardCutoff });

        // Deleta dados na ordem correta (respeita foreign keys)
        await db(`appointments?barbershop_id=eq.${shop.id}`,       { method: "DELETE" });
        await db(`attendances?barbershop_id=eq.${shop.id}`,        { method: "DELETE" });
        await db(`clients?barbershop_id=eq.${shop.id}`,            { method: "DELETE" });
        await db(`expenses?barbershop_id=eq.${shop.id}`,           { method: "DELETE" });
        await db(`product_sales?barbershop_id=eq.${shop.id}`,      { method: "DELETE" });
        await db(`products?barbershop_id=eq.${shop.id}`,           { method: "DELETE" });
        await db(`services?barbershop_id=eq.${shop.id}`,           { method: "DELETE" });
        await db(`barber_availability?barbershop_id=eq.${shop.id}`, { method: "DELETE" });
        await db(`barbers?barbershop_id=eq.${shop.id}`,            { method: "DELETE" });

        // Deleta perfis (auth users ficam no Supabase Auth por 30 dias adicionais por padrão)
        const profiles = await db(
          `profiles?barbershop_id=eq.${shop.id}&select=id`
        ) as any[];
        for (const p of (profiles || [])) {
          await db(`profiles?id=eq.${p.id}`, { method: "DELETE" });
          // Deleta o auth user via Admin API
          try {
            await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${p.id}`, {
              method: "DELETE",
              headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
            });
          } catch {}
        }

        // Por último: deleta a barbearia
        await db(`barbershops?id=eq.${shop.id}`, { method: "DELETE" });

        (report.details as string[]).push(`✓ HARD DELETE: ${shop.name} (${shop.id})`);
        (report.hard_deletes as number)++;
        totalActions++;

        console.log(`[trial-cleanup] Hard-delete concluído: ${shop.id} (${shop.name})`);
      } catch (e) {
        (report.errors as number)++;
        console.error(`[trial-cleanup] Erro no hard-delete ${shop.id}:`, e);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // FASE 2 — SOFT DELETE (ANONIMIZAÇÃO)
    // Trials expirados há mais de softDeleteDays dias, status='expired'
    // ══════════════════════════════════════════════════════════════
    const softCutoff = new Date(now.getTime() - softDeleteDays * 86400000).toISOString();

    const softCandidates = await db(
      `barbershops?status=eq.expired&plan=eq.trial` +
      `&trial_started_at=lte.${softCutoff}` +
      `&select=id,name,trial_started_at&order=trial_started_at.asc&limit=${maxPerRun - totalActions}`
    ) as any[];

    for (const shop of (softCandidates || [])) {
      if (totalActions >= maxPerRun) break;

      const safety = await isSafeToDelete(shop.id);
      if (!safety.safe) {
        (report.details as string[]).push(`SKIP soft-delete ${shop.id}: ${safety.reason}`);
        (report.skipped as number)++;
        continue;
      }

      try {
        await auditLog(shop.id, "soft_delete", shop.name, { trial_started: shop.trial_started_at, cutoff: softCutoff });

        // Anonimiza clientes (LGPD: remove dados pessoais)
        await db(`clients?barbershop_id=eq.${shop.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name:      "[removido]",
            phone:     null,
            whatsapp:  null,
            email:     null,
            birthdate: null,
            notes:     null,
          }),
        });

        // Anonimiza agendamentos
        await db(`appointments?barbershop_id=eq.${shop.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            client_name:  "[removido]",
            client_phone: null,
            client_email: null,
            notes:        null,
          }),
        });

        // Marca a barbearia como 'deleted' (pronta para hard-delete)
        await db(`barbershops?id=eq.${shop.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "deleted" }),
        });

        (report.details as string[]).push(`✓ SOFT DELETE: ${shop.name} (${shop.id})`);
        (report.soft_deletes as number)++;
        totalActions++;

        console.log(`[trial-cleanup] Soft-delete concluído: ${shop.id} (${shop.name})`);
      } catch (e) {
        (report.errors as number)++;
        console.error(`[trial-cleanup] Erro no soft-delete ${shop.id}:`, e);
      }
    }

    report.finished_at  = new Date().toISOString();
    report.total_actions = totalActions;

    return jsonResponse(report);

  } catch (e) {
    console.error("[trial-cleanup] Erro crítico:", e);
    return jsonResponse({ ...report, critical_error: String(e) }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
