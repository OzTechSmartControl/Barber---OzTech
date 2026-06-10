-- ══════════════════════════════════════════════════════════════════════════
-- Migration 11: Secure superadmin views against unauthorized access
-- ══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: As 7 views superadmin_* são SECURITY DEFINER (rodam como postgres,
-- ignorando RLS). Qualquer usuário autenticado pode consultá-las diretamente
-- via REST API e ver dados de todas as barbearias.
--
-- SOLUÇÃO: Recriar cada view com um WHERE que verifica se o usuário é
-- super admin. Usuários comuns recebem 0 linhas. Super admins recebem tudo.
-- A view continua SECURITY DEFINER (necessário para ver dados cross-tenant).
-- O app não precisa de nenhuma alteração.
--
-- SEGURANÇA MANTIDA:
--   ✅ Super admins: acesso total (sem mudança)
--   ✅ Admins de barbearia: 0 linhas (bloqueado)
--   ✅ Barbeiros: 0 linhas (bloqueado)
--   ✅ Anon: acesso bloqueado (REVOKE)
--   ✅ Trial accounts: não afetado (não são super admins)
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Função helper de verificação ──────────────────────────────────────
-- SECURITY DEFINER para garantir acesso à tabela profiles mesmo com RLS.
-- Retorna true somente se o usuário autenticado é super admin.

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT is_super_admin = true OR role = 'super_admin'
      FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;

-- Grant de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;


-- ── 2. Recriar as 7 views com o filtro de segurança ───────────────────────
-- Usa pg_get_viewdef() para obter a definição atual e recriar com WHERE.
-- Robusto: cada view é tratada independentemente com EXCEPTION para não
-- bloquear o restante caso uma não exista.

DO $$
DECLARE
  v_names text[] := ARRAY[
    'superadmin_saas_overview',
    'superadmin_dashboard_kpis',
    'superadmin_customer_growth',
    'superadmin_revenue_growth',
    'superadmin_plan_distribution',
    'superadmin_alerts',
    'superadmin_courtesy_access_overview'
  ];
  v_name  text;
  v_def   text;
BEGIN
  FOREACH v_name IN ARRAY v_names LOOP
    BEGIN
      -- Obtém definição atual (apenas a parte SELECT, sem CREATE VIEW)
      SELECT pg_get_viewdef(('public.' || v_name)::regclass, true)
      INTO v_def;

      IF v_def IS NULL OR v_def = '' THEN
        RAISE WARNING '[11_secure_superadmin_views] View não encontrada, ignorando: %', v_name;
        CONTINUE;
      END IF;

      -- Remove view existente
      EXECUTE format('DROP VIEW IF EXISTS public.%I', v_name);

      -- Recria envolvendo com filtro de super admin
      EXECUTE format(
        'CREATE VIEW public.%I AS
         SELECT * FROM (%s) _secure_wrapper
         WHERE public.is_current_user_super_admin()',
        v_name,
        v_def
      );

      RAISE NOTICE '[11_secure_superadmin_views] View protegida: %', v_name;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[11_secure_superadmin_views] Falha ao proteger %: %', v_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- ── 3. Revogar acesso anônimo ─────────────────────────────────────────────
-- Usuários não autenticados não devem conseguir nem chamar a view.

REVOKE SELECT ON public.superadmin_saas_overview            FROM anon;
REVOKE SELECT ON public.superadmin_dashboard_kpis           FROM anon;
REVOKE SELECT ON public.superadmin_customer_growth          FROM anon;
REVOKE SELECT ON public.superadmin_revenue_growth           FROM anon;
REVOKE SELECT ON public.superadmin_plan_distribution        FROM anon;
REVOKE SELECT ON public.superadmin_alerts                   FROM anon;
REVOKE SELECT ON public.superadmin_courtesy_access_overview FROM anon;


-- ── 4. Verificação ───────────────────────────────────────────────────────
-- Execute esta query para confirmar que as views foram protegidas:
--
-- SELECT viewname, definition
-- FROM pg_views
-- WHERE schemaname = 'public'
--   AND viewname LIKE 'superadmin_%'
-- ORDER BY viewname;
--
-- Cada view deve conter "is_current_user_super_admin()" na definição.
