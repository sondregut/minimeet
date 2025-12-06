-- Update validate_official_access_code to return more event details
-- Adds: age_group, gender, scheduled_time, event_type

CREATE OR REPLACE FUNCTION public.validate_official_access_code(p_access_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_access_code RECORD;
  v_competition RECORD;
  v_session_id UUID;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_events JSONB;
BEGIN
  -- Normalize the access code (uppercase, trim)
  p_access_code := UPPER(TRIM(p_access_code));

  -- Find the access code
  SELECT
    eac.id,
    eac.competition_id,
    eac.name,
    eac.is_active,
    eac.expires_at
  INTO v_access_code
  FROM public.event_access_codes eac
  WHERE eac.code = p_access_code;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Ugyldig tilgangskode'
    );
  END IF;

  -- Check if code is active
  IF NOT v_access_code.is_active THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Denne koden er deaktivert'
    );
  END IF;

  -- Check if code has expired
  IF v_access_code.expires_at IS NOT NULL AND v_access_code.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Denne koden har utlopt'
    );
  END IF;

  -- Get competition details
  SELECT id, name
  INTO v_competition
  FROM public.competitions
  WHERE id = v_access_code.competition_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Stevnet finnes ikke'
    );
  END IF;

  -- Get linked events with full details including age_group, gender, scheduled_time
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'age_group', e.age_group,
        'gender', e.gender,
        'event_type', e.event_type,
        'scheduled_time', e.scheduled_time
      )
      ORDER BY e.scheduled_time NULLS LAST, e.age_group, e.name
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM public.event_access_code_events eace
  JOIN public.events e ON e.id = eace.event_id
  WHERE eace.access_code_id = v_access_code.id;

  -- Generate session token (64 character hex string)
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- Session expires in 24 hours
  v_expires_at := NOW() + INTERVAL '24 hours';

  -- Create session
  INSERT INTO public.official_sessions (
    access_code_id,
    session_token,
    expires_at
  ) VALUES (
    v_access_code.id,
    v_session_token,
    v_expires_at
  )
  RETURNING id INTO v_session_id;

  -- Log the login
  INSERT INTO public.access_code_log (
    access_code_id,
    action,
    details
  ) VALUES (
    v_access_code.id,
    'login',
    jsonb_build_object('session_id', v_session_id)
  );

  -- Return success response
  RETURN jsonb_build_object(
    'valid', true,
    'session_id', v_session_id,
    'session_token', v_session_token,
    'competition_id', v_competition.id,
    'competition_name', v_competition.name,
    'access_code_name', v_access_code.name,
    'events', v_events,
    'expires_at', v_expires_at
  );

END;
$$;
