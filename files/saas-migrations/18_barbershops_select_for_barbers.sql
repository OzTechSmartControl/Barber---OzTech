-- ══════════════════════════════════════════════════════════════════════════
-- Migration 18: Barbeiro vê o nome/logo/tema da própria barbearia
-- ══════════════════════════════════════════════════════════════════════════
--
-- Mesmo padrão de bug da migration 16 (products): a política de RLS de
-- SELECT em `barbershops` provavelmente está restrita a role='admin'. Isso
-- bloqueia silenciosamente (sem erro) a query que busca nome/logo/cor da
-- barbearia quando quem está logado é barbeiro — o app cai no fallback
-- "OZ.BARBER / AMBIENTE PRIVADO" em vez de mostrar o nome real (ex: "Santo
-- André") e o logo da barbearia.
--
-- Esta migration ADICIONA uma política nova (não remove nem altera a
-- existente — políticas do mesmo comando são combinadas com OR no Postgres):
--   SELECT — qualquer usuário autenticado (admin ou barbeiro) pode ler os
--   dados da própria barbearia (id = my_barbershop_id()).
--
-- Não adiciona UPDATE: a tela de Configurações continua admin-only, tanto
-- por controle de UI (App.jsx) quanto porque barbeiro não precisa escrever
-- nessa tabela — só ler nome/logo/cor para exibir no sidebar.
-- ══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "barbershops_select_same_shop" ON barbershops;
CREATE POLICY "barbershops_select_same_shop"
  ON barbershops
  FOR SELECT
  TO authenticated
  USING (id = my_barbershop_id());

-- ── Verificação ───────────────────────────────────────────────────────────
-- Logado como barbeiro (não admin):
--   SELECT * FROM barbershops WHERE id = '<barbershop_id_da_sua_barbearia>';
--   → deve retornar 1 linha (antes retornava 0)
--
-- No app: logar como barbeiro → sidebar deve mostrar o nome real e logo da
-- barbearia, não mais "OZ.BARBER / AMBIENTE PRIVADO".
