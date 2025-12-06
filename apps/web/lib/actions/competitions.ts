'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

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

export interface CompetitionResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export async function createCompetition(formData: FormData): Promise<CompetitionResult> {
  const name = formData.get('name') as string;
  const date = formData.get('date') as string;
  const location = formData.get('location') as string;
  const venue = formData.get('venue') as string;
  const description = formData.get('description') as string;
  const organizationId = formData.get('organizationId') as string;
  const venueType = formData.get('venue_type') as string || 'outdoor';
  const timingSystem = formData.get('timing_system') as string || 'manual';

  if (!name || !date || !location) {
    return { error: 'Navn, dato og sted er påkrevd' };
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn for å opprette et stevne' };
  }

  // Create the competition with venue_type in settings
  const { data, error } = await supabase
    .from('competitions')
    .insert({
      name,
      date,
      location,
      venue: venue || null,
      description: description || null,
      organization_id: organizationId || null,
      created_by: user.id,
      status: 'draft',
      settings: {
        venue_type: venueType, // 'indoor', 'outdoor', or 'road'
        timing_system: timingSystem, // 'manual', 'alge', 'finishlynx', etc.
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating competition:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/competitions');

  return { success: true, id: data.id };
}

export async function getCompetitions() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('created_by', user.id)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching competitions:', error);
    return [];
  }

  return data || [];
}

export async function getCompetition(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .eq('created_by', user.id)
    .single();

  if (error) {
    console.error('Error fetching competition:', error);
    return null;
  }

  return data;
}

export async function updateCompetitionStatus(id: string, status: string): Promise<CompetitionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('competitions')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating competition status:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/competitions');
  revalidatePath(`/dashboard/competitions/${id}`);

  return { success: true };
}

export async function updateCompetition(id: string, formData: FormData): Promise<CompetitionResult> {
  const name = formData.get('name') as string;
  const date = formData.get('date') as string;
  const location = formData.get('location') as string;
  const venue = formData.get('venue') as string;
  const description = formData.get('description') as string;
  const venueType = formData.get('venue_type') as string || 'outdoor';
  const timingSystem = formData.get('timing_system') as string || 'manual';

  if (!name || !date || !location) {
    return { error: 'Navn, dato og sted er påkrevd' };
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn' };
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('competitions')
    .select('id, created_by, settings')
    .eq('id', id)
    .eq('created_by', user.id)
    .single();

  if (!existing) {
    return { error: 'Stevne ikke funnet' };
  }

  // Merge existing settings with new ones
  const existingSettings = (existing.settings as Record<string, unknown>) || {};
  const newSettings = {
    ...existingSettings,
    venue_type: venueType,
    timing_system: timingSystem,
  };

  const { error } = await supabase
    .from('competitions')
    .update({
      name,
      date,
      location,
      venue: venue || null,
      description: description || null,
      settings: newSettings,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating competition:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/competitions');
  revalidatePath(`/dashboard/competitions/${id}`);
  revalidatePath(`/dashboard/competitions/${id}/settings`);

  return { success: true, id };
}
