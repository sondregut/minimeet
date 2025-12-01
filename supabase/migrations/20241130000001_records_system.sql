-- Records System Migration
-- Phase 4.4: Comprehensive records tracking and detection

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Record types supported
CREATE TYPE record_type AS ENUM (
  'PB',   -- Personal Best
  'SB',   -- Season Best
  'MR',   -- Meeting Record
  'CR',   -- Championship Record
  'CLR',  -- Club Record
  'NR',   -- National Record
  'AR',   -- Area/Continental Record
  'WR'    -- World Record
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Competition Record Settings
-- Configure which record types are tracked per competition
-- ----------------------------------------------------------------------------
CREATE TABLE public.competition_record_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE UNIQUE,

  -- Which record types to track
  track_pb BOOLEAN DEFAULT TRUE,
  track_sb BOOLEAN DEFAULT TRUE,
  track_mr BOOLEAN DEFAULT FALSE,  -- Meeting Record
  track_cr BOOLEAN DEFAULT FALSE,  -- Championship Record
  track_clr BOOLEAN DEFAULT FALSE, -- Club Record
  track_nr BOOLEAN DEFAULT FALSE,  -- National Record

  -- Display settings
  highlight_records BOOLEAN DEFAULT TRUE,
  announce_records BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Record Definitions
-- Stores existing records that can be broken (MR, CR, NR, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE public.record_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Scope - where does this record apply?
  -- NULL = global, competition_id = meeting record, organization_id = club record
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Record identification
  record_type record_type NOT NULL,
  event_code TEXT NOT NULL,  -- e.g., '100m', 'HJ', 'SP'
  gender TEXT NOT NULL,      -- 'M', 'W', 'X'
  age_group TEXT,            -- NULL = open, or specific age group

  -- The record itself
  mark_value DECIMAL(10,3) NOT NULL,  -- Time in seconds or distance in meters
  mark_display TEXT NOT NULL,          -- Formatted display (e.g., "10.49", "2.05m")
  wind DECIMAL(4,2),                   -- Wind reading if applicable

  -- Record holder info
  athlete_name TEXT NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id),
  nationality TEXT,
  club_name TEXT,

  -- When/where it was set
  set_date DATE NOT NULL,
  set_location TEXT,
  set_competition TEXT,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint per record type/event/gender/age
  UNIQUE(record_type, event_code, gender, age_group, competition_id, organization_id)
);

-- ----------------------------------------------------------------------------
-- Record Breaks
-- Log of all records broken during competitions
-- ----------------------------------------------------------------------------
CREATE TABLE public.record_breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Where was it broken
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,

  -- What record was broken
  record_type record_type NOT NULL,
  previous_record_id UUID REFERENCES public.record_definitions(id),

  -- Previous record details (in case record_definitions row is deleted)
  previous_mark_value DECIMAL(10,3),
  previous_mark_display TEXT,
  previous_holder_name TEXT,
  previous_set_date DATE,

  -- New record details
  new_mark_value DECIMAL(10,3) NOT NULL,
  new_mark_display TEXT NOT NULL,
  wind DECIMAL(4,2),

  -- Athlete who broke it
  athlete_id UUID NOT NULL REFERENCES public.athletes(id),
  athlete_name TEXT NOT NULL,

  -- Status
  is_official BOOLEAN DEFAULT FALSE,  -- Has it been officially ratified?
  is_announced BOOLEAN DEFAULT FALSE, -- Has it been announced?
  announced_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_comp_record_settings_comp ON public.competition_record_settings(competition_id);
CREATE INDEX idx_record_definitions_event ON public.record_definitions(event_code, gender, age_group);
CREATE INDEX idx_record_definitions_type ON public.record_definitions(record_type);
CREATE INDEX idx_record_definitions_comp ON public.record_definitions(competition_id);
CREATE INDEX idx_record_definitions_org ON public.record_definitions(organization_id);
CREATE INDEX idx_record_breaks_comp ON public.record_breaks(competition_id);
CREATE INDEX idx_record_breaks_event ON public.record_breaks(event_id);
CREATE INDEX idx_record_breaks_athlete ON public.record_breaks(athlete_id);
CREATE INDEX idx_record_breaks_type ON public.record_breaks(record_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_competition_record_settings_updated_at
  BEFORE UPDATE ON public.competition_record_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_record_definitions_updated_at
  BEFORE UPDATE ON public.record_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_record_breaks_updated_at
  BEFORE UPDATE ON public.record_breaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.competition_record_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_breaks ENABLE ROW LEVEL SECURITY;

-- Competition Record Settings Policies
CREATE POLICY "Record settings are public"
  ON public.competition_record_settings FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage record settings"
  ON public.competition_record_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = competition_record_settings.competition_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

-- Record Definitions Policies
CREATE POLICY "Record definitions are public"
  ON public.record_definitions FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage competition records"
  ON public.record_definitions FOR ALL
  USING (
    competition_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = record_definitions.competition_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

CREATE POLICY "Org admins can manage organization records"
  ON public.record_definitions FOR ALL
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = record_definitions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- Record Breaks Policies
CREATE POLICY "Record breaks are public"
  ON public.record_breaks FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage record breaks"
  ON public.record_breaks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = record_breaks.competition_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

-- ============================================================================
-- Add record flags to result tables
-- ============================================================================

-- Track results
ALTER TABLE public.track_results
  ADD COLUMN IF NOT EXISTS is_mr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_cr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_clr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_nr BOOLEAN DEFAULT FALSE;

-- Field results
ALTER TABLE public.field_results
  ADD COLUMN IF NOT EXISTS is_mr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_cr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_clr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_nr BOOLEAN DEFAULT FALSE;

-- Vertical results
ALTER TABLE public.vertical_results
  ADD COLUMN IF NOT EXISTS is_mr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_cr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_clr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_nr BOOLEAN DEFAULT FALSE;
