-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase extras — execute via Supabase SQL Editor após rodar as migrations
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Trigger: calcular status do documento automaticamente
CREATE OR REPLACE FUNCTION check_document_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL THEN
    IF NEW.expires_at < CURRENT_DATE THEN
      NEW.is_expired := true;
      NEW.status := 'expired';
    ELSIF NEW.expires_at <= CURRENT_DATE + INTERVAL '7 days' THEN
      NEW.is_expired := false;
      NEW.status := 'expiring_soon';
    ELSE
      NEW.is_expired := false;
      NEW.status := 'valid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_document_expiry
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION check_document_expiry();

-- 2. RLS — Residents
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY residents_house_isolation ON residents
  FOR ALL
  USING (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  );

-- 3. RLS — Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_house_isolation ON documents
  FOR ALL
  USING (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  );

-- 4. Índices extras de performance
CREATE INDEX IF NOT EXISTS idx_residents_name ON residents USING gin(to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS idx_residents_status_house ON residents(house_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 3: Medicamentos
-- ─────────────────────────────────────────────────────────────────────────────

-- 5. VIEW: Próximos medicamentos nas próximas 24h
-- Expande os horários agendados e compara com a hora atual
CREATE OR REPLACE VIEW medication_schedules_next_24h AS
SELECT
  m.id              AS medication_id,
  m.name            AS medication_name,
  m.dosage,
  m.measurement_unit,
  m.special_instructions,
  m.instructions_for_caregiver,
  m.side_effects,
  m.interaction_warnings,
  r.id              AS resident_id,
  r.name            AS resident_name,
  r.photo_url       AS resident_photo,
  r.house_id,
  t.scheduled_time,
  -- Construir o datetime do próximo agendamento (hoje ou amanhã)
  CASE
    WHEN (CURRENT_DATE + t.scheduled_time::time) >= NOW()
      THEN CURRENT_DATE + t.scheduled_time::time
    ELSE (CURRENT_DATE + INTERVAL '1 day') + t.scheduled_time::time
  END AS next_datetime,
  -- Minutos até o próximo horário (negativo = atrasado)
  EXTRACT(EPOCH FROM (
    CASE
      WHEN (CURRENT_DATE + t.scheduled_time::time) >= NOW()
        THEN CURRENT_DATE + t.scheduled_time::time
      ELSE (CURRENT_DATE + INTERVAL '1 day') + t.scheduled_time::time
    END - NOW()
  )) / 60 AS minutes_until,
  -- Já foi administrado hoje neste horário?
  EXISTS (
    SELECT 1 FROM medication_logs ml
    WHERE ml.medication_id = m.id
      AND ml.scheduled_time = t.scheduled_time
      AND ml.status IN ('administered', 'partially_administered')
      AND DATE(ml.created_at) = CURRENT_DATE
  ) AS already_administered,
  -- Está atrasado? (passou do horário e não foi administrado)
  (CURRENT_DATE + t.scheduled_time::time) < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM medication_logs ml
      WHERE ml.medication_id = m.id
        AND ml.scheduled_time = t.scheduled_time
        AND DATE(ml.created_at) = CURRENT_DATE
    ) AS is_overdue
FROM medications m
JOIN residents r ON r.id = m.resident_id
CROSS JOIN LATERAL unnest(m.scheduled_times) AS t(scheduled_time)
WHERE m.status = 'active'
  AND r.status = 'active'
  AND r.deleted_at IS NULL
  AND m.start_date <= CURRENT_DATE
  AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE);

-- 6. Função para detectar medicamentos atrasados e notificar
CREATE OR REPLACE FUNCTION notify_overdue_medications()
RETURNS void AS $$
DECLARE
  med RECORD;
BEGIN
  -- Inserir notificações para medicamentos atrasados há mais de 30 minutos
  FOR med IN
    SELECT mv.*, mv.house_id
    FROM medication_schedules_next_24h mv
    WHERE mv.is_overdue = true
      AND mv.minutes_until < -30  -- atrasado há mais de 30 min
      AND NOT EXISTS (
        SELECT 1 FROM medication_logs ml
        WHERE ml.medication_id = mv.medication_id
          AND ml.scheduled_time = mv.scheduled_time
          AND DATE(ml.created_at) = CURRENT_DATE
      )
  LOOP
    -- Notificar enfermeiros e cuidadores desta casa
    INSERT INTO notifications (id, user_id, house_id, title, body, type, channel, entity_type, entity_id, created_at)
    SELECT
      gen_random_uuid(),
      u.id,
      med.house_id,
      'Medicamento ATRASADO',
      format('%s — %s deveria ter sido administrado às %s',
        med.resident_name, med.medication_name, med.scheduled_time),
      'medication_overdue',
      'in_app',
      'medication',
      med.medication_id,
      NOW()
    FROM users u
    WHERE u.house_id = med.house_id
      AND u.role IN ('nurse', 'caregiver', 'admin', 'director')
      AND u.active = true
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. RLS — Medications
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY medications_house_isolation ON medications
  FOR ALL
  USING (
    resident_id IN (
      SELECT id FROM residents
      WHERE house_id = (SELECT house_id FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    resident_id IN (
      SELECT id FROM residents
      WHERE house_id = (SELECT house_id FROM users WHERE id = auth.uid())
    )
  );

-- 8. RLS — MedicationLogs
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY medication_logs_house_isolation ON medication_logs
  FOR ALL
  USING (
    resident_id IN (
      SELECT id FROM residents
      WHERE house_id = (SELECT house_id FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    resident_id IN (
      SELECT id FROM residents
      WHERE house_id = (SELECT house_id FROM users WHERE id = auth.uid())
    )
  );

-- 9. Índices de performance para medicamentos
CREATE INDEX IF NOT EXISTS idx_medications_resident_status
  ON medications(resident_id, status);
CREATE INDEX IF NOT EXISTS idx_medications_scheduled_times
  ON medications USING gin(scheduled_times);
CREATE INDEX IF NOT EXISTS idx_medication_logs_scheduled_time
  ON medication_logs(medication_id, scheduled_time, created_at);
CREATE INDEX IF NOT EXISTS idx_medication_logs_created_date
  ON medication_logs(medication_id, (DATE(created_at)));

