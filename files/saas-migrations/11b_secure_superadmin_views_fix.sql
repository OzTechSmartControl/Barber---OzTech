-- ══════════════════════════════════════════════════════════════════════════
-- Migration 11b: Secure superadmin views (abordagem rename + wrapper)
-- ══════════════════════════════════════════════════════════════════════════
--
-- A migration 11 falhou silenciosamente porque views com CTEs (WITH clause)
-- não podem ser embutidas como subquery no formato:
--   SELECT * FROM (WITH cte AS (...) SELECT ...) wrapper WHERE ...
--
-- Esta migration usa uma abordagem diferente e garantida:
--   1. Renomeia a view original para _priv_superadmin_xxx
--   2. Revoga acesso direto à _priv_ de anon/authenticated
--   3. Cria view pública superadmin_xxx como wrapper com filtro de segurança
--
-- O resultado é idêntico em termos de API — a view superadmin_xxx continua
-- acessível, mas retorna 0 linhas para qualquer usuário que não seja super admin.
--
-- SEGURANÇA:
--   ✅ Super admins: acesso total (sem mudança)
--   ✅ Admins de barbearia: 0 linhas
--   ✅ Barbeiros: 0 linhas
--   ✅ Anon: REVOKE aplicado
--   ✅ Trial accounts: não afetado (não são super admins)
-- ══════════════════════════════════════════════════════════════════════════


-- ── 0. Garantir que a função helper existe ───────────────────────────────

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin = true OR role = 'super_admin'
     FROM profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;


-- ── 1. Renomear views originais e criar wrappers de segurança ────────────

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
      -- Se a view pública não existe, pular
      IF NOT EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = v_name
      ) THEN
        RAISE WARNING '[11b] View não encontrada, ignorando: %', v_name;
        CONTINUE;
      END IF;

      -- Se já existe uma _priv_ de execução anterior, remover primeiro
      IF EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = v_priv
      ) THEN
        EXECUTE format('DROP VIEW IF EXISTS public.%I', v_priv);
        RAISE NOTICE '[11b] _priv_ anterior removida: %', v_priv;
      END IF;

      -- Renomear view original para _priv_xxx (preserva definição e owner)
      EXECUTE format('ALTER VIEW public.%I RENAME TO %I', v_name, v_priv);

      -- Revogar acesso direto à _priv_ — só o owner (postgres) pode acessá-la
      EXECUTE format(
        'REVOKE SELECT ON public.%I FROM anon, authenticated',
        v_priv
      );

      -- Criar view wrapper pública com filtro de super admin
      EXECUTE format(
        'CREATE VIEW public.%I AS
         SELECT * FROM public.%I WHERE public.is_current_user_super_admin()',
        v_name,
        v_priv
      );

      -- Revogar acesso anônimo à view wrapper
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', v_name);

      RAISE NOTICE '[11b] ✅ View protegida com sucesso: %', v_name;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[11b] ❌ FALHA ao proteger %: % [SQLSTATE: %]',
        v_name, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $$;


-- ── 2. Verificação ───────────────────────────────────────────────────────
-- Após executar, rode para confirmar:
--
-- SELECT viewname, definition
-- FROM pg_views
-- WHERE schemaname = 'public'
--   AND viewname LIKE 'superadmin_%'
--   AND viewname NOT LIKE '_priv_%'
-- ORDER BY viewname;
--
-- Cada view wrapper deve conter "is_current_user_super_admin()" na definição.
-- As views _priv_ originais devem existir mas sem acesso para anon/authenticated.
