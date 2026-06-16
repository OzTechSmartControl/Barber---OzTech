-- ================================================================
-- Migration 12: RPC superadmin_list_trials
-- Retorna todas as contas trial com dados do responsável (email, nome, WhatsApp, source)
-- Executar no Supabase SQL Editor
-- ================================================================

CREATE OR REPLACE FUNCTION superadmin_list_trials()
RETURNS TABLE (
  barbershop_id    UUID,
  barbershop_name  TEXT,
  phone            TEXT,
  source           TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at    TIMESTAMPTZ,
  status           TEXT,
  days_elapsed     NUMERIC,
  days_remaining   NUMERIC,
  admin_id         UUID,
  admin_email      TEXT,
  admin_name       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_duration INT;
BEGIN
  SELECT COALESCE(value::int, 7) INTO trial_duration
    FROM system_settings WHERE key = 'trial_duration_days';
  trial_duration := COALESCE(trial_duration, 7);

  RETURN QUERY
  SELECT
    b.id                                                                              AS barbershop_id,
    b.name                                                                            AS barbershop_name,
    b.phone,
    b.source,
    b.trial_started_at,
    b.trial_started_at + (trial_duration || ' days')::INTERVAL                        AS trial_ends_at,
    b.status,
    ROUND(EXTRACT(EPOCH FROM (NOW() - b.trial_started_at)) / 86400, 1)::NUMERIC      AS days_elapsed,
    GREATEST(
      0,
      ROUND((trial_duration - EXTRACT(EPOCH FROM (NOW() - b.trial_started_at)) / 86400)::NUMERIC, 1)
    )                                                                                  AS days_remaining,
    p.id                                                                              AS admin_id,
    u.email::TEXT                                                                     AS admin_email,
    (u.raw_user_meta_data->>'full_name')::TEXT                                        AS admin_name
  FROM barbershops b
  LEFT JOIN profiles p ON p.barbershop_id = b.id AND p.role = 'admin'
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE b.plan = 'trial'
  ORDER BY b.trial_started_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_list_trials() TO authenticated;

-- Verificação:
-- SELECT * FROM superadmin_list_trials();
