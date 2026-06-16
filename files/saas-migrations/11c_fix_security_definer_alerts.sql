-- ══════════════════════════════════════════════════════════════════════════
-- Migration 11c: Eliminar alertas "Security Definer View" do Supabase
-- ══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: As views wrapper criadas pela 11b ainda são owned pelo postgres,
-- portanto o Supabase Advisor continua flagiando-as como "Security Definer View".
--
-- SOLUÇÃO: Recriar as views wrapper públicas com "security_invoker = on",
-- o que faz com que rodem no contexto do usuário chamador (não do owner).
-- Para isso funcionar, as _priv_ views precisam estar num schema acessível
-- ao role "authenticated", mas esse schema NÃO deve ser exposto pela REST API.
--
-- ARQUITETURA:
--   _internal schema  (não exposto via REST API)
--     └── _priv_superadmin_xxx  ← dados brutos, owner=postgres (contorna RLS)
--
--   public schema     (exposto via REST API)
--     └── superadmin_xxx        ← wrapper com security_invoker=on + WHERE check
--
-- SEGURANÇA:
--   ✅ Super admins: acesso total via REST API (sem mudança)
--   ✅ Usuários comuns: 0 linhas via REST API (WHERE is_current_user_super_admin())
--   ✅ _internal views: não acessíveis via REST API (schema não exposto)
--   ✅ Alertas Supabase: eliminados (wrappers têm security_invoker=on)
-- ══════════════════════════════════════════════════════════════════════════


-- ── 1. Criar schema interno (não exposto pela REST API do Supabase) ───────

CREATE SCHEMA IF NOT EXISTS _internal;

-- Conceder uso do schema ao role authenticated
-- (necessário para que a view security_invoker possa acessar as _priv_ views)
GRANT USAGE ON SCHEMA _internal TO authenticated;


-- ── 2. Mover _priv_ views do public para _internal ────────────────────────

DO $$
DECLARE
  v_names text[] := ARRAY[
    'superadmin_saas_overview',
    'superadmin_dashboard_kpis',
    'superadmin_customer_growth',
    'superadmin_revenue_growth',
    'superadmin_plan_distribution',
    'superadmin_alerts',
    'superadmin_courtesy_access_overview',
    'superadmin_saas_metrics'
  ];
  v_name text;
  v_priv text;
BEGIN
  FOREACH v_name IN ARRAY v_names LOOP
    v_priv := '_priv_' || v_name;
    BEGIN

      IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = v_priv
      ) THEN
        -- Mover de public para _internal
        EXECUTE format('ALTER VIEW public.%I SET SCHEMA _internal', v_priv);
        RAISE NOTICE '[11c] Movida para _internal: %', v_priv;

      ELSIF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = '_internal' AND viewname = v_priv
      ) THEN
        RAISE NOTICE '[11c] Já está em _internal (re-execução): %', v_priv;

      ELSE
        RAISE WARNING '[11c] View não encontrada: %', v_priv;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[11c] Falha ao mover %: % [%]', v_priv, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $$;


-- ── 3. Conceder SELECT nas _internal views ao role authenticated ──────────
-- Necessário para que a view com security_invoker=on possa consultar _internal.
-- Não é explorável via REST API pois o schema _internal não é exposto.

GRANT SELECT ON ALL TABLES IN SCHEMA _internal TO authenticated;


-- ── 4. Recriar views wrapper públicas com security_invoker = on ───────────

DO $$
DECLARE
  v_names text[] := ARRAY[
    'superadmin_saas_overview',
    'superadmin_dashboard_kpis',
    'superadmin_customer_growth',
    'superadmin_revenue_growth',
    'superadmin_plan_distribution',
    'superadmin_alerts',
    'superadmin_courtesy_access_overview',
    'superadmin_saas_metrics'
  ];
  v_name text;
  v_priv text;
BEGIN
  FOREACH v_name IN ARRAY v_names LOOP
    v_priv := '_priv_' || v_name;
    BEGIN

      IF NOT EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = '_internal' AND viewname = v_priv
      ) THEN
        RAISE WARNING '[11c] _internal view não encontrada, pulando wrapper: %', v_name;
        CONTINUE;
      END IF;

      -- Remover wrapper anterior (sem security_invoker)
      EXECUTE format('DROP VIEW IF EXISTS public.%I', v_name);

      -- Criar wrapper com security_invoker = on (elimina o alerta do Supabase)
      EXECUTE format(
        'CREATE VIEW public.%I WITH (security_invoker = on) AS
         SELECT * FROM _internal.%I WHERE public.is_current_user_super_admin()',
        v_name,
        v_priv
      );

      -- Revogar acesso anônimo
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', v_name);

      RAISE NOTICE '[11c] ✅ Wrapper recriado com security_invoker: %', v_name;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[11c] ❌ Falha ao recriar wrapper %: % [%]',
        v_name, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $$;


-- ── 5. Verificação ───────────────────────────────────────────────────────
-- Após executar, rode para confirmar:
--
-- SELECT viewname, definition
-- FROM pg_views
-- WHERE schemaname = 'public'
--   AND viewname LIKE 'superadmin_%'
-- ORDER BY viewname;
--
-- Cada view deve conter "_internal._priv_" na definição.
-- Os alertas do Supabase Advisor devem desaparecer ou diminuir
-- (os remanescentes em _internal não são exploráveis via REST API).
