-- ══════════════════════════════════════════════════════════════════════════
-- Migration 14: Métricas de alcance para o Super Admin (usuários + atendimentos)
-- ══════════════════════════════════════════════════════════════════════════
--
-- Adiciona dois números agregados ao painel do Super Admin, sem expor
-- nenhuma linha individual de dado pessoal (nome, e-mail, telefone, etc.):
--
--   1. superadmin_reach_totals   → total de usuários (admin+barbeiro) e
--                                   total de atendimentos de toda a plataforma
--   2. superadmin_reach_by_shop  → nº de usuários (admin+barbeiro) por barbearia
--
-- Segue o mesmo padrão de segurança das migrations 11/11b/11c:
--   _internal.<view>  → dados brutos, schema NÃO exposto via REST API
--   public.<view>     → wrapper com security_invoker=on + filtro
--                        is_current_user_super_admin() — não-super-admin
--                        recebe 0 linhas
--
-- Não modifica nenhuma view existente (superadmin_dashboard_kpis,
-- superadmin_saas_overview etc.) — são views novas e totalmente independentes.
-- ══════════════════════════════════════════════════════════════════════════


-- ── 0. Garantir schema interno (idempotente, caso 11c ainda não tenha rodado)

CREATE SCHEMA IF NOT EXISTS _internal;
GRANT USAGE ON SCHEMA _internal TO authenticated;


-- ── 1. Views internas (dados brutos — apenas contagens, sem PII) ──────────

CREATE OR REPLACE VIEW _internal._priv_superadmin_reach_totals AS
SELECT
  (SELECT COUNT(*) FROM profiles    WHERE role IN ('admin', 'barber'))::BIGINT AS total_users,
  (SELECT COUNT(*) FROM attendances)::BIGINT                                   AS total_attendances;

CREATE OR REPLACE VIEW _internal._priv_superadmin_reach_by_shop AS
SELECT
  b.id   AS barbershop_id,
  b.name AS barbershop_name,
  COUNT(p.id) FILTER (WHERE p.role IN ('admin', 'barber'))::BIGINT AS users_count
FROM barbershops b
LEFT JOIN profiles p ON p.barbershop_id = b.id
GROUP BY b.id, b.name;

GRANT SELECT ON _internal._priv_superadmin_reach_totals  TO authenticated;
GRANT SELECT ON _internal._priv_superadmin_reach_by_shop  TO authenticated;


-- ── 2. Views públicas (wrapper seguro — só super admin vê linhas) ─────────

DROP VIEW IF EXISTS public.superadmin_reach_totals;
CREATE VIEW public.superadmin_reach_totals
WITH (security_invoker = on) AS
SELECT * FROM _internal._priv_superadmin_reach_totals
WHERE public.is_current_user_super_admin();

DROP VIEW IF EXISTS public.superadmin_reach_by_shop;
CREATE VIEW public.superadmin_reach_by_shop
WITH (security_invoker = on) AS
SELECT * FROM _internal._priv_superadmin_reach_by_shop
WHERE public.is_current_user_super_admin();

REVOKE SELECT ON public.superadmin_reach_totals  FROM anon;
REVOKE SELECT ON public.superadmin_reach_by_shop  FROM anon;

GRANT SELECT ON public.superadmin_reach_totals  TO authenticated;
GRANT SELECT ON public.superadmin_reach_by_shop  TO authenticated;


-- ── 3. Verificação ─────────────────────────────────────────────────────
-- Logado como super admin:
--   SELECT * FROM superadmin_reach_totals;    -- 1 linha: total_users, total_attendances
--   SELECT * FROM superadmin_reach_by_shop;    -- 1 linha por barbearia, com users_count
--
-- Logado como admin/barbeiro de uma barbearia (não super admin):
--   Ambas as consultas devem retornar 0 linhas.
