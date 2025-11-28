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

export interface EntryResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export interface CreateEntryInput {
  competition_id: string;
  event_id: string;
  athlete_id: string;
  bib_number?: string;
  seed_mark?: string;
  seed_mark_value?: number;
  heat_number?: number;
  lane_or_position?: number;
}

export async function createEntry(input: CreateEntryInput): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to create an entry' };
  }

  // Check if entry already exists for this athlete/event combination
  const { data: existingEntry } = await supabase
    .from('entries')
    .select('id')
    .eq('event_id', input.event_id)
    .eq('athlete_id', input.athlete_id)
    .single();

  if (existingEntry) {
    return { error: 'This athlete is already registered for this event' };
  }

  const { data, error } = await supabase
    .from('entries')
    .insert({
      competition_id: input.competition_id,
      event_id: input.event_id,
      athlete_id: input.athlete_id,
      bib_number: input.bib_number || null,
      seed_mark: input.seed_mark || null,
      seed_mark_value: input.seed_mark_value || null,
      heat_number: input.heat_number || null,
      lane_or_position: input.lane_or_position || null,
      status: 'registered',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating entry:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${input.competition_id}`);

  return { success: true, id: data.id };
}

export async function getEntriesByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      athlete:athletes(
        id,
        first_name,
        last_name,
        club_name,
        nationality,
        gender
      )
    `)
    .eq('event_id', eventId)
    .order('lane_or_position', { ascending: true, nullsFirst: false })
    .order('seed_mark_value', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  return data || [];
}

export async function getEntriesByCompetition(competitionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      athlete:athletes(
        id,
        first_name,
        last_name,
        club_name
      ),
      event:events(
        id,
        name,
        event_code
      )
    `)
    .eq('competition_id', competitionId);

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  return data || [];
}

export async function getEntry(entryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      athlete:athletes(
        id,
        first_name,
        last_name,
        club_name,
        nationality,
        gender
      )
    `)
    .eq('id', entryId)
    .single();

  if (error) {
    console.error('Error fetching entry:', error);
    return null;
  }

  return data;
}

export async function updateEntry(
  entryId: string,
  updates: {
    bib_number?: string;
    seed_mark?: string;
    seed_mark_value?: number;
    heat_number?: number;
    lane_or_position?: number;
    status?: string;
  },
  competitionId: string
): Promise<EntryResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('entries')
    .update(updates)
    .eq('id', entryId);

  if (error) {
    console.error('Error updating entry:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return { success: true };
}

export async function updateEntryStatus(
  entryId: string,
  status: 'registered' | 'confirmed' | 'checked_in' | 'DNS' | 'scratched',
  competitionId: string
): Promise<EntryResult> {
  return updateEntry(entryId, { status }, competitionId);
}

export async function deleteEntry(entryId: string, competitionId: string): Promise<EntryResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    console.error('Error deleting entry:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return { success: true };
}

export async function getEntryCountsByEvent(competitionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('entries')
    .select('event_id')
    .eq('competition_id', competitionId);

  if (error) {
    console.error('Error fetching entry counts:', error);
    return {};
  }

  // Count entries per event
  const counts: Record<string, number> = {};
  for (const entry of data || []) {
    counts[entry.event_id] = (counts[entry.event_id] || 0) + 1;
  }

  return counts;
}
