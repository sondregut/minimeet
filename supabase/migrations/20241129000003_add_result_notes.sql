-- ============================================================================
-- Migration: Add Notes Field to Result Tables
-- Description: Adds a notes/comment field to track_results, field_results,
--              and vertical_results for officials to add annotations
-- ============================================================================

-- Add notes column to track_results
ALTER TABLE public.track_results
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes column to field_results
ALTER TABLE public.field_results
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes column to vertical_results
ALTER TABLE public.vertical_results
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.track_results.notes IS 'Optional notes/comments from officials about this result';
COMMENT ON COLUMN public.field_results.notes IS 'Optional notes/comments from officials about this result';
COMMENT ON COLUMN public.vertical_results.notes IS 'Optional notes/comments from officials about this result';
