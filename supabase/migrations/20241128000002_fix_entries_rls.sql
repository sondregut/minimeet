-- Fix RLS policies for entries to work with simplified competition ownership
-- Version: 1.0.2
-- Date: 2024-11-28

-- ============================================================================
-- Drop existing entries policies
-- ============================================================================
DROP POLICY IF EXISTS "Entries are viewable with event" ON public.entries;
DROP POLICY IF EXISTS "Officials can manage entries" ON public.entries;

-- ============================================================================
-- Create simplified entries policies
-- ============================================================================

-- Anyone can view entries for published competitions
CREATE POLICY "Entries are public for published competitions"
  ON public.entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = entries.competition_id
      AND competitions.status IN ('published', 'active', 'completed')
    )
  );

-- Competition creators can view all their entries
CREATE POLICY "Users can view entries for their competitions"
  ON public.entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = entries.competition_id
      AND competitions.created_by = auth.uid()
    )
  );

-- Competition creators can create entries
CREATE POLICY "Users can create entries for their competitions"
  ON public.entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = entries.competition_id
      AND competitions.created_by = auth.uid()
    )
  );

-- Competition creators can update entries
CREATE POLICY "Users can update entries for their competitions"
  ON public.entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = entries.competition_id
      AND competitions.created_by = auth.uid()
    )
  );

-- Competition creators can delete entries
CREATE POLICY "Users can delete entries for their competitions"
  ON public.entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = entries.competition_id
      AND competitions.created_by = auth.uid()
    )
  );
