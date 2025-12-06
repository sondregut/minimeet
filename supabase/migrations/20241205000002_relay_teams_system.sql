-- Relay Teams System Migration
-- Version: 1.0.0
-- Date: 2024-12-05
-- Description: Adds support for relay team management with per-leg athlete assignment

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Relay Teams (Stafettlag - team entries for relay events)
-- ----------------------------------------------------------------------------
-- A relay team represents a club's entry in a relay event.
-- Unlike individual entries, relay teams are registered by club name first,
-- then athletes are assigned to each leg before the competition.
CREATE TABLE public.relay_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to the event
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,

  -- Club/Organization that the team represents
  club_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  club_name TEXT NOT NULL, -- Denormalized for display (e.g., "BUL", "Tjalve")

  -- Team identification
  team_name TEXT NOT NULL, -- e.g., "BUL Lag 1", "Tjalve A"
  bib_number TEXT, -- Team bib number for timing system

  -- Seed/entry time
  seed_time TEXT, -- Display format (e.g., "45.32", "3:28.50")
  seed_time_ms INT, -- Milliseconds for sorting

  -- Heat assignment (populated when heats are generated)
  heat_number INT,
  lane_or_position INT,

  -- Status workflow
  status entry_status NOT NULL DEFAULT 'registered',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.relay_teams IS 'Represents a relay team entry in an event';
COMMENT ON COLUMN public.relay_teams.club_name IS 'Denormalized club name for display';
COMMENT ON COLUMN public.relay_teams.team_name IS 'Full team name including qualifier (e.g., BUL Lag 1)';
COMMENT ON COLUMN public.relay_teams.seed_time_ms IS 'Seed time in milliseconds for sorting';

-- ----------------------------------------------------------------------------
-- Relay Team Legs (Etapper - athletes assigned to each leg)
-- ----------------------------------------------------------------------------
-- Each relay team has multiple legs (etapper). Athletes can be assigned
-- to each leg. The leg_order determines who runs which leg.
-- Athletes are typically assigned 1 hour before start.
CREATE TABLE public.relay_team_legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to relay team
  relay_team_id UUID NOT NULL REFERENCES public.relay_teams(id) ON DELETE CASCADE,

  -- Athlete assignment (can be NULL before athletes are assigned)
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,

  -- Leg position
  leg_number INT NOT NULL CHECK (leg_number >= 1 AND leg_number <= 8), -- Supports up to 8x relays

  -- Status for this leg
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'DNS', 'scratched')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each relay team can only have one athlete per leg
  UNIQUE(relay_team_id, leg_number)
);

-- Add comments
COMMENT ON TABLE public.relay_team_legs IS 'Athletes assigned to each leg of a relay team';
COMMENT ON COLUMN public.relay_team_legs.leg_number IS 'Which leg this athlete runs (1, 2, 3, 4, etc.)';
COMMENT ON COLUMN public.relay_team_legs.status IS 'Status of this leg assignment';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Relay teams indexes
CREATE INDEX idx_relay_teams_event ON public.relay_teams(event_id);
CREATE INDEX idx_relay_teams_competition ON public.relay_teams(competition_id);
CREATE INDEX idx_relay_teams_club ON public.relay_teams(club_id);
CREATE INDEX idx_relay_teams_status ON public.relay_teams(status);
CREATE INDEX idx_relay_teams_heat ON public.relay_teams(event_id, heat_number);

-- Relay team legs indexes
CREATE INDEX idx_relay_team_legs_team ON public.relay_team_legs(relay_team_id);
CREATE INDEX idx_relay_team_legs_athlete ON public.relay_team_legs(athlete_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_relay_teams_updated_at
  BEFORE UPDATE ON public.relay_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_relay_team_legs_updated_at
  BEFORE UPDATE ON public.relay_team_legs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.relay_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relay_team_legs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Relay Teams Policies
-- ----------------------------------------------------------------------------

-- Public read for published/active competitions
CREATE POLICY "Public can view relay teams for public competitions"
  ON public.relay_teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions c
      WHERE c.id = competition_id
      AND c.status IN ('published', 'active', 'completed')
    )
  );

-- Organization members can manage relay teams for their competitions
CREATE POLICY "Organization members can manage relay teams"
  ON public.relay_teams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = competition_id
      AND om.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Relay Team Legs Policies
-- ----------------------------------------------------------------------------

-- Public read for legs of public competitions
CREATE POLICY "Public can view relay team legs for public competitions"
  ON public.relay_team_legs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relay_teams rt
      JOIN public.competitions c ON c.id = rt.competition_id
      WHERE rt.id = relay_team_id
      AND c.status IN ('published', 'active', 'completed')
    )
  );

-- Organization members can manage legs for their competitions
CREATE POLICY "Organization members can manage relay team legs"
  ON public.relay_team_legs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.relay_teams rt
      JOIN public.competitions c ON c.id = rt.competition_id
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE rt.id = relay_team_id
      AND om.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get number of legs for a relay event based on event_code
CREATE OR REPLACE FUNCTION public.get_relay_leg_count(event_code TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE
    WHEN event_code LIKE '3x%' THEN 3
    WHEN event_code LIKE '4x%' THEN 4
    WHEN event_code LIKE '8x%' THEN 8
    WHEN event_code = 'donaldstafett' THEN 4 -- Donald relay has 4 legs
    WHEN event_code LIKE 'hurricane_%' THEN 3 -- Hurricane relays have 3 legs
    ELSE 4 -- Default to 4 legs
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.get_relay_leg_count IS 'Returns the number of legs for a relay event based on event code';

-- Function to create empty leg entries when a relay team is created
CREATE OR REPLACE FUNCTION public.create_relay_team_legs()
RETURNS TRIGGER AS $$
DECLARE
  leg_count INT;
  i INT;
  evt_code TEXT;
BEGIN
  -- Get the event code
  SELECT event_code INTO evt_code
  FROM public.events
  WHERE id = NEW.event_id;

  -- Get number of legs for this relay type
  leg_count := public.get_relay_leg_count(evt_code);

  -- Create empty leg entries
  FOR i IN 1..leg_count LOOP
    INSERT INTO public.relay_team_legs (relay_team_id, leg_number, status)
    VALUES (NEW.id, i, 'pending');
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create legs when relay team is created
CREATE TRIGGER create_relay_legs_on_team_insert
  AFTER INSERT ON public.relay_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.create_relay_team_legs();
