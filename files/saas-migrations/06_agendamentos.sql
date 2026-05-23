-- ================================================================
-- Migration 06: Sistema de Agendamentos v1.0
-- Executar no Supabase SQL Editor
-- ================================================================

-- 1. Slug público da barbearia (usado na URL de agendamento)
ALTER TABLE barbershops
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Gera slug a partir do nome para barbearias já existentes
UPDATE barbershops
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(
        name,
        'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAEEEEIIIIOOOOOUUUUC'
      ),
      '[^a-zA-Z0-9\s]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) || '-' || LOWER(SUBSTRING(id::text, 1, 6))
WHERE slug IS NULL;

ALTER TABLE barbershops
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS barbershops_slug_idx ON barbershops(slug);

-- 2. Email do cliente (para notificações futuras v2)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Disponibilidade dos barbeiros por dia da semana
CREATE TABLE IF NOT EXISTS barber_availability (
  id            BIGSERIAL PRIMARY KEY,
  barbershop_id UUID      NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id     UUID      NOT NULL REFERENCES barbers(id)     ON DELETE CASCADE,
  day_of_week   SMALLINT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=Domingo 1=Segunda 2=Terça 3=Quarta 4=Quinta 5=Sexta 6=Sábado
  start_time    TIME      NOT NULL DEFAULT '09:00',
  end_time      TIME      NOT NULL DEFAULT '18:00',
  is_active     BOOLEAN   NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barber_id, day_of_week)
);

-- 4. Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id               BIGSERIAL PRIMARY KEY,
  barbershop_id    UUID    NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id        UUID    NOT NULL REFERENCES barbers(id),
  client_id        UUID    REFERENCES clients(id),
  service_id       UUID    NOT NULL REFERENCES services(id),
  scheduled_date   DATE    NOT NULL,
  scheduled_time   TIME    NOT NULL,
  duration_minutes INT     NOT NULL DEFAULT 30,
  status           TEXT    NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','completed','cancelled')),
  client_name      TEXT,
  client_phone     TEXT,
  client_email     TEXT,
  notes            TEXT,
  booked_via       TEXT    NOT NULL DEFAULT 'admin',
  -- 'admin' = criado pelo admin | 'public' = agendado pelo cliente
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;

-- barber_availability: isolamento por barbearia (usuários autenticados)
CREATE POLICY "availability_barbershop_iso" ON barber_availability
  FOR ALL TO authenticated
  USING (barbershop_id = my_barbershop_id())
  WITH CHECK (barbershop_id = my_barbershop_id());

-- appointments: isolamento por barbearia (usuários autenticados)
CREATE POLICY "appointments_barbershop_iso" ON appointments
  FOR ALL TO authenticated
  USING (barbershop_id = my_barbershop_id())
  WITH CHECK (barbershop_id = my_barbershop_id());

-- Leitura pública de disponibilidade (anon — para página de agendamento)
CREATE POLICY "availability_public_read" ON barber_availability
  FOR SELECT TO anon USING (is_active = true);

-- Leitura pública de slots ocupados (anon — apenas data/hora, sem dados pessoais)
-- A Edge Function filtra os campos antes de retornar ao cliente
CREATE POLICY "appointments_public_read" ON appointments
  FOR SELECT TO anon
  USING (status IN ('pending','confirmed'));

-- Insert público de agendamentos (anon — via página pública)
CREATE POLICY "appointments_public_insert" ON appointments
  FOR INSERT TO anon
  WITH CHECK (booked_via = 'public');

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_shop_date
  ON appointments(barbershop_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_appointments_barber_date
  ON appointments(barber_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_availability_barber
  ON barber_availability(barber_id, day_of_week);

-- 7. Função auxiliar: retorna o slug de uma barbearia pelo id
CREATE OR REPLACE FUNCTION get_barbershop_slug(p_id UUID)
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT slug FROM barbershops WHERE id = p_id LIMIT 1;
$$;

-- ================================================================
-- Verificação final: confira se as tabelas foram criadas
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('appointments','barber_availability');
-- ================================================================
