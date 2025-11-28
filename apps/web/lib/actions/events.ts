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

export interface EventResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export interface CreateEventInput {
  competition_id: string;
  event_code: string;
  name: string;
  event_type: 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'combined' | 'relay' | 'road';
  gender: 'M' | 'W' | 'X';
  age_group?: string;
  round?: 'final' | 'semi' | 'heat' | 'qualification';
  scheduled_time?: string;
}

export async function createEvent(input: CreateEventInput): Promise<EventResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to create an event' };
  }

  // Get the competition to get its date for the scheduled_time
  const { data: competition } = await supabase
    .from('competitions')
    .select('date')
    .eq('id', input.competition_id)
    .single();

  // Get max sort_order for this competition
  const { data: existingEvents } = await supabase
    .from('events')
    .select('sort_order')
    .eq('competition_id', input.competition_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingEvents && existingEvents.length > 0
    ? (existingEvents[0].sort_order || 0) + 1
    : 0;

  // Convert time-only value (e.g., "22:10") to full timestamp using competition date
  let scheduledTime: string | null = null;
  if (input.scheduled_time && competition?.date) {
    // Combine competition date with the time
    scheduledTime = `${competition.date}T${input.scheduled_time}:00`;
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      competition_id: input.competition_id,
      event_code: input.event_code,
      name: input.name,
      event_type: input.event_type,
      gender: input.gender,
      age_group: input.age_group || 'Senior',
      round: input.round || 'final',
      scheduled_time: scheduledTime,
      status: 'scheduled',
      sort_order: nextSortOrder,
      settings: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${input.competition_id}`);

  return { success: true, id: data.id };
}

export async function getEventsByCompetition(competitionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('competition_id', competitionId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return data || [];
}

export async function getEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return data;
}

export async function updateEventStatus(eventId: string, status: string): Promise<EventResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event status:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/competitions');

  return { success: true };
}

export async function deleteEvent(eventId: string, competitionId: string): Promise<EventResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return { success: true };
}
