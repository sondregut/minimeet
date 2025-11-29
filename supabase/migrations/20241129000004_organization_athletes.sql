-- ============================================================================
-- Migration: Organization-Scoped Athletes
-- Description: Add organization_id to athletes table for organization-level
--              athlete databases and add duplicate detection
-- ============================================================================

-- Step 1: Add organization_id column (nullable initially for migration)
ALTER TABLE public.athletes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 2: Create index for organization queries
CREATE INDEX IF NOT EXISTS idx_athletes_organization ON public.athletes(organization_id);

-- Step 3: Create index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_athletes_duplicate_check
ON public.athletes(organization_id, lower(first_name), lower(last_name), date_of_birth);

-- Step 4: Add unique constraint for duplicate prevention within an organization
-- Note: This allows same athlete in different organizations (e.g., athlete changes club)
-- Uses a partial index to handle NULL date_of_birth cases
CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_org_unique_with_dob
ON public.athletes(organization_id, lower(first_name), lower(last_name), date_of_birth)
WHERE date_of_birth IS NOT NULL AND organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_org_unique_without_dob
ON public.athletes(organization_id, lower(first_name), lower(last_name))
WHERE date_of_birth IS NULL AND organization_id IS NOT NULL;

-- Step 5: Update RLS policies for organization-scoped access
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Athletes are viewable by authenticated users" ON public.athletes;
DROP POLICY IF EXISTS "Authenticated users can create athletes" ON public.athletes;
DROP POLICY IF EXISTS "Organization members can update athletes" ON public.athletes;

-- New policy: Athletes viewable by organization members (or public athletes without org)
CREATE POLICY "Athletes viewable by org members or public"
ON public.athletes FOR SELECT
USING (
  organization_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = athletes.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- New policy: Only org members can create athletes in their organization
CREATE POLICY "Org members can create athletes"
ON public.athletes FOR INSERT
WITH CHECK (
  organization_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = athletes.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- New policy: Only org members can update their organization's athletes
CREATE POLICY "Org members can update their athletes"
ON public.athletes FOR UPDATE
USING (
  organization_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = athletes.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- New policy: Only org admins can delete athletes
CREATE POLICY "Org admins can delete athletes"
ON public.athletes FOR DELETE
USING (
  organization_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = athletes.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Step 6: Add season_bests table for tracking seasonal performance
CREATE TABLE IF NOT EXISTS public.season_bests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  season_year INT NOT NULL,
  result_value DECIMAL(10,3) NOT NULL,
  result_display TEXT NOT NULL,
  is_indoor BOOLEAN DEFAULT FALSE,
  wind DECIMAL(4,2),
  competition_name TEXT,
  competition_date DATE,
  location TEXT,
  set_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(athlete_id, event_code, season_year, is_indoor)
);

-- Enable RLS on season_bests
ALTER TABLE public.season_bests ENABLE ROW LEVEL SECURITY;

-- Season bests policies (inherit from athlete access)
CREATE POLICY "Season bests viewable if athlete viewable"
ON public.season_bests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.athletes
    WHERE athletes.id = season_bests.athlete_id
    AND (
      athletes.organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = athletes.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Authenticated users can manage season bests"
ON public.season_bests FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create index for season bests queries
CREATE INDEX IF NOT EXISTS idx_season_bests_athlete ON public.season_bests(athlete_id);
CREATE INDEX IF NOT EXISTS idx_season_bests_lookup ON public.season_bests(athlete_id, event_code, season_year);

-- Add comment for documentation
COMMENT ON COLUMN public.athletes.organization_id IS 'Organization that owns/manages this athlete. NULL for legacy/unassigned athletes.';
COMMENT ON TABLE public.season_bests IS 'Season best performances by athlete, auto-reset yearly';
