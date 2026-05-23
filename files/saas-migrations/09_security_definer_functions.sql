-- ================================================================
-- Migration 09: Funções SECURITY DEFINER para bypassing RLS
-- Executar no Supabase SQL Editor (apenas uma vez)
-- ================================================================

-- 1. Cria perfil de barbeiro ao configurar login
--    Necessário porque o admin não pode criar perfis de outros usuários via RLS normal
CREATE OR REPLACE FUNCTION link_barber_profile(
  p_user_id       UUID,
  p_barbershop_id UUID,
  p_barber_id     BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, role, barbershop_id, barber_id)
  VALUES (p_user_id, 'barber', p_barbershop_id, p_barber_id)
  ON CONFLICT (id) DO UPDATE SET
    role          = 'barber',
    barbershop_id = EXCLUDED.barbershop_id,
    barber_id     = EXCLUDED.barber_id;
END;
$$;

GRANT EXECUTE ON FUNCTION link_barber_profile(UUID, UUID, BIGINT) TO authenticated;

-- ----------------------------------------------------------------

-- 2. Finaliza atendimento pendente (barbeiro ou admin)
--    Necessário porque barbeiros não têm permissão de UPDATE em attendances via RLS
CREATE OR REPLACE FUNCTION finalize_attendance(
  p_attendance_id BIGINT,
  p_payment       TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barber_id      BIGINT;
  v_barbershop_id  UUID;
  v_appointment_id BIGINT;
BEGIN
  -- Busca o barber_id e barbershop_id do perfil autenticado
  SELECT p.barber_id, p.barbershop_id
    INTO v_barber_id, v_barbershop_id
    FROM profiles p
   WHERE p.id = auth.uid();

  -- Atualiza só se o atendimento pertencer a este barbeiro/barbearia
  UPDATE attendances
     SET payment = p_payment
   WHERE id = p_attendance_id
     AND barbershop_id = v_barbershop_id
     AND (
       -- Admin pode finalizar qualquer atendimento da barbearia
       EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
       OR
       -- Barbeiro só finaliza os seus próprios
       barber_id = v_barber_id
     )
  RETURNING appointment_id INTO v_appointment_id;

  -- Se veio de agendamento, marca como concluído automaticamente
  IF v_appointment_id IS NOT NULL THEN
    UPDATE appointments
       SET status     = 'completed',
           updated_at = now()
     WHERE id = v_appointment_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_attendance(BIGINT, TEXT) TO authenticated;

-- ================================================================
-- Verificação:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_name IN ('link_barber_profile', 'finalize_attendance');
-- ================================================================
