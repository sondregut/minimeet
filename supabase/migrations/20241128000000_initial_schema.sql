-- MiniMeet Initial Database Schema
-- Version: 1.0.0
-- Date: 2024-11-28

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================================

-- Organization types
CREATE TYPE organization_type AS ENUM ('club', 'federation', 'school', 'other');

-- User roles within organizations
CREATE TYPE organization_role AS ENUM ('admin', 'official', 'volunteer');

-- Competition status
CREATE TYPE competition_status AS ENUM ('draft', 'published', 'active', 'completed', 'archived');

-- Event types
CREATE TYPE event_type AS ENUM ('track', 'field_vertical', 'field_horizontal', 'throw', 'combined', 'relay', 'road');

-- Event round types
CREATE TYPE event_round AS ENUM ('final', 'semi', 'heat', 'qualification');

-- Gender categories
CREATE TYPE gender_type AS ENUM ('M', 'W', 'X');

-- Entry status
CREATE TYPE entry_status AS ENUM ('registered', 'confirmed', 'checked_in', 'DNS', 'scratched');

-- Result status for track events
CREATE TYPE track_result_status AS ENUM ('finished', 'DNS', 'DNF', 'DQ', 'FS');

-- Vertical jump result status
CREATE TYPE vertical_status AS ENUM ('active', 'eliminated', 'retired', 'NH');

-- Field event result status
CREATE TYPE field_status AS ENUM ('active', 'complete', 'retired', 'NM', 'ND');

-- Vertical attempt outcomes
CREATE TYPE vertical_attempt_outcome AS ENUM ('o', 'x', '-', 'r');

-- Qualification marks
CREATE TYPE qualification_mark AS ENUM ('Q', 'q', 'qR', 'qJ');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Organizations (Clubs, Federations, Schools)
-- ----------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type organization_type NOT NULL DEFAULT 'club',
  logo_url TEXT,
  country TEXT DEFAULT 'NO',
  city TEXT,
  contact_email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Organization Members (User-Organization relationships)
-- ----------------------------------------------------------------------------
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'volunteer',
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(organization_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Competitions (Stevner/Meets)
-- ----------------------------------------------------------------------------
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  end_date DATE, -- For multi-day competitions
  location TEXT NOT NULL,
  venue TEXT,
  status competition_status NOT NULL DEFAULT 'draft',
  -- Settings stored as JSONB for flexibility
  settings JSONB NOT NULL DEFAULT '{
    "allow_online_registration": false,
    "entry_fee": null,
    "currency": "NOK",
    "age_groups": ["Senior", "U23", "U20", "U18", "U16"],
    "default_attempts": 6,
    "top_n_to_final": 8
  }'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Events (Individual disciplines within a competition)
-- ----------------------------------------------------------------------------
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Display name: "100m Men Final"
  event_code TEXT NOT NULL, -- Standard code: '100m', 'HJ', 'SP', 'LJ', etc.
  event_type event_type NOT NULL,
  gender gender_type NOT NULL,
  age_group TEXT DEFAULT 'Senior',
  round event_round NOT NULL DEFAULT 'final',
  scheduled_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checkin', 'in_progress', 'completed', 'cancelled')),
  -- Wind reading for sprints/horizontal jumps
  wind_reading DECIMAL(4,2),
  -- Event-specific settings
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
    Settings examples:
    Track: { "heat_count": 3, "lanes_per_heat": 8, "advance_rule": "Q3+4q" }
    Vertical: { "starting_height": 1.70, "height_increment": 0.05, "progression": [1.70, 1.75, 1.80, 1.85] }
    Horizontal: { "attempts_preliminary": 3, "attempts_final": 3, "top_n_to_final": 8 }
  */
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Athletes (Athlete database - can be shared across competitions)
-- ----------------------------------------------------------------------------
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender gender_type NOT NULL,
  nationality TEXT DEFAULT 'NOR',
  club_id UUID REFERENCES public.organizations(id),
  club_name TEXT, -- Denormalized for display
  license_number TEXT,
  wa_athlete_id TEXT, -- World Athletics ID
  profile_image_url TEXT,
  -- Social media links
  social_links JSONB DEFAULT '{}'::jsonb,
  -- Cached personal bests for quick display
  personal_bests JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Entries (Athletes registered for specific events)
-- ----------------------------------------------------------------------------
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  bib_number TEXT,
  seed_mark TEXT, -- Entry time/distance/height
  seed_mark_value DECIMAL(10,3), -- Numeric for sorting (seconds or meters)
  heat_number INT,
  lane_or_position INT,
  status entry_status NOT NULL DEFAULT 'registered',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, athlete_id)
);

-- ----------------------------------------------------------------------------
-- Track Results (Sprints, Middle Distance, Hurdles, Relays)
-- ----------------------------------------------------------------------------
CREATE TABLE public.track_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE UNIQUE,
  -- Time stored in milliseconds for precision (10.234s = 10234)
  time_ms INT,
  time_display TEXT, -- Formatted: "10.23" or "1:45.67"
  place INT,
  reaction_time_ms INT, -- Reaction time in milliseconds
  wind DECIMAL(4,2),
  status track_result_status NOT NULL DEFAULT 'finished',
  dq_rule TEXT, -- e.g., "TR16.8"
  qualification_mark qualification_mark,
  -- Split times for longer races (stored as array of ms values)
  splits INT[],
  -- Performance indicators
  is_pb BOOLEAN DEFAULT FALSE,
  is_sb BOOLEAN DEFAULT FALSE,
  record_type TEXT, -- 'WR', 'NR', 'MR', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Vertical Jump Results (High Jump, Pole Vault)
-- ----------------------------------------------------------------------------
CREATE TABLE public.vertical_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE UNIQUE,
  best_height DECIMAL(4,2), -- Best cleared height in meters
  total_attempts INT DEFAULT 0,
  total_misses INT DEFAULT 0,
  misses_at_best INT DEFAULT 0, -- For tie-breaking
  status vertical_status NOT NULL DEFAULT 'active',
  place INT,
  is_pb BOOLEAN DEFAULT FALSE,
  is_sb BOOLEAN DEFAULT FALSE,
  record_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Vertical Attempts (Individual attempts at each height)
-- ----------------------------------------------------------------------------
CREATE TABLE public.vertical_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES public.vertical_results(id) ON DELETE CASCADE,
  height DECIMAL(4,2) NOT NULL, -- Height in meters (e.g., 1.85)
  attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  outcome vertical_attempt_outcome NOT NULL,
  standards_position SMALLINT, -- Pole vault only, distance from back of box in cm
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(result_id, height, attempt_number)
);

-- ----------------------------------------------------------------------------
-- Field Results (Long Jump, Triple Jump, Shot Put, Discus, Javelin, Hammer)
-- ----------------------------------------------------------------------------
CREATE TABLE public.field_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE UNIQUE,
  best_mark DECIMAL(5,2), -- Best valid mark in meters
  best_mark_wind DECIMAL(4,2), -- Wind reading for best mark
  best_legal_mark DECIMAL(5,2), -- Best mark with legal wind (for records)
  attempts_taken INT DEFAULT 0,
  status field_status NOT NULL DEFAULT 'active',
  place INT,
  is_pb BOOLEAN DEFAULT FALSE,
  is_sb BOOLEAN DEFAULT FALSE,
  record_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Field Attempts (Individual attempts for horizontal jumps and throws)
-- ----------------------------------------------------------------------------
CREATE TABLE public.field_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES public.field_results(id) ON DELETE CASCADE,
  attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 6),
  distance DECIMAL(5,2), -- NULL if foul
  wind DECIMAL(4,2), -- NULL for throws
  is_foul BOOLEAN NOT NULL DEFAULT FALSE,
  is_pass BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(result_id, attempt_number)
);

-- ----------------------------------------------------------------------------
-- Personal Bests (Historical PB tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE public.personal_bests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  event_code TEXT NOT NULL, -- '100m', 'HJ', 'LJ', etc.
  result_value DECIMAL(10,3) NOT NULL, -- Time in seconds or distance in meters
  result_display TEXT NOT NULL, -- Formatted: "10.23" or "8.95"
  is_indoor BOOLEAN DEFAULT FALSE,
  wind DECIMAL(4,2),
  competition_name TEXT,
  competition_date DATE,
  location TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(athlete_id, event_code, is_indoor)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organizations
CREATE INDEX idx_organizations_name ON public.organizations(name);

-- Organization Members
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);

-- Competitions
CREATE INDEX idx_competitions_org ON public.competitions(organization_id);
CREATE INDEX idx_competitions_date ON public.competitions(date);
CREATE INDEX idx_competitions_status ON public.competitions(status);

-- Events
CREATE INDEX idx_events_competition ON public.events(competition_id);
CREATE INDEX idx_events_scheduled ON public.events(scheduled_time);
CREATE INDEX idx_events_status ON public.events(status);

-- Athletes
CREATE INDEX idx_athletes_name ON public.athletes(last_name, first_name);
CREATE INDEX idx_athletes_club ON public.athletes(club_id);
CREATE INDEX idx_athletes_license ON public.athletes(license_number);

-- Entries
CREATE INDEX idx_entries_competition ON public.entries(competition_id);
CREATE INDEX idx_entries_event ON public.entries(event_id);
CREATE INDEX idx_entries_athlete ON public.entries(athlete_id);
CREATE INDEX idx_entries_bib ON public.entries(competition_id, bib_number);

-- Results
CREATE INDEX idx_vertical_attempts_result ON public.vertical_attempts(result_id);
CREATE INDEX idx_vertical_attempts_height ON public.vertical_attempts(result_id, height);
CREATE INDEX idx_field_attempts_result ON public.field_attempts(result_id);

-- Personal Bests
CREATE INDEX idx_pbs_athlete ON public.personal_bests(athlete_id);
CREATE INDEX idx_pbs_event ON public.personal_bests(athlete_id, event_code);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_track_results_updated_at
  BEFORE UPDATE ON public.track_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vertical_results_updated_at
  BEFORE UPDATE ON public.vertical_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_field_results_updated_at
  BEFORE UPDATE ON public.field_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger to create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_bests ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Profiles Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Organizations Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Organizations are viewable by members"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- Organization Members Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view other members in same org"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage members"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Competitions Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Published competitions are public"
  ON public.competitions FOR SELECT
  USING (status IN ('published', 'active', 'completed'));

CREATE POLICY "Organization members can view all competitions"
  ON public.competitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = competitions.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Officials can create competitions"
  ON public.competitions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = competitions.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'official')
    )
  );

CREATE POLICY "Officials can update competitions"
  ON public.competitions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = competitions.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'official')
    )
  );

-- ----------------------------------------------------------------------------
-- Events Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Events are viewable with competition"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = events.competition_id
      AND (
        status IN ('published', 'active', 'completed')
        OR EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_id = competitions.organization_id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Officials can manage events"
  ON public.events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = events.competition_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

-- ----------------------------------------------------------------------------
-- Athletes Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Athletes are viewable by authenticated users"
  ON public.athletes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create athletes"
  ON public.athletes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organization members can update athletes"
  ON public.athletes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- Entries Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Entries are viewable with event"
  ON public.entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE events.id = entries.event_id
      AND (
        competitions.status IN ('published', 'active', 'completed')
        OR EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_id = competitions.organization_id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Officials can manage entries"
  ON public.entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE events.id = entries.event_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official', 'volunteer')
    )
  );

-- ----------------------------------------------------------------------------
-- Results Policies (Track, Vertical, Field)
-- All follow same pattern: public read, org members write
-- ----------------------------------------------------------------------------

-- Track Results
CREATE POLICY "Track results are public"
  ON public.track_results FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage track results"
  ON public.track_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entries
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE entries.id = track_results.entry_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Vertical Results
CREATE POLICY "Vertical results are public"
  ON public.vertical_results FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage vertical results"
  ON public.vertical_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entries
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE entries.id = vertical_results.entry_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Vertical Attempts
CREATE POLICY "Vertical attempts are public"
  ON public.vertical_attempts FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage vertical attempts"
  ON public.vertical_attempts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vertical_results
      JOIN public.entries ON entries.id = vertical_results.entry_id
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE vertical_results.id = vertical_attempts.result_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Field Results
CREATE POLICY "Field results are public"
  ON public.field_results FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage field results"
  ON public.field_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entries
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE entries.id = field_results.entry_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Field Attempts
CREATE POLICY "Field attempts are public"
  ON public.field_attempts FOR SELECT
  USING (true);

CREATE POLICY "Officials can manage field attempts"
  ON public.field_attempts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.field_results
      JOIN public.entries ON entries.id = field_results.entry_id
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE field_results.id = field_attempts.result_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Personal Bests
CREATE POLICY "Personal bests are public"
  ON public.personal_bests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage PBs"
  ON public.personal_bests FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for results tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.track_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vertical_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vertical_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
