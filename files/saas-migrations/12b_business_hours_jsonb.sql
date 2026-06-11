-- ══════════════════════════════════════════════════════════════════════════
-- Migration 12b: Converter business_hours de TEXT para JSONB
--                + atualizar oz_update_barbershop_branding
-- ══════════════════════════════════════════════════════════════════════════
--
-- A coluna business_hours foi criada como TEXT na migration 12.
-- Nenhum dado foi salvo ainda (campo novo). Convertemos para JSONB para
-- armazenar horários estruturados por dia da semana:
--   { "sunday": { "open": "09:00", "close": "18:00", "enabled": false }, ... }
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Converter coluna para JSONB ───────────────────────────────────────

ALTER TABLE public.barbershops
  ALTER COLUMN business_hours TYPE jsonb
  USING CASE
    WHEN business_hours IS NULL THEN NULL
    WHEN business_hours ~ '^\s*\{' THEN business_hours::jsonb
    ELSE NULL
  END;


-- ── 2. Atualizar a função RPC para aceitar jsonb ──────────────────────────
-- Remove todas as sobrecargas existentes antes de recriar.

DO $$
DECLARE
  func_sig text;
BEGIN
  FOR func_sig IN
    SELECT oid::regprocedure::text
    FROM pg_proc
    WHERE proname = 'oz_update_barbershop_branding'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func_sig);
    RAISE NOTICE 'Removida sobrecarga: %', func_sig;
  END LOOP;
END $$;

CREATE FUNCTION public.oz_update_barbershop_branding(
  p_barbershop_id  uuid,
  p_name           text   DEFAULT NULL,
  p_phone          text   DEFAULT NULL,
  p_address        text   DEFAULT NULL,
  p_whatsapp       text   DEFAULT NULL,
  p_accent_color   text   DEFAULT NULL,
  p_logo_url       text   DEFAULT NULL,
  p_business_hours jsonb  DEFAULT NULL
)
RETURNS public.barbershops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.barbershops;
BEGIN
  UPDATE public.barbershops
  SET
    name           = COALESCE(p_name, name),
    phone          = p_phone,
    address        = p_address,
    whatsapp       = p_whatsapp,
    accent_color   = COALESCE(p_accent_color, accent_color),
    logo_url       = COALESCE(p_logo_url, logo_url),
    business_hours = p_business_hours
  WHERE id = p_barbershop_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.oz_update_barbershop_branding TO authenticated;


-- ── Verificação ──────────────────────────────────────────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'barbershops'
--   AND column_name = 'business_hours';
-- Deve retornar: jsonb
