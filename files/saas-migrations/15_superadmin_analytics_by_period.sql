-- ══════════════════════════════════════════════════════════════════════════
-- Migration 15: Filtro por período para Analytics do Super Admin
-- ══════════════════════════════════════════════════════════════════════════
--
-- Cria a função RPC `superadmin_analytics_by_period(p_date_from, p_date_to)`.
--
-- Segurança:
--   SECURITY DEFINER  → executa com os privilégios do criador (postgres),
--                       bypassando RLS nas tabelas operacionais.
--   SET search_path   → previne search_path hijacking.
--   is_current_user_super_admin() → retorna 0 linhas para não-super-admins.
--
-- Retorna:
--   period_attendances  BIGINT  → atendimentos com `date` no intervalo
--   period_new_users    BIGINT  → profiles (admin/barber) criados no intervalo
--
-- Chamada via frontend:
--   supabase.rpc("superadmin_analytics_by_period", {
--     p_date_from: "2026-01-01",
--     p_date_to:   "2026-06-17"
--   })
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.superadmin_analytics_by_period(
  p_date_from DATE,
  p_date_to   DATE
)
RETURNS TABLE (
  period_attendances BIGINT,
  period_new_users   BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (
      SELECT COUNT(*)::BIGINT
      FROM attendances
      WHERE date >= p_date_from
        AND date <= p_date_to
    ) AS period_attendances,
    (
      SELECT COUNT(*)::BIGINT
      FROM profiles
      WHERE role IN ('admin', 'barber')
        AND created_at::date >= p_date_from
        AND created_at::date <= p_date_to
    ) AS period_new_users
  WHERE public.is_current_user_super_admin();
$$;

REVOKE ALL    ON FUNCTION public.superadmin_analytics_by_period(DATE, DATE) FROM PUBLIC;
REVOKE ALL    ON FUNCTION public.superadmin_analytics_by_period(DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.superadmin_analytics_by_period(DATE, DATE) TO authenticated;


-- ── Verificação ───────────────────────────────────────────────────────────
-- Logado como super admin:
--   SELECT * FROM superadmin_analytics_by_period('2026-01-01', '2026-06-17');
--   → 1 linha: period_attendances, period_new_users
--
-- Logado como admin/barbeiro (não super admin):
--   → 0 linhas (filtro is_current_user_super_admin retorna false)
