-- ================================================================
-- Migration 08: Vincular atendimentos a agendamentos
-- Executar no Supabase SQL Editor
-- ================================================================

-- 1. Rastreia de qual agendamento veio o atendimento (nullable)
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS appointment_id BIGINT
    REFERENCES appointments(id) ON DELETE SET NULL;

-- 2. Origem do atendimento: 'manual' (criado pelo admin/barbeiro)
--    ou 'appointment' (criado automaticamente ao confirmar agendamento)
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- 3. Garante que cada agendamento gere no máximo um atendimento
CREATE UNIQUE INDEX IF NOT EXISTS unique_attendance_per_appointment
  ON attendances(appointment_id)
  WHERE appointment_id IS NOT NULL;

-- ================================================================
-- Verificação final:
-- SELECT id, appointment_id, source, payment FROM attendances LIMIT 10;
-- ================================================================
