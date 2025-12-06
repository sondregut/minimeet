-- Migration: Create secure function for adding participants from mobile app
-- This allows officials with valid sessions to add athletes to events for small competitions

CREATE OR REPLACE FUNCTION add_participant_to_event(
  p_session_id UUID,
  p_event_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_gender TEXT,
  p_date_of_birth DATE DEFAULT NULL,
  p_club_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_event RECORD;
  v_athlete_id UUID;
  v_entry_id UUID;
  v_bib_number TEXT;
  v_max_bib INT;
BEGIN
  -- Validate session (only check expiry, is_active doesn't exist)
  SELECT os.*, eac.competition_id
  INTO v_session
  FROM official_sessions os
  JOIN event_access_codes eac ON os.access_code_id = eac.id
  WHERE os.id = p_session_id
    AND os.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session');
  END IF;

  -- Validate gender value
  IF p_gender NOT IN ('M', 'W', 'X') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid gender value. Must be M, W, or X');
  END IF;

  -- Validate names
  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'First name is required');
  END IF;

  IF p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Last name is required');
  END IF;

  -- Get event and verify it belongs to the same competition
  SELECT ev.*, ev.competition_id as event_competition_id
  INTO v_event
  FROM events ev
  WHERE ev.id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  IF v_event.event_competition_id != v_session.competition_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event does not belong to this competition');
  END IF;

  -- Create the athlete record
  INSERT INTO athletes (first_name, last_name, gender, date_of_birth, club_name)
  VALUES (trim(p_first_name), trim(p_last_name), p_gender::gender_type, p_date_of_birth, trim(p_club_name))
  RETURNING id INTO v_athlete_id;

  -- Generate a bib number (find max numeric bib and add 1)
  SELECT MAX(CAST(bib_number AS INT)) INTO v_max_bib
  FROM entries
  WHERE competition_id = v_session.competition_id
    AND bib_number ~ '^\d+$';

  IF v_max_bib IS NULL THEN
    v_bib_number := '1';
  ELSE
    v_bib_number := (v_max_bib + 1)::TEXT;
  END IF;

  -- Create the entry for this event
  INSERT INTO entries (competition_id, event_id, athlete_id, bib_number, status)
  VALUES (v_session.competition_id, p_event_id, v_athlete_id, v_bib_number, 'registered')
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'athlete_id', v_athlete_id,
    'entry_id', v_entry_id,
    'bib_number', v_bib_number,
    'first_name', trim(p_first_name),
    'last_name', trim(p_last_name)
  );
END;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION add_participant_to_event(uuid, uuid, text, text, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_participant_to_event(uuid, uuid, text, text, text, date, text) TO anon;
