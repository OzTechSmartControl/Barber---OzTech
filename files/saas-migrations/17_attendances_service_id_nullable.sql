-- ══════════════════════════════════════════════════════════════════════════
-- Migration 17: Permite atendimento somente com produto (sem serviço)
-- ══════════════════════════════════════════════════════════════════════════
--
-- O app agora permite registrar um atendimento com:
--   - só serviço(s)
--   - só produto(s)
--   - serviço(s) + produto(s)
--
-- Para o caso "só produto(s)", o insert envia service_id = NULL. Se a coluna
-- tiver uma constraint NOT NULL, o insert falha. Esta migration remove essa
-- restrição (idempotente — se já for nullable, não faz nada).
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE attendances ALTER COLUMN service_id DROP NOT NULL;

-- ── Verificação ───────────────────────────────────────────────────────────
-- SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name = 'attendances' AND column_name = 'service_id';
-- → is_nullable deve ser 'YES'
