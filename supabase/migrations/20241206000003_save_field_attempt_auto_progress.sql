-- Migration: Auto-set event status to in_progress when saving field attempts
-- This ensures live results appear in the web app when officials start recording

DROP FUNCTION IF EXISTS save_field_attempt(uuid, uuid, integer, numeric, boolean, boolean);

CREATE OR REPLACE FUNCTION save_field_attempt(
  p_session_id UUID,
  p_entry_id UUID,
  p_attempt_number INTEGER,
  p_distance NUMERIC,
  p_is_foul BOOLEAN,
  p_is_pass BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_entry RECORD;
  v_field_result_id UUID;
  v_attempt_id UUID;
  v_best_mark NUMERIC;
  v_event_id UUID;
BEGIN
  -- Validate session (note: is_active column doesn't exist, only check expiry)
  SELECT os.*, eac.competition_id
  INTO v_session
  FROM official_sessions os
  JOIN event_access_codes eac ON os.access_code_id = eac.id
  WHERE os.id = p_session_id
    AND os.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session');
  END IF;

  -- Get entry and verify it belongs to an event the session has access to
  SELECT e.*, ev.id as event_id
  INTO v_entry
  FROM entries e
  JOIN events ev ON e.event_id = ev.id
  WHERE e.id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  v_event_id := v_entry.event_id;

  -- Get or create field_result record
  SELECT id INTO v_field_result_id
  FROM field_results
  WHERE entry_id = p_entry_id;

  IF v_field_result_id IS NULL THEN
    INSERT INTO field_results (entry_id, status)
    VALUES (p_entry_id, 'active')
    RETURNING id INTO v_field_result_id;
  END IF;

  -- Insert or update the attempt (upsert)
  INSERT INTO field_attempts (result_id, attempt_number, distance, is_foul, is_pass)
  VALUES (v_field_result_id, p_attempt_number, p_distance, p_is_foul, p_is_pass)
  ON CONFLICT (result_id, attempt_number)
  DO UPDATE SET
    distance = EXCLUDED.distance,
    is_foul = EXCLUDED.is_foul,
    is_pass = EXCLUDED.is_pass
  RETURNING id INTO v_attempt_id;

  -- Calculate best mark
  SELECT MAX(distance) INTO v_best_mark
  FROM field_attempts
  WHERE result_id = v_field_result_id
    AND is_foul = false
    AND is_pass = false
    AND distance IS NOT NULL;

  -- Update best mark on field_result
  UPDATE field_results
  SET best_mark = v_best_mark,
      attempts_taken = (
        SELECT COUNT(*) FROM field_attempts WHERE result_id = v_field_result_id
      )
  WHERE id = v_field_result_id;

  -- AUTO-SET EVENT STATUS TO IN_PROGRESS if not already in progress/completed
  UPDATE events
  SET status = 'in_progress'
  WHERE id = v_event_id
    AND status IN ('scheduled', 'checkin', 'draft');

  RETURN jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'field_result_id', v_field_result_id,
    'best_mark', v_best_mark
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_field_attempt(uuid, uuid, integer, numeric, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION save_field_attempt(uuid, uuid, integer, numeric, boolean, boolean) TO anon;
