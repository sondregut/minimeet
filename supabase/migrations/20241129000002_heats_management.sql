-- Heats Management Schema
-- Supports multi-round track events with heats, semis, and finals

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Heat status enum
CREATE TYPE heat_status AS ENUM (
  'scheduled',    -- Heat is scheduled
  'in_progress',  -- Heat is currently running
  'completed',    -- Heat is finished
  'cancelled'     -- Heat was cancelled
);

-- Heats table - represents individual heats within an event round
CREATE TABLE public.heats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  heat_number INT NOT NULL,
  name TEXT, -- Optional custom name like "Heat 1A"
  scheduled_time TIMESTAMPTZ,
  status heat_status NOT NULL DEFAULT 'scheduled',
  wind_reading DECIMAL(4,2), -- Wind for this specific heat
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, heat_number)
);

-- Heat entries - links entries to specific heats with lane assignments
CREATE TABLE public.heat_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  heat_id UUID NOT NULL REFERENCES public.heats(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  lane INT, -- Lane assignment (1-8 typically)
  position INT, -- For non-lane events, order/position
  seed_time_ms INT, -- Seed time in milliseconds for seeding
  result_time_ms INT, -- Actual result time in milliseconds
  result_place INT, -- Place within this heat
  qualification_mark TEXT, -- 'Q' = qualified by place, 'q' = qualified by time
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'DNS', 'DNF', 'DQ', 'finished')),
  reaction_time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(heat_id, entry_id),
  UNIQUE(heat_id, lane) -- Each lane can only have one entry per heat
);

-- Add columns to events for heat configuration
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS num_lanes INT DEFAULT 8,
ADD COLUMN IF NOT EXISTS advancement_rule JSONB DEFAULT '{"by_place": 2, "by_time": 2}'::jsonb,
ADD COLUMN IF NOT EXISTS has_heats BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX idx_heats_event ON public.heats(event_id);
CREATE INDEX idx_heats_status ON public.heats(status);
CREATE INDEX idx_heat_entries_heat ON public.heat_entries(heat_id);
CREATE INDEX idx_heat_entries_entry ON public.heat_entries(entry_id);
CREATE INDEX idx_heat_entries_lane ON public.heat_entries(heat_id, lane);

-- Triggers for updated_at
CREATE TRIGGER update_heats_updated_at
  BEFORE UPDATE ON public.heats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_heat_entries_updated_at
  BEFORE UPDATE ON public.heat_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for heats
ALTER TABLE public.heats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heat_entries ENABLE ROW LEVEL SECURITY;

-- Public can view heats of public events
CREATE POLICY "Public can view heats of public events"
  ON public.heats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE events.id = heats.event_id
      AND events.is_public = true
      AND competitions.status IN ('published', 'active', 'completed')
    )
  );

-- Officials can manage heats
CREATE POLICY "Officials can manage heats"
  ON public.heats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE events.id = heats.event_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE events.id = heats.event_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

-- Public can view heat entries of public events
CREATE POLICY "Public can view heat entries of public events"
  ON public.heat_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.heats
      JOIN public.events ON events.id = heats.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE heats.id = heat_entries.heat_id
      AND events.is_public = true
      AND competitions.status IN ('published', 'active', 'completed')
    )
  );

-- Officials can manage heat entries
CREATE POLICY "Officials can manage heat entries"
  ON public.heat_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.heats
      JOIN public.events ON events.id = heats.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE heats.id = heat_entries.heat_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.heats
      JOIN public.events ON events.id = heats.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE heats.id = heat_entries.heat_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );

COMMENT ON TABLE public.heats IS 'Individual heats within a track event round';
COMMENT ON TABLE public.heat_entries IS 'Entry assignments to heats with lane/position and results';
COMMENT ON COLUMN public.events.advancement_rule IS 'JSON config for advancement: {"by_place": N, "by_time": M} means top N by place + next M fastest advance';
