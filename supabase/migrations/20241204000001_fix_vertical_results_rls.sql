-- Fix RLS policies for vertical_results and vertical_attempts
-- The existing FOR ALL USING policy doesn't work for INSERT operations
-- because INSERT requires WITH CHECK, not USING
-- Version: 1.0.0
-- Date: 2024-12-04

-- ============================================================================
-- Drop existing vertical_results policies
-- ============================================================================
DROP POLICY IF EXISTS "Vertical results are public" ON public.vertical_results;
DROP POLICY IF EXISTS "Officials can manage vertical results" ON public.vertical_results;

-- ============================================================================
-- Create new vertical_results policies with proper INSERT support
-- ============================================================================

-- Anyone can view vertical results
CREATE POLICY "Vertical results are public"
  ON public.vertical_results FOR SELECT
  USING (true);

-- Competition creators can create vertical results
CREATE POLICY "Users can create vertical results for their competitions"
  ON public.vertical_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entries
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE entries.id = vertical_results.entry_id
      AND competitions.created_by = auth.uid()
    )
  );

-- Competition creators can update vertical results
CREATE POLICY "Users can update vertical results for their competitions"
  ON public.vertical_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.entries
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE entries.id = vertical_results.entry_id
      AND competitions.created_by = auth.uid()
    )
  );

-- Competition creators can delete vertical results
CREATE POLICY "Users can delete vertical results for their competitions"
  ON public.vertical_results FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.entries
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE entries.id = vertical_results.entry_id
      AND competitions.created_by = auth.uid()
    )
  );

-- ============================================================================
-- Drop existing vertical_attempts policies
-- ============================================================================
DROP POLICY IF EXISTS "Vertical attempts are public" ON public.vertical_attempts;
DROP POLICY IF EXISTS "Officials can manage vertical attempts" ON public.vertical_attempts;

-- ============================================================================
-- Create new vertical_attempts policies with proper INSERT support
-- ============================================================================

-- Anyone can view vertical attempts
CREATE POLICY "Vertical attempts are public"
  ON public.vertical_attempts FOR SELECT
  USING (true);

-- Competition creators can create vertical attempts
CREATE POLICY "Users can create vertical attempts for their competitions"
  ON public.vertical_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vertical_results
      JOIN public.entries ON entries.id = vertical_results.entry_id
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE vertical_results.id = vertical_attempts.result_id
      AND competitions.created_by = auth.uid()
    )
  );

-- Competition creators can update vertical attempts
CREATE POLICY "Users can update vertical attempts for their competitions"
  ON public.vertical_attempts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vertical_results
      JOIN public.entries ON entries.id = vertical_results.entry_id
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE vertical_results.id = vertical_attempts.result_id
      AND competitions.created_by = auth.uid()
    )
  );

-- Competition creators can delete vertical attempts
CREATE POLICY "Users can delete vertical attempts for their competitions"
  ON public.vertical_attempts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.vertical_results
      JOIN public.entries ON entries.id = vertical_results.entry_id
      JOIN public.events ON events.id = entries.event_id
      JOIN public.competitions ON competitions.id = events.competition_id
      WHERE vertical_results.id = vertical_attempts.result_id
      AND competitions.created_by = auth.uid()
    )
  );
