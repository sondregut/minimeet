-- Fix RLS policies to avoid infinite recursion
-- Version: 1.0.1
-- Date: 2024-11-28

-- ============================================================================
-- Fix competitions table to allow NULL organization_id
-- ============================================================================
ALTER TABLE public.competitions
  ALTER COLUMN organization_id DROP NOT NULL;

-- ============================================================================
-- Drop problematic policies
-- ============================================================================

-- Drop organization_members policies (they cause infinite recursion)
DROP POLICY IF EXISTS "Members can view other members in same org" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;

-- Drop competitions policies that depend on organization_members
DROP POLICY IF EXISTS "Organization members can view all competitions" ON public.competitions;
DROP POLICY IF EXISTS "Officials can create competitions" ON public.competitions;
DROP POLICY IF EXISTS "Officials can update competitions" ON public.competitions;

-- ============================================================================
-- Create new, simpler policies
-- ============================================================================

-- Organization Members: Use a simple approach - authenticated users can see memberships
CREATE POLICY "Authenticated users can view organization members"
  ON public.organization_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own membership"
  ON public.organization_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON public.organization_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own membership"
  ON public.organization_members FOR DELETE
  USING (auth.uid() = user_id);

-- Competitions: Allow users to manage their own competitions
CREATE POLICY "Users can view their own competitions"
  ON public.competitions FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create competitions"
  ON public.competitions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own competitions"
  ON public.competitions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own competitions"
  ON public.competitions FOR DELETE
  USING (auth.uid() = created_by);
