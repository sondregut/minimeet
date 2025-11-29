-- Event Status Enhancements
-- Adds more status options and visibility controls

-- 1. Create a proper enum for event status
CREATE TYPE event_status AS ENUM (
  'draft',        -- Event created but not ready
  'scheduled',    -- Ready and visible in schedule
  'checkin',      -- Check-in is open
  'in_progress',  -- Currently running
  'official',     -- Results are official/final
  'completed',    -- Event is done
  'cancelled'     -- Event was cancelled
);

-- 2. Add is_public column for visibility control
ALTER TABLE public.events
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- 3. Migrate status column from TEXT to ENUM
-- First, create a temp column
ALTER TABLE public.events
ADD COLUMN status_new event_status NOT NULL DEFAULT 'scheduled';

-- Copy data, mapping old values to new
UPDATE public.events SET status_new =
  CASE
    WHEN status = 'scheduled' THEN 'scheduled'::event_status
    WHEN status = 'checkin' THEN 'checkin'::event_status
    WHEN status = 'in_progress' THEN 'in_progress'::event_status
    WHEN status = 'completed' THEN 'completed'::event_status
    WHEN status = 'cancelled' THEN 'cancelled'::event_status
    ELSE 'scheduled'::event_status
  END;

-- Drop old column and rename new one
ALTER TABLE public.events DROP COLUMN status;
ALTER TABLE public.events RENAME COLUMN status_new TO status;

-- 4. Add index for visibility filtering
CREATE INDEX idx_events_public ON public.events(is_public);

-- 5. Update RLS policy to respect visibility
DROP POLICY IF EXISTS "Public can view events of public competitions" ON public.events;

CREATE POLICY "Public can view public events of public competitions"
  ON public.events FOR SELECT
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = events.competition_id
      AND competitions.status IN ('published', 'active', 'completed')
    )
    OR EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = events.competition_id
      AND organization_members.user_id = auth.uid()
    )
  );

COMMENT ON COLUMN public.events.is_public IS 'Controls visibility on public results pages';
COMMENT ON COLUMN public.events.status IS 'Event lifecycle status: draft -> scheduled -> checkin -> in_progress -> official -> completed';
