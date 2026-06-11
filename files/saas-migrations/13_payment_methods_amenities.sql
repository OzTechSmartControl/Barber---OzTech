-- ══════════════════════════════════════════════════════════════════════════
-- Migration 13: Adicionar payment_methods e amenities à tabela barbershops
--               + atualizar oz_update_barbershop_branding
-- ══════════════════════════════════════════════════════════════════════════
--
-- Estrutura das colunas JSONB:
--   payment_methods: ["pix", "credito", "debito", "dinheiro", ...]
--   amenities:       ["wifi", "estacionamento", "acessivel", ...]
--
-- Impacto zero em clientes existentes — campos opcionais (DEFAULT NULL).
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Colunas ───────────────────────────────────────────────────────────

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amenities       jsonb DEFAULT NULL;


-- ── 2. Recriar oz_update_barbershop_branding com novos campos ────────────

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
  p_barbershop_id   uuid,
  p_name            text   DEFAULT NULL,
  p_phone           text   DEFAULT NULL,
  p_address         text   DEFAULT NULL,
  p_whatsapp        text   DEFAULT NULL,
  p_accent_color    text   DEFAULT NULL,
  p_logo_url        text   DEFAULT NULL,
  p_business_hours  jsonb  DEFAULT NULL,
  p_payment_methods jsonb  DEFAULT NULL,
  p_amenities       jsonb  DEFAULT NULL
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
    name             = COALESCE(p_name, name),
    phone            = p_phone,
    address          = p_address,
    whatsapp         = p_whatsapp,
    accent_color     = COALESCE(p_accent_color, accent_color),
    logo_url         = COALESCE(p_logo_url, logo_url),
    business_hours   = p_business_hours,
    payment_methods  = p_payment_methods,
    amenities        = p_amenities
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
--   AND column_name IN ('payment_methods', 'amenities');
-- Deve retornar: jsonb, jsonb
