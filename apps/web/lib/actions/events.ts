'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  type EventStatus,
  VALID_TRANSITIONS,
  type EventResult,
  type CreateEventInput,
  type BulkCreateEventInput,
} from '@/lib/constants/event-status';

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

// EventResult, CreateEventInput, BulkCreateEventInput are imported from '@/lib/constants/event-status'

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

// EventStatus type is imported from @/lib/constants/event-status

export async function updateEventStatus(
  eventId: string,
  status: EventStatus,
  competitionId?: string
): Promise<EventResult> {
  const supabase = await createClient();

  // Validate status transition
  const { data: currentEvent } = await supabase
    .from('events')
    .select('status, competition_id')
    .eq('id', eventId)
    .single();

  if (!currentEvent) {
    return { error: 'Event not found' };
  }

  const currentStatus = currentEvent.status as EventStatus;
  if (!VALID_TRANSITIONS[currentStatus]?.includes(status)) {
    return { error: `Cannot transition from ${currentStatus} to ${status}` };
  }

  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event status:', error);
    return { error: error.message };
  }

  const compId = competitionId || currentEvent.competition_id;
  revalidatePath(`/dashboard/competitions/${compId}`);
  revalidatePath(`/dashboard/competitions/${compId}/control`);
  revalidatePath(`/dashboard/competitions/${compId}/events/${eventId}`);

  return { success: true };
}

// Update event visibility
export async function updateEventVisibility(
  eventId: string,
  isPublic: boolean,
  competitionId?: string
): Promise<EventResult> {
  const supabase = await createClient();

  const { data: currentEvent } = await supabase
    .from('events')
    .select('competition_id')
    .eq('id', eventId)
    .single();

  if (!currentEvent) {
    return { error: 'Event not found' };
  }

  const { error } = await supabase
    .from('events')
    .update({ is_public: isPublic })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event visibility:', error);
    return { error: error.message };
  }

  const compId = competitionId || currentEvent.competition_id;
  revalidatePath(`/dashboard/competitions/${compId}`);
  revalidatePath(`/dashboard/competitions/${compId}/control`);

  return { success: true };
}

// Bulk update event status
export async function bulkUpdateEventStatus(
  eventIds: string[],
  status: EventStatus,
  competitionId: string
): Promise<{ success?: boolean; error?: string; updated?: number }> {
  const supabase = await createClient();

  if (eventIds.length === 0) {
    return { error: 'No events selected' };
  }

  // For bulk updates, we skip transition validation to allow admins to force status
  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .in('id', eventIds)
    .select();

  if (error) {
    console.error('Error bulk updating event status:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);
  revalidatePath(`/dashboard/competitions/${competitionId}/control`);

  return { success: true, updated: data?.length || 0 };
}

// Bulk update event visibility
export async function bulkUpdateEventVisibility(
  eventIds: string[],
  isPublic: boolean,
  competitionId: string
): Promise<{ success?: boolean; error?: string; updated?: number }> {
  const supabase = await createClient();

  if (eventIds.length === 0) {
    return { error: 'No events selected' };
  }

  const { data, error } = await supabase
    .from('events')
    .update({ is_public: isPublic })
    .in('id', eventIds)
    .select();

  if (error) {
    console.error('Error bulk updating event visibility:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);
  revalidatePath(`/dashboard/competitions/${competitionId}/control`);

  return { success: true, updated: data?.length || 0 };
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

// BulkCreateEventInput is imported from '@/lib/constants/event-status'

export async function bulkCreateEvents(input: BulkCreateEventInput): Promise<{ success?: boolean; error?: string; count?: number }> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to create events' };
  }

  // Get max sort_order for this competition
  const { data: existingEvents } = await supabase
    .from('events')
    .select('sort_order')
    .eq('competition_id', input.competition_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  let nextSortOrder = existingEvents && existingEvents.length > 0
    ? (existingEvents[0].sort_order || 0) + 1
    : 0;

  // Prepare events for insertion
  const eventsToInsert = input.events.map((event, index) => ({
    competition_id: input.competition_id,
    event_code: event.event_code,
    name: event.name,
    event_type: event.event_type,
    gender: event.gender,
    age_group: event.age_group,
    round: event.round || 'final',
    status: 'scheduled',
    sort_order: nextSortOrder + index,
    settings: event.settings || {},
  }));

  const { data, error } = await supabase
    .from('events')
    .insert(eventsToInsert)
    .select();

  if (error) {
    console.error('Error bulk creating events:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${input.competition_id}`);

  return { success: true, count: data?.length || 0 };
}

// Copy events from another competition
export async function copyEventsFromCompetition(
  sourceCompetitionId: string,
  targetCompetitionId: string
): Promise<{ success?: boolean; error?: string; count?: number }> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to copy events' };
  }

  // Get events from source competition
  const { data: sourceEvents, error: fetchError } = await supabase
    .from('events')
    .select('event_code, name, event_type, gender, age_group, round, settings')
    .eq('competition_id', sourceCompetitionId)
    .order('sort_order', { ascending: true });

  if (fetchError || !sourceEvents) {
    return { error: 'Failed to fetch source events' };
  }

  if (sourceEvents.length === 0) {
    return { error: 'No events found in source competition' };
  }

  // Get max sort_order for target competition
  const { data: existingEvents } = await supabase
    .from('events')
    .select('sort_order')
    .eq('competition_id', targetCompetitionId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let nextSortOrder = existingEvents && existingEvents.length > 0
    ? (existingEvents[0].sort_order || 0) + 1
    : 0;

  // Prepare events for insertion
  const eventsToInsert = sourceEvents.map((event, index) => ({
    competition_id: targetCompetitionId,
    event_code: event.event_code,
    name: event.name,
    event_type: event.event_type,
    gender: event.gender,
    age_group: event.age_group,
    round: event.round || 'final',
    status: 'scheduled',
    sort_order: nextSortOrder + index,
    settings: event.settings || {},
  }));

  const { data, error } = await supabase
    .from('events')
    .insert(eventsToInsert)
    .select();

  if (error) {
    console.error('Error copying events:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${targetCompetitionId}`);

  return { success: true, count: data?.length || 0 };
}

// Get all competitions (for copy feature)
export async function getCompetitionsForCopy(excludeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('competitions')
    .select('id, name, date')
    .neq('id', excludeId)
    .order('date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching competitions:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Check-in System Functions
// ============================================================================

/**
 * Open check-in for an event with optional deadline
 */
export async function openCheckin(
  eventId: string,
  competitionId: string,
  deadlineMinutes?: number
): Promise<EventResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to open check-in' };
  }

  const now = new Date();
  const checkinDeadline = deadlineMinutes
    ? new Date(now.getTime() + deadlineMinutes * 60 * 1000)
    : null;

  const { error } = await supabase
    .from('events')
    .update({
      status: 'checkin',
      checkin_opened_at: now.toISOString(),
      checkin_deadline: checkinDeadline?.toISOString() || null,
    })
    .eq('id', eventId);

  if (error) {
    console.error('Error opening check-in:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);
  return { success: true };
}

/**
 * Update check-in deadline for an event
 */
export async function updateCheckinDeadline(
  eventId: string,
  competitionId: string,
  deadline: string | null
): Promise<EventResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('events')
    .update({ checkin_deadline: deadline })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating check-in deadline:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);
  return { success: true };
}

/**
 * Get events with check-in open for a competition
 */
export async function getCheckinEvents(competitionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      event_code,
      event_type,
      gender,
      age_group,
      status,
      scheduled_time,
      checkin_deadline,
      checkin_opened_at
    `)
    .eq('competition_id', competitionId)
    .in('status', ['checkin', 'in_progress'])
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('Error fetching check-in events:', error);
    return [];
  }

  return data || [];
}

/**
 * Bulk scratch athletes who didn't check in after deadline
 */
export async function scratchNoShows(
  eventId: string,
  competitionId: string
): Promise<{ success: boolean; scratchedCount: number; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, scratchedCount: 0, error: 'You must be logged in' };
  }

  // Get all entries that are still 'registered' (not checked_in)
  const { data: entries, error: fetchError } = await supabase
    .from('entries')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'registered');

  if (fetchError) {
    return { success: false, scratchedCount: 0, error: fetchError.message };
  }

  if (!entries || entries.length === 0) {
    return { success: true, scratchedCount: 0 };
  }

  const entryIds = entries.map(e => e.id);

  // Mark them as DNS
  const { error: updateError } = await supabase
    .from('entries')
    .update({ status: 'DNS' })
    .in('id', entryIds);

  if (updateError) {
    return { success: false, scratchedCount: 0, error: updateError.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);
  return { success: true, scratchedCount: entryIds.length };
}
