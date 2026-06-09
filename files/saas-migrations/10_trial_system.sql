-- ================================================================
-- Migration 10: Sistema de Teste Grátis por 7 Dias (Trial)
-- Executar no Supabase SQL Editor
-- ⚠️  CRITICAL SAFETY: Nunca tocar em dados de clientes pagantes
-- ================================================================

-- ── 1. Novas colunas na tabela barbershops ────────────────────────
-- status: ciclo de vida da barbearia
--   'trial'    → em teste (primeiros 7 dias)
--   'active'   → assinatura ou cortesia ativa
--   'expired'  → trial ou assinatura expirada (sem acesso)
--   'inactive' → conta inativa manualmente
--   'deleted'  → soft delete aguardando purge definitivo
ALTER TABLE barbershops
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Validação de valores permitidos (só adicionamos se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'barbershops'
      AND constraint_name = 'barbershops_status_check'
  ) THEN
    ALTER TABLE barbershops
      ADD CONSTRAINT barbershops_status_check
      CHECK (status IN ('trial','active','expired','inactive','deleted'));
  END IF;
END;
$$;

-- trial_started_at: quando o trial foi iniciado
ALTER TABLE barbershops
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- source: como o usuário chegou até o Oz.Barber
ALTER TABLE barbershops
  ADD COLUMN IF NOT EXISTS source TEXT;

-- ── 2. Tabela de auditoria de deleções (LGPD compliance) ──────────
-- Registra TODA remoção de dados antes de executar.
-- Permite rastrear o que foi deletado e quando.
CREATE TABLE IF NOT EXISTS deletion_audit (
  id             BIGSERIAL    PRIMARY KEY,
  barbershop_id  UUID         NOT NULL,
  action         TEXT         NOT NULL,
  -- 'mark_expired'  → trial expirado (status=expired)
  -- 'soft_delete'   → dados anonimizados após 30 dias pós-expiry
  -- 'hard_delete'   → remoção definitiva após 60 dias pós-expiry
  -- 'manual_delete' → deleção manual pelo super admin
  barbershop_name TEXT,
  admin_email    TEXT,
  trial_started  TIMESTAMPTZ,
  expired_at     TIMESTAMPTZ,
  metadata       JSONB        DEFAULT '{}',
  executed_by    TEXT         DEFAULT 'system',
  executed_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── 3. Configurações do sistema (kill switch para cleanup) ────────
CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT  PRIMARY KEY,
  value      TEXT  NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores padrão para controle da automação de limpeza
INSERT INTO system_settings (key, value) VALUES
  ('trial_cleanup_enabled',         'true'),   -- kill switch global
  ('trial_soft_delete_after_days',  '30'),     -- dias pós-expiry para anonimizar
  ('trial_hard_delete_after_days',  '60'),     -- dias pós-expiry para deletar
  ('trial_max_deletions_per_run',   '10'),     -- máximo de deleções por execução (segurança)
  ('trial_duration_days',           '7')       -- duração do período de teste
ON CONFLICT (key) DO NOTHING;

-- ── 4. Índices para performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_barbershops_status
  ON barbershops(status);

CREATE INDEX IF NOT EXISTS idx_barbershops_trial
  ON barbershops(trial_started_at)
  WHERE trial_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deletion_audit_shop
  ON deletion_audit(barbershop_id, executed_at);

-- ── 5. Função: current_user_access_status() ───────────────────────
-- SUBSTITUI a versão anterior. Adiciona suporte completo a trial.
-- Retorna jsonb com has_access, reason, plan, expires_at
-- Razões possíveis:
--   has_access=true:  'courtesy', 'trial_active', 'subscription'
--   has_access=false: 'no_barbershop', 'trial_expired', 'courtesy_revoked',
--                     'no_active_access', 'account_inactive'
CREATE OR REPLACE FUNCTION current_user_access_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_user_email    TEXT;
  v_barbershop_id UUID;
  v_plan          TEXT;
  v_plan_expires  TIMESTAMPTZ;
  v_trial_start   TIMESTAMPTZ;
  v_bs_status     TEXT;
  v_courtesy_row  RECORD;
  v_sub_row       RECORD;
  v_days_left     NUMERIC;
  v_trial_days    INT;
BEGIN
  v_user_id    := auth.uid();
  v_user_email := (SELECT email FROM auth.users WHERE id = v_user_id);

  -- ① Barbershop do perfil
  SELECT barbershop_id INTO v_barbershop_id
    FROM profiles WHERE id = v_user_id;

  IF v_barbershop_id IS NULL THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'no_barbershop');
  END IF;

  -- ② Dados da barbearia
  SELECT plan, plan_expires_at, trial_started_at, status
    INTO v_plan, v_plan_expires, v_trial_start, v_bs_status
    FROM barbershops WHERE id = v_barbershop_id;

  -- ③ Conta inativa ou deletada → bloqueia imediatamente
  IF v_bs_status IN ('inactive', 'deleted') THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason',     'account_inactive',
      'plan',       v_plan
    );
  END IF;

  -- ④ Cortesia ativa (verificada por e-mail)
  SELECT * INTO v_courtesy_row
    FROM courtesy_access
    WHERE granted_to_email = v_user_email
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

  IF v_courtesy_row IS NOT NULL THEN
    RETURN jsonb_build_object(
      'has_access',  true,
      'reason',      'courtesy',
      'plan',        'courtesy',
      'expires_at',  v_courtesy_row.expires_at
    );
  END IF;

  -- ⑤ Trial ativo (7 dias)
  IF v_plan = 'trial' AND v_trial_start IS NOT NULL THEN
    -- Lê a duração configurável (padrão: 7 dias)
    SELECT COALESCE(value::int, 7) INTO v_trial_days
      FROM system_settings WHERE key = 'trial_duration_days';
    v_trial_days := COALESCE(v_trial_days, 7);

    IF v_bs_status = 'trial' AND NOW() < v_trial_start + (v_trial_days || ' days')::INTERVAL THEN
      v_days_left := EXTRACT(EPOCH FROM (v_trial_start + (v_trial_days || ' days')::INTERVAL - NOW())) / 86400;
      RETURN jsonb_build_object(
        'has_access',       true,
        'reason',           'trial_active',
        'plan',             'trial',
        'trial_started_at', v_trial_start,
        'trial_days_left',  ROUND(v_days_left::numeric, 1),
        'expires_at',       v_trial_start + (v_trial_days || ' days')::INTERVAL
      );
    ELSE
      -- Trial expirado: atualiza status automaticamente
      IF v_bs_status = 'trial' THEN
        UPDATE barbershops SET status = 'expired' WHERE id = v_barbershop_id;
        INSERT INTO deletion_audit (barbershop_id, action, barbershop_name, admin_email, trial_started, expired_at, executed_by)
          SELECT v_barbershop_id, 'mark_expired', name, v_user_email, v_trial_start, NOW(), 'auto_on_login'
            FROM barbershops WHERE id = v_barbershop_id;
      END IF;
      RETURN jsonb_build_object(
        'has_access',  false,
        'reason',      'trial_expired',
        'plan',        'trial',
        'expires_at',  v_trial_start + (v_trial_days || ' days')::INTERVAL
      );
    END IF;
  END IF;

  -- ⑥ Assinatura ativa
  SELECT * INTO v_sub_row
    FROM subscriptions
    WHERE barbershop_id = v_barbershop_id
      AND status        = 'active'
      AND expires_at    > NOW()
    ORDER BY expires_at DESC
    LIMIT 1;

  IF v_sub_row IS NOT NULL THEN
    RETURN jsonb_build_object(
      'has_access',  true,
      'reason',      'subscription',
      'plan',        v_plan,
      'expires_at',  v_sub_row.expires_at
    );
  END IF;

  -- ⑦ Sem acesso — verifica se a cortesia foi revogada
  SELECT * INTO v_courtesy_row
    FROM courtesy_access
    WHERE granted_to_email = v_user_email
      AND status = 'revoked'
    LIMIT 1;

  IF v_courtesy_row IS NOT NULL THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'courtesy_revoked');
  END IF;

  -- ⑧ Sem acesso válido
  RETURN jsonb_build_object(
    'has_access',  false,
    'reason',      'no_active_access',
    'plan',        v_plan,
    'expires_at',  v_plan_expires
  );
END;
$$;

GRANT EXECUTE ON FUNCTION current_user_access_status() TO authenticated;

-- ── 6. Cron job: marca trials expirados diariamente ───────────────
-- Executa às 03:00 BRT (06:00 UTC) todo dia
-- Somente atualiza status; dados NÃO são deletados aqui.
SELECT cron.schedule(
  'mark-expired-trials',
  '0 6 * * *',
  $$
  UPDATE barbershops
     SET status = 'expired'
   WHERE plan = 'trial'
     AND status = 'trial'
     AND trial_started_at IS NOT NULL
     AND NOW() > trial_started_at + (
       COALESCE((SELECT value::int FROM system_settings WHERE key = 'trial_duration_days'), 7) || ' days'
     )::INTERVAL;
  $$
);

-- ── 7. Edge Function trial-cleanup chamada diariamente via pg_cron ─
-- Soft-delete após 30 dias pós-expiry, hard-delete após 60 dias.
-- Cron job registrado APÓS fazer deploy da Edge Function trial-cleanup.
-- Descomentar e executar quando a Edge Function estiver no ar:
/*
SELECT cron.schedule(
  'trial-cleanup-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://kqjzontxfwlwmvbddbnv.supabase.co/functions/v1/trial-cleanup',
    headers := '{"Content-Type":"application/json"}',
    body    := '{}'
  ) AS request_id;
  $$
);
*/

-- ================================================================
-- VERIFICAÇÃO FINAL:
--
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'barbershops'
--   AND column_name IN ('status','trial_started_at','source');
--
-- SELECT * FROM system_settings;
--
-- SELECT routine_name FROM information_schema.routines
--   WHERE routine_name = 'current_user_access_status';
--
-- SELECT jobname FROM cron.job WHERE jobname = 'mark-expired-trials';
-- ================================================================
