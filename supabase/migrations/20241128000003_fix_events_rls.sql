-- Fix events RLS policy for INSERT operations
-- The FOR ALL policy needs WITH CHECK clause for inserts

-- Drop existing policy
DROP POLICY IF EXISTS "Officials can manage events" ON public.events;

-- Recreate with proper WITH CHECK clause
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competitions
      JOIN public.organization_members ON organization_members.organization_id = competitions.organization_id
      WHERE competitions.id = events.competition_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'official')
    )
  );
