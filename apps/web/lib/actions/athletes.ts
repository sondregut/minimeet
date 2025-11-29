'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { CreateAthleteInput, Athlete } from '@minimeet/types';

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export interface AthleteResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export interface BulkImportResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingAthlete?: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
  };
}

/**
 * Check for duplicate athlete in organization
 */
export async function checkDuplicateAthlete(
  organizationId: string,
  firstName: string,
  lastName: string,
  dateOfBirth?: string | null
): Promise<DuplicateCheckResult> {
  const supabase = await createClient();

  let query = supabase
    .from('athletes')
    .select('id, first_name, last_name, date_of_birth')
    .eq('organization_id', organizationId)
    .ilike('first_name', firstName)
    .ilike('last_name', lastName);

  if (dateOfBirth) {
    query = query.eq('date_of_birth', dateOfBirth);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error checking for duplicate:', error);
    return { isDuplicate: false };
  }

  if (data) {
    return {
      isDuplicate: true,
      existingAthlete: data,
    };
  }

  return { isDuplicate: false };
}

/**
 * Get user's default organization
 */
export async function getUserDefaultOrganization(): Promise<string | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  return data?.organization_id || null;
}

/**
 * Create a single athlete (organization-scoped)
 */
export async function createAthlete(
  data: CreateAthleteInput & { organization_id?: string }
): Promise<AthleteResult> {
  if (!data.first_name || !data.last_name || !data.gender) {
    return { error: 'First name, last name, and gender are required' };
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to create an athlete' };
  }

  // Get organization_id - either from input or user's default
  let organizationId = data.organization_id;
  if (!organizationId) {
    organizationId = await getUserDefaultOrganization() || undefined;
  }

  // Check for duplicates if organization is set
  if (organizationId) {
    const duplicateCheck = await checkDuplicateAthlete(
      organizationId,
      data.first_name,
      data.last_name,
      data.date_of_birth
    );

    if (duplicateCheck.isDuplicate) {
      return {
        error: `Athlete "${data.first_name} ${data.last_name}" already exists in this organization`,
      };
    }
  }

  const { data: athlete, error } = await supabase
    .from('athletes')
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      gender: data.gender,
      date_of_birth: data.date_of_birth || null,
      nationality: data.nationality || 'NOR',
      club_id: data.club_id || null,
      club_name: data.club_name || null,
      license_number: data.license_number || null,
      organization_id: organizationId || null,
      social_links: {},
      personal_bests: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating athlete:', error);
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { error: 'An athlete with this name already exists in your organization' };
    }
    return { error: error.message };
  }

  revalidatePath('/dashboard/athletes');

  return { success: true, id: athlete.id };
}

/**
 * Bulk import multiple athletes (organization-scoped)
 */
export async function bulkCreateAthletes(
  athletes: (CreateAthleteInput & { organization_id?: string })[],
  organizationId?: string
): Promise<BulkImportResult> {
  if (!athletes || athletes.length === 0) {
    return {
      success: false,
      totalCount: 0,
      successCount: 0,
      errorCount: 0,
      errors: [{ row: 0, message: 'No athletes to import' }],
    };
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      totalCount: athletes.length,
      successCount: 0,
      errorCount: athletes.length,
      errors: [{ row: 0, message: 'You must be logged in to import athletes' }],
    };
  }

  // Get organization_id if not provided
  const orgId = organizationId || await getUserDefaultOrganization();

  const errors: Array<{ row: number; message: string }> = [];
  let successCount = 0;

  // Prepare athletes for bulk insert
  const athletesToInsert = athletes.map((athlete, index) => {
    // Validate required fields
    if (!athlete.first_name || !athlete.last_name || !athlete.gender) {
      errors.push({
        row: index + 1,
        message: 'Missing required fields (first_name, last_name, or gender)',
      });
      return null;
    }

    return {
      first_name: athlete.first_name,
      last_name: athlete.last_name,
      gender: athlete.gender,
      date_of_birth: athlete.date_of_birth || null,
      nationality: athlete.nationality || 'NOR',
      club_id: athlete.club_id || null,
      club_name: athlete.club_name || null,
      license_number: athlete.license_number || null,
      organization_id: athlete.organization_id || orgId || null,
      social_links: {},
      personal_bests: {},
    };
  }).filter((a): a is NonNullable<typeof a> => a !== null);

  if (athletesToInsert.length === 0) {
    return {
      success: false,
      totalCount: athletes.length,
      successCount: 0,
      errorCount: errors.length,
      errors,
    };
  }

  // Bulk insert using Supabase
  const { data: insertedAthletes, error } = await supabase
    .from('athletes')
    .insert(athletesToInsert)
    .select();

  if (error) {
    console.error('Error bulk importing athletes:', error);
    // Handle unique constraint violation
    if (error.code === '23505') {
      return {
        success: false,
        totalCount: athletes.length,
        successCount: 0,
        errorCount: athletes.length,
        errors: [{ row: 0, message: 'Duplicate athletes detected. Some athletes already exist in your organization.' }],
      };
    }
    return {
      success: false,
      totalCount: athletes.length,
      successCount: 0,
      errorCount: athletes.length,
      errors: [{ row: 0, message: error.message }],
    };
  }

  successCount = insertedAthletes?.length || 0;

  revalidatePath('/dashboard/athletes');

  return {
    success: successCount > 0,
    totalCount: athletes.length,
    successCount,
    errorCount: errors.length,
    errors,
  };
}

/**
 * Get all athletes (optionally filtered by organization)
 */
export async function getAthletes(organizationId?: string): Promise<Athlete[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from('athletes')
    .select('*')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  // Filter by organization if provided
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching athletes:', error);
    return [];
  }

  return (data as Athlete[]) || [];
}

/**
 * Get athletes by organization
 */
export async function getAthletesByOrganization(organizationId: string): Promise<Athlete[]> {
  return getAthletes(organizationId);
}

/**
 * Get athletes for the user's organizations
 */
export async function getMyOrganizationAthletes(): Promise<Athlete[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get user's organizations
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const orgIds = memberships.map(m => m.organization_id);

  // Get athletes from those organizations (including unassigned/null org_id)
  // Join with organizations to get org name
  const { data, error } = await supabase
    .from('athletes')
    .select(`
      *,
      organization:organizations(id, name)
    `)
    .or(`organization_id.in.(${orgIds.join(',')}),organization_id.is.null`)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching athletes:', error);
    return [];
  }

  return (data as Athlete[]) || [];
}

/**
 * Get a single athlete by ID
 */
export async function getAthlete(id: string): Promise<Athlete | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching athlete:', error);
    return null;
  }

  return data as Athlete;
}

/**
 * Delete an athlete
 */
export async function deleteAthlete(id: string): Promise<AthleteResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete an athlete' };
  }

  const { error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting athlete:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/athletes');

  return { success: true };
}
