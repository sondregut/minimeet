-- Migration: Create secure function for updating roll call status
-- This allows officials with valid sessions to update entry status for roll call

CREATE OR REPLACE FUNCTION update_roll_call_status(
  p_session_id UUID,
  p_entry_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_entry RECORD;
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

  -- Get entry and verify it belongs to the same competition
  SELECT e.*, ev.competition_id as event_competition_id
  INTO v_entry
  FROM entries e
  JOIN events ev ON e.event_id = ev.id
  WHERE e.id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  -- Verify the entry's competition matches the session's competition
  IF v_entry.event_competition_id != v_session.competition_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry does not belong to this competition');
  END IF;

  -- Validate status value
  IF p_status NOT IN ('registered', 'checked_in', 'DNS', 'scratched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status value');
  END IF;

  -- Update the entry status
  UPDATE entries
  SET status = p_status::entry_status,
      updated_at = NOW()
  WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', p_entry_id,
    'status', p_status
  );
END;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION update_roll_call_status(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_roll_call_status(uuid, uuid, text) TO anon;
