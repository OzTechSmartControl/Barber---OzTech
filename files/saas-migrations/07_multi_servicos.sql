-- ================================================================
-- Migration 07: Multi-serviços por agendamento
-- Executar no Supabase SQL Editor
-- ================================================================

-- Adiciona coluna service_ids (JSONB) em appointments.
-- Armazena um array de BIGINT com todos os IDs dos serviços agendados.
-- service_id original é mantido como "serviço principal" (retrocompatível).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_ids JSONB DEFAULT '[]'::jsonb;

-- Popula service_ids com o service_id existente para agendamentos já criados,
-- garantindo retrocompatibilidade com registros anteriores à migration 07.
UPDATE appointments
  SET service_ids = jsonb_build_array(service_id)
  WHERE (service_ids = '[]'::jsonb OR service_ids IS NULL)
    AND service_id IS NOT NULL;

-- ================================================================
-- Verificação final:
-- SELECT id, service_id, service_ids FROM appointments LIMIT 10;
-- ================================================================
