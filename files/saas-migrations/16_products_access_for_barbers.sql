-- ══════════════════════════════════════════════════════════════════════════
-- Migration 16: Barbeiros podem ler e vender produtos em atendimentos
-- ══════════════════════════════════════════════════════════════════════════
--
-- Problema: barbeiros não veem a opção "Adicionar Produto" no formulário de
-- Novo Atendimento. Causa: a política de RLS de SELECT em `products`
-- provavelmente está restrita a role='admin', então a query do app retorna
-- 0 linhas para barbeiros (sem erro — RLS apenas filtra silenciosamente).
--
-- Isso é INTENCIONAL para a tela de gestão de Produtos (menu "Produtos" é
-- admin-only, conforme CLAUDE.md), mas a mesma tabela é usada no formulário
-- de atendimento, que TAMBÉM deve funcionar para barbeiros.
--
-- Esta migration ADICIONA duas políticas novas (não remove nem altera as
-- existentes — políticas do mesmo comando são combinadas com OR no Postgres):
--   1. SELECT — qualquer usuário autenticado da mesma barbearia (admin ou
--      barbeiro) pode listar produtos, para escolher no atendimento.
--   2. UPDATE — qualquer usuário autenticado da mesma barbearia pode
--      atualizar produtos (necessário para a baixa de estoque automática
--      quando um barbeiro vende um produto num atendimento).
--
-- A tela de gestão de Produtos (criar/editar/excluir produto) continua
-- inacessível para barbeiros porque o MENU não exibe essa opção para eles
-- (controle de UI em App.jsx) — esta migration não muda isso.
-- ══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "products_select_same_shop" ON products;
CREATE POLICY "products_select_same_shop"
  ON products
  FOR SELECT
  TO authenticated
  USING (barbershop_id = my_barbershop_id());

DROP POLICY IF EXISTS "products_update_same_shop" ON products;
CREATE POLICY "products_update_same_shop"
  ON products
  FOR UPDATE
  TO authenticated
  USING (barbershop_id = my_barbershop_id())
  WITH CHECK (barbershop_id = my_barbershop_id());

-- ── Verificação ───────────────────────────────────────────────────────────
-- Logado como barbeiro (não admin), na mesma barbearia que tem produto
-- ativo com stock_current > 0:
--   SELECT * FROM products WHERE barbershop_id = '<sua_barbershop_id>';
--   → deve retornar as linhas (antes retornava 0)
--
-- No app: abrir "Novo Atendimento" como barbeiro → seção "Adicionar Produto
-- (opcional)" deve aparecer normalmente, igual ao admin.
