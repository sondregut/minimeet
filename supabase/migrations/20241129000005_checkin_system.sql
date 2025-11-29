-- ============================================================================
-- Migration: Check-in System
-- Description: Add check-in deadline to events and create call room view
-- ============================================================================

-- Step 1: Add check-in deadline column to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS checkin_deadline TIMESTAMPTZ;

-- Step 2: Add checkin_opened_at to track when check-in was opened
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS checkin_opened_at TIMESTAMPTZ;

-- Step 3: Create index for finding events with open check-in
CREATE INDEX IF NOT EXISTS idx_events_checkin_status
ON public.events(competition_id, status)
WHERE status = 'checkin';

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.events.checkin_deadline IS 'Deadline for athletes to check in. After this time, unchecked athletes may be scratched.';
COMMENT ON COLUMN public.events.checkin_opened_at IS 'Timestamp when check-in was opened for this event.';
