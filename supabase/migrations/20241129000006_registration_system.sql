-- Registration System Migration
-- Phase 6: Self-service athlete registration with approval workflow

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Registration mode for competitions
CREATE TYPE registration_mode AS ENUM ('disabled', 'organizer_only', 'self_service', 'hybrid');

-- Registration status for individual registrations
CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'waitlist', 'withdrawn');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Competition Registration Settings
-- Stores registration configuration per competition
-- ----------------------------------------------------------------------------
CREATE TABLE public.registration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE UNIQUE,

  -- Registration mode
  mode registration_mode NOT NULL DEFAULT 'disabled',

  -- Deadlines
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,

  -- Required fields
  require_license_number BOOLEAN DEFAULT FALSE,
  require_pb BOOLEAN DEFAULT FALSE,
  require_sb BOOLEAN DEFAULT FALSE,
  require_date_of_birth BOOLEAN DEFAULT TRUE,
  require_club BOOLEAN DEFAULT FALSE,

  -- Qualification standards (JSONB for flexibility)
  -- Format: { "100m": { "min": null, "max": 12.50 }, "HJ": { "min": 1.50, "max": null } }
  qualification_standards JSONB DEFAULT '{}'::jsonb,

  -- Limits
  max_entries_per_athlete INT DEFAULT 3,  -- Max events per person

  -- Welcome message shown on registration page
  welcome_message TEXT,

  -- Terms and conditions (must accept to register)
  terms_and_conditions TEXT,

  -- Contact info for questions
  contact_email TEXT,

  -- Auto-approve registrations (skip pending status)
  auto_approve BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Event Registration Settings
-- Per-event overrides for registration settings
-- ----------------------------------------------------------------------------
CREATE TABLE public.event_registration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,

  -- Registration availability
  registration_enabled BOOLEAN DEFAULT TRUE,
  registration_closes_at TIMESTAMPTZ,  -- Override competition deadline

  -- Limits
  max_participants INT,  -- NULL = unlimited

  -- Qualification standard for this event
  min_standard DECIMAL(10,3),  -- Minimum mark required (time in seconds or distance in meters)
  max_standard DECIMAL(10,3),  -- Maximum mark allowed (for age-restricted events)

  -- Age restrictions
  min_age INT,  -- Minimum age on competition day
  max_age INT,  -- Maximum age on competition day

  -- Gender restrictions (can override event gender for mixed events)
  allowed_genders gender_type[] DEFAULT ARRAY['M', 'W', 'X']::gender_type[],

  -- Notes shown to athletes during registration
  registration_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Athlete Registrations
-- Stores registration requests from athletes
-- ----------------------------------------------------------------------------
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,

  -- The user who submitted (can be NULL for organizer-added entries)
  submitted_by UUID REFERENCES public.profiles(id),

  -- Athlete info (may reference existing athlete or be new)
  athlete_id UUID REFERENCES public.athletes(id),

  -- If athlete doesn't exist yet, store their info here
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender gender_type NOT NULL,
  nationality TEXT DEFAULT 'NOR',
  club_name TEXT,
  license_number TEXT,

  -- Status
  status registration_status NOT NULL DEFAULT 'pending',

  -- Message from athlete to organizer
  athlete_message TEXT,

  -- Organizer notes (internal)
  organizer_notes TEXT,

  -- Review info
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Terms acceptance
  terms_accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Registration Event Selections
-- Which events an athlete is registering for
-- ----------------------------------------------------------------------------
CREATE TABLE public.registration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Personal best for this event (optional)
  pb_mark TEXT,
  pb_mark_value DECIMAL(10,3),

  -- Season best for this event (optional)
  sb_mark TEXT,
  sb_mark_value DECIMAL(10,3),

  -- Status (can be different from main registration)
  status registration_status NOT NULL DEFAULT 'pending',

  -- If approved, link to the created entry
  entry_id UUID REFERENCES public.entries(id),

  -- Waitlist position (if waitlisted)
  waitlist_position INT,

  -- Notes for this specific event registration
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(registration_id, event_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_registration_settings_competition ON public.registration_settings(competition_id);
CREATE INDEX idx_event_reg_settings_event ON public.event_registration_settings(event_id);
CREATE INDEX idx_registrations_competition ON public.registrations(competition_id);
CREATE INDEX idx_registrations_status ON public.registrations(status);
CREATE INDEX idx_registrations_athlete ON public.registrations(athlete_id);
CREATE INDEX idx_registrations_email ON public.registrations(email);
CREATE INDEX idx_registration_events_registration ON public.registration_events(registration_id);
CREATE INDEX idx_registration_events_event ON public.registration_events(event_id);
CREATE INDEX idx_registration_events_status ON public.registration_events(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_registration_settings_updated_at
  BEFORE UPDATE ON public.registration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_event_registration_settings_updated_at
  BEFORE UPDATE ON public.event_registration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_registration_events_updated_at
  BEFORE UPDATE ON public.registration_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.registration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_events ENABLE ROW LEVEL SECURITY;

-- Registration Settings Policies
CREATE POLICY "Registration settings are public for published competitions"
  ON public.registration_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = registration_settings.competition_id
      AND competitions.status IN ('published', 'active')
    )
  );

CREATE POLICY "Officials can manage registration settings"
  ON public.registration_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = registration_settings.competition_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

-- Event Registration Settings Policies
CREATE POLICY "Event registration settings are public for published competitions"
  ON public.event_registration_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE events.id = event_registration_settings.event_id
      AND competitions.status IN ('published', 'active')
    )
  );

CREATE POLICY "Officials can manage event registration settings"
  ON public.event_registration_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE events.id = event_registration_settings.event_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

-- Registrations Policies
CREATE POLICY "Users can view own registrations"
  ON public.registrations FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Officials can view all registrations for their competitions"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = registrations.competition_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create registrations"
  ON public.registrations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (submitted_by = auth.uid() OR submitted_by IS NULL)
  );

CREATE POLICY "Users can update own pending registrations"
  ON public.registrations FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "Officials can update all registrations"
  ON public.registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = registrations.competition_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

CREATE POLICY "Users can delete own pending registrations"
  ON public.registrations FOR DELETE
  USING (
    submitted_by = auth.uid()
    AND status = 'pending'
  );

-- Registration Events Policies
CREATE POLICY "Users can view own registration events"
  ON public.registration_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations
      WHERE registrations.id = registration_events.registration_id
      AND registrations.submitted_by = auth.uid()
    )
  );

CREATE POLICY "Officials can view all registration events"
  ON public.registration_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations
      JOIN public.competitions ON competitions.id = registrations.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE registrations.id = registration_events.registration_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own registration events when pending"
  ON public.registration_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations
      WHERE registrations.id = registration_events.registration_id
      AND registrations.submitted_by = auth.uid()
      AND registrations.status = 'pending'
    )
  );

CREATE POLICY "Officials can manage all registration events"
  ON public.registration_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations
      JOIN public.competitions ON competitions.id = registrations.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE registrations.id = registration_events.registration_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registration_events;
