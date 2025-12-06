-- Official Access Codes System
-- Creates tables for access code management and the RPC function for mobile app authentication
-- Version: 1.0.0
-- Date: 2024-12-06

-- ============================================================================
-- TABLES
-- ============================================================================

-- Event Access Codes - codes generated for officials to access specific events
CREATE TABLE IF NOT EXISTS public.event_access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, -- Descriptive name like "Høyde" or "Kast A"
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event Access Code Events - links access codes to specific events
CREATE TABLE IF NOT EXISTS public.event_access_code_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_code_id UUID NOT NULL REFERENCES public.event_access_codes(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(access_code_id, event_id)
);

-- Official Sessions - active sessions for officials using access codes
CREATE TABLE IF NOT EXISTS public.official_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_code_id UUID NOT NULL REFERENCES public.event_access_codes(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access Code Log - audit trail for access code usage
CREATE TABLE IF NOT EXISTS public.access_code_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_code_id UUID NOT NULL REFERENCES public.event_access_codes(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'login', 'logout', 'deactivated', 'reactivated', 'events_updated'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_event_access_codes_competition ON public.event_access_codes(competition_id);
CREATE INDEX IF NOT EXISTS idx_event_access_codes_code ON public.event_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_event_access_code_events_code ON public.event_access_code_events(access_code_id);
CREATE INDEX IF NOT EXISTS idx_event_access_code_events_event ON public.event_access_code_events(event_id);
CREATE INDEX IF NOT EXISTS idx_official_sessions_token ON public.official_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_official_sessions_access_code ON public.official_sessions(access_code_id);
CREATE INDEX IF NOT EXISTS idx_access_code_log_code ON public.access_code_log(access_code_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.event_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_access_code_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_code_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe recreation)
DROP POLICY IF EXISTS "Access codes viewable by competition owner" ON public.event_access_codes;
DROP POLICY IF EXISTS "Access codes creatable by competition owner" ON public.event_access_codes;
DROP POLICY IF EXISTS "Access codes updatable by competition owner" ON public.event_access_codes;
DROP POLICY IF EXISTS "Event code links viewable by competition owner" ON public.event_access_code_events;
DROP POLICY IF EXISTS "Event code links manageable by competition owner" ON public.event_access_code_events;
DROP POLICY IF EXISTS "Sessions publicly readable for validation" ON public.official_sessions;
DROP POLICY IF EXISTS "Sessions updatable" ON public.official_sessions;
DROP POLICY IF EXISTS "Sessions insertable" ON public.official_sessions;
DROP POLICY IF EXISTS "Log viewable by competition owner" ON public.access_code_log;
DROP POLICY IF EXISTS "Log insertable" ON public.access_code_log;

-- Access codes can be read by competition owners
CREATE POLICY "Access codes viewable by competition owner"
  ON public.event_access_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions c
      WHERE c.id = event_access_codes.competition_id
      AND c.created_by = auth.uid()
    )
  );

-- Access codes can be created by competition owners
CREATE POLICY "Access codes creatable by competition owner"
  ON public.event_access_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competitions c
      WHERE c.id = competition_id
      AND c.created_by = auth.uid()
    )
  );

-- Access codes can be updated by competition owners
CREATE POLICY "Access codes updatable by competition owner"
  ON public.event_access_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions c
      WHERE c.id = event_access_codes.competition_id
      AND c.created_by = auth.uid()
    )
  );

-- Event links viewable by competition owners
CREATE POLICY "Event code links viewable by competition owner"
  ON public.event_access_code_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_access_codes eac
      JOIN public.competitions c ON c.id = eac.competition_id
      WHERE eac.id = event_access_code_events.access_code_id
      AND c.created_by = auth.uid()
    )
  );

-- Event links manageable by competition owners
CREATE POLICY "Event code links manageable by competition owner"
  ON public.event_access_code_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_access_codes eac
      JOIN public.competitions c ON c.id = eac.competition_id
      WHERE eac.id = event_access_code_events.access_code_id
      AND c.created_by = auth.uid()
    )
  );

-- Sessions are readable by anyone (needed for mobile app validation)
CREATE POLICY "Sessions publicly readable for validation"
  ON public.official_sessions FOR SELECT
  USING (true);

-- Sessions can be inserted by the RPC function (runs as SECURITY DEFINER)
CREATE POLICY "Sessions insertable"
  ON public.official_sessions FOR INSERT
  WITH CHECK (true);

-- Sessions can be updated (deactivated) by anyone with the token
CREATE POLICY "Sessions updatable"
  ON public.official_sessions FOR UPDATE
  USING (true);

-- Log entries viewable by competition owners
CREATE POLICY "Log viewable by competition owner"
  ON public.access_code_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_access_codes eac
      JOIN public.competitions c ON c.id = eac.competition_id
      WHERE eac.id = access_code_log.access_code_id
      AND c.created_by = auth.uid()
    )
  );

-- Log entries can be inserted by the RPC function
CREATE POLICY "Log insertable"
  ON public.access_code_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RPC FUNCTION: validate_official_access_code
-- Used by the mobile app to validate access codes and create sessions
-- ============================================================================

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
      'error', 'Denne koden har utløpt'
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

  -- Get linked events
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name
      )
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

-- Grant execute permission to authenticated and anonymous users (mobile app needs this)
GRANT EXECUTE ON FUNCTION public.validate_official_access_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_official_access_code(TEXT) TO authenticated;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for event_access_codes
CREATE OR REPLACE FUNCTION update_event_access_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_event_access_codes_updated_at ON public.event_access_codes;
CREATE TRIGGER trigger_update_event_access_codes_updated_at
  BEFORE UPDATE ON public.event_access_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_event_access_codes_updated_at();
