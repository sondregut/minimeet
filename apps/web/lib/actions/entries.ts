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

// Get unique athletes in a competition with their current bib numbers
export async function getAthletesWithBibs(competitionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('entries')
    .select(`
      id,
      bib_number,
      athlete_id,
      athlete:athletes(
        id,
        first_name,
        last_name,
        club_name,
        nationality
      )
    `)
    .eq('competition_id', competitionId);

  if (error) {
    console.error('Error fetching athletes with bibs:', error);
    return [];
  }

  // Group by athlete to get unique athletes with their bib numbers
  const athleteMap = new Map<string, {
    athlete_id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
    nationality: string;
    bib_number: string | null;
    entry_ids: string[];
  }>();

  for (const entry of data || []) {
    if (!entry.athlete) continue;

    // Supabase may return single related record as array, handle both cases
    const athlete = Array.isArray(entry.athlete) ? entry.athlete[0] : entry.athlete;
    if (!athlete) continue;

    const existing = athleteMap.get(entry.athlete_id);
    if (existing) {
      existing.entry_ids.push(entry.id);
      // Keep the bib number if we found one
      if (!existing.bib_number && entry.bib_number) {
        existing.bib_number = entry.bib_number;
      }
    } else {
      athleteMap.set(entry.athlete_id, {
        athlete_id: entry.athlete_id,
        first_name: athlete.first_name,
        last_name: athlete.last_name,
        club_name: athlete.club_name,
        nationality: athlete.nationality,
        bib_number: entry.bib_number,
        entry_ids: [entry.id],
      });
    }
  }

  return Array.from(athleteMap.values()).sort((a, b) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
  );
}

export interface BibAssignment {
  athlete_id: string;
  bib_number: string;
}

export async function bulkAssignBibs(
  competitionId: string,
  assignments: BibAssignment[]
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to assign bib numbers' };
  }

  // Update all entries for each athlete with their new bib number
  for (const assignment of assignments) {
    const { error } = await supabase
      .from('entries')
      .update({ bib_number: assignment.bib_number })
      .eq('competition_id', competitionId)
      .eq('athlete_id', assignment.athlete_id);

    if (error) {
      console.error('Error updating bib for athlete:', assignment.athlete_id, error);
      return { error: `Failed to update bib for athlete: ${error.message}` };
    }
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return { success: true };
}

export async function autoAssignBibs(
  competitionId: string,
  startingNumber: number = 1
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to assign bib numbers' };
  }

  // Get all unique athletes
  const athletes = await getAthletesWithBibs(competitionId);

  if (athletes.length === 0) {
    return { error: 'No athletes found in this competition' };
  }

  // Assign sequential bib numbers
  let currentNumber = startingNumber;
  for (const athlete of athletes) {
    const { error } = await supabase
      .from('entries')
      .update({ bib_number: currentNumber.toString() })
      .eq('competition_id', competitionId)
      .eq('athlete_id', athlete.athlete_id);

    if (error) {
      console.error('Error auto-assigning bib:', error);
      return { error: `Failed to assign bib: ${error.message}` };
    }
    currentNumber++;
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return { success: true };
}

// ============================================================================
// HEAT/FLIGHT GENERATION
// ============================================================================

export interface HeatAssignment {
  entry_id: string;
  heat_number: number;
  lane_or_position: number;
}

export async function generateHeats(
  eventId: string,
  competitionId: string,
  lanesPerHeat: number = 8,
  assignmentMethod: 'random' | 'seeded' | 'serpentine' = 'seeded'
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to generate heats' };
  }

  // Get all entries for this event
  const entries = await getEntriesByEvent(eventId);

  if (entries.length === 0) {
    return { error: 'No entries found for this event' };
  }

  // Sort entries based on assignment method
  let sortedEntries = [...entries];

  if (assignmentMethod === 'seeded') {
    // Sort by seed time (fastest first)
    sortedEntries.sort((a, b) => {
      if (!a.seed_mark_value && !b.seed_mark_value) return 0;
      if (!a.seed_mark_value) return 1;
      if (!b.seed_mark_value) return -1;
      return a.seed_mark_value - b.seed_mark_value;
    });
  } else if (assignmentMethod === 'random') {
    // Fisher-Yates shuffle
    for (let i = sortedEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sortedEntries[i], sortedEntries[j]] = [sortedEntries[j], sortedEntries[i]];
    }
  }

  // Calculate number of heats
  const numHeats = Math.ceil(sortedEntries.length / lanesPerHeat);

  // Assign to heats
  const assignments: HeatAssignment[] = [];

  if (assignmentMethod === 'serpentine') {
    // Serpentine: fastest in slowest heat, snake pattern
    // Heat 1 gets fastest, Heat 2 gets next, etc., then reverse
    let heatIndex = 0;
    let direction = 1;
    const heatCounts = new Array(numHeats).fill(0);

    for (const entry of sortedEntries) {
      assignments.push({
        entry_id: entry.id,
        heat_number: heatIndex + 1,
        lane_or_position: heatCounts[heatIndex] + 1,
      });
      heatCounts[heatIndex]++;

      // Move to next heat
      heatIndex += direction;
      if (heatIndex >= numHeats) {
        direction = -1;
        heatIndex = numHeats - 1;
      } else if (heatIndex < 0) {
        direction = 1;
        heatIndex = 0;
      }
    }
  } else {
    // Standard: fill heats sequentially
    for (let i = 0; i < sortedEntries.length; i++) {
      const heatNumber = Math.floor(i / lanesPerHeat) + 1;
      const lanePosition = (i % lanesPerHeat) + 1;

      assignments.push({
        entry_id: sortedEntries[i].id,
        heat_number: heatNumber,
        lane_or_position: lanePosition,
      });
    }
  }

  // Apply assignments to database
  for (const assignment of assignments) {
    const { error } = await supabase
      .from('entries')
      .update({
        heat_number: assignment.heat_number,
        lane_or_position: assignment.lane_or_position,
      })
      .eq('id', assignment.entry_id);

    if (error) {
      console.error('Error assigning heat:', error);
      return { error: `Failed to assign heat: ${error.message}` };
    }
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

export async function generateFlights(
  eventId: string,
  competitionId: string,
  athletesPerFlight: number = 12,
  assignmentMethod: 'random' | 'seeded' = 'seeded'
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to generate flights' };
  }

  // Get all entries for this event
  const entries = await getEntriesByEvent(eventId);

  if (entries.length === 0) {
    return { error: 'No entries found for this event' };
  }

  // Sort entries based on assignment method
  let sortedEntries = [...entries];

  if (assignmentMethod === 'seeded') {
    // Sort by seed mark (best first - for field events, higher/longer is better)
    sortedEntries.sort((a, b) => {
      if (!a.seed_mark_value && !b.seed_mark_value) return 0;
      if (!a.seed_mark_value) return 1;
      if (!b.seed_mark_value) return -1;
      return b.seed_mark_value - a.seed_mark_value; // Descending for field
    });
  } else {
    // Fisher-Yates shuffle
    for (let i = sortedEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sortedEntries[i], sortedEntries[j]] = [sortedEntries[j], sortedEntries[i]];
    }
  }

  // Assign to flights
  for (let i = 0; i < sortedEntries.length; i++) {
    const flightNumber = Math.floor(i / athletesPerFlight) + 1;
    const position = (i % athletesPerFlight) + 1;

    const { error } = await supabase
      .from('entries')
      .update({
        heat_number: flightNumber, // Using heat_number for flights too
        lane_or_position: position,
      })
      .eq('id', sortedEntries[i].id);

    if (error) {
      console.error('Error assigning flight:', error);
      return { error: `Failed to assign flight: ${error.message}` };
    }
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

export async function clearHeatAssignments(
  eventId: string,
  competitionId: string
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to clear assignments' };
  }

  const { error } = await supabase
    .from('entries')
    .update({
      heat_number: null,
      lane_or_position: null,
    })
    .eq('event_id', eventId);

  if (error) {
    console.error('Error clearing heat assignments:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

export async function updateHeatAssignment(
  entryId: string,
  heatNumber: number | null,
  laneOrPosition: number | null,
  competitionId: string,
  eventId: string
): Promise<EntryResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('entries')
    .update({
      heat_number: heatNumber,
      lane_or_position: laneOrPosition,
    })
    .eq('id', entryId);

  if (error) {
    console.error('Error updating heat assignment:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

// Get results counts by event for competition dashboard
export async function getResultsCountsByEvent(competitionId: string): Promise<Record<string, number>> {
  const supabase = await createClient();

  // Get all events for this competition
  const { data: events } = await supabase
    .from('events')
    .select('id, event_type')
    .eq('competition_id', competitionId);

  if (!events) return {};

  const resultsCounts: Record<string, number> = {};

  for (const event of events) {
    let count = 0;

    // First get entry IDs for this event
    const { data: entries } = await supabase
      .from('entries')
      .select('id')
      .eq('event_id', event.id);

    const entryIds = entries?.map(e => e.id) || [];

    if (entryIds.length === 0) {
      resultsCounts[event.id] = 0;
      continue;
    }

    if (event.event_type === 'track' || event.event_type === 'relay') {
      const { count: trackCount } = await supabase
        .from('track_results')
        .select('id', { count: 'exact', head: true })
        .in('entry_id', entryIds);
      count = trackCount || 0;
    } else if (event.event_type === 'field_vertical') {
      const { count: verticalCount } = await supabase
        .from('vertical_results')
        .select('id', { count: 'exact', head: true })
        .in('entry_id', entryIds);
      count = verticalCount || 0;
    } else if (event.event_type === 'field_horizontal' || event.event_type === 'throw') {
      const { count: fieldCount } = await supabase
        .from('field_results')
        .select('id', { count: 'exact', head: true })
        .in('entry_id', entryIds);
      count = fieldCount || 0;
    }

    resultsCounts[event.id] = count;
  }

  return resultsCounts;
}

// Bulk update entry statuses (e.g., mark all unassigned as DNS)
export async function bulkUpdateEntryStatus(
  entryIds: string[],
  status: 'registered' | 'confirmed' | 'checked_in' | 'DNS' | 'scratched',
  competitionId: string,
  eventId: string
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to update entries' };
  }

  const { error } = await supabase
    .from('entries')
    .update({ status })
    .in('id', entryIds);

  if (error) {
    console.error('Error bulk updating entry status:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

// Swap two entries' lane positions
export async function swapEntryPositions(
  entry1Id: string,
  entry2Id: string,
  competitionId: string,
  eventId: string
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to swap positions' };
  }

  // Get both entries
  const { data: entries, error: fetchError } = await supabase
    .from('entries')
    .select('id, heat_number, lane_or_position')
    .in('id', [entry1Id, entry2Id]);

  if (fetchError || !entries || entries.length !== 2) {
    return { error: 'Could not find entries to swap' };
  }

  const entry1 = entries.find(e => e.id === entry1Id);
  const entry2 = entries.find(e => e.id === entry2Id);

  if (!entry1 || !entry2) {
    return { error: 'Entries not found' };
  }

  // Swap positions
  const { error: update1Error } = await supabase
    .from('entries')
    .update({
      heat_number: entry2.heat_number,
      lane_or_position: entry2.lane_or_position
    })
    .eq('id', entry1Id);

  if (update1Error) {
    return { error: update1Error.message };
  }

  const { error: update2Error } = await supabase
    .from('entries')
    .update({
      heat_number: entry1.heat_number,
      lane_or_position: entry1.lane_or_position
    })
    .eq('id', entry2Id);

  if (update2Error) {
    return { error: update2Error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

// Update multiple entries' lane assignments at once
export async function bulkUpdateLaneAssignments(
  assignments: { entry_id: string; heat_number: number | null; lane_or_position: number | null }[],
  competitionId: string,
  eventId: string
): Promise<EntryResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to update assignments' };
  }

  for (const assignment of assignments) {
    const { error } = await supabase
      .from('entries')
      .update({
        heat_number: assignment.heat_number,
        lane_or_position: assignment.lane_or_position,
      })
      .eq('id', assignment.entry_id);

    if (error) {
      console.error('Error updating assignment:', error);
      return { error: error.message };
    }
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

// Get competition dashboard stats
export async function getCompetitionDashboardStats(competitionId: string) {
  const supabase = await createClient();

  // Get events with their types
  const { data: events } = await supabase
    .from('events')
    .select('id, event_type, status')
    .eq('competition_id', competitionId);

  if (!events) return { totalEntries: 0, totalResults: 0, completedEvents: 0, totalEvents: 0 };

  // Get total entries
  const { count: totalEntries } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', competitionId);

  // Count results across all result tables
  let totalResults = 0;
  const entryIds = await supabase
    .from('entries')
    .select('id')
    .eq('competition_id', competitionId);

  if (entryIds.data && entryIds.data.length > 0) {
    const ids = entryIds.data.map(e => e.id);

    const [trackResults, verticalResults, fieldResults] = await Promise.all([
      supabase.from('track_results').select('id', { count: 'exact', head: true }).in('entry_id', ids),
      supabase.from('vertical_results').select('id', { count: 'exact', head: true }).in('entry_id', ids),
      supabase.from('field_results').select('id', { count: 'exact', head: true }).in('entry_id', ids),
    ]);

    totalResults = (trackResults.count || 0) + (verticalResults.count || 0) + (fieldResults.count || 0);
  }

  const completedEvents = events.filter(e => e.status === 'completed').length;

  return {
    totalEntries: totalEntries || 0,
    totalResults,
    completedEvents,
    totalEvents: events.length,
  };
}

// OPTIMIZED: Combined function that fetches all control dashboard data in minimal queries
export interface ControlDashboardData {
  competition: {
    id: string;
    name: string;
    date: string;
    status: string;
    settings: Record<string, unknown> | null;
  } | null;
  events: Array<{
    id: string;
    name: string;
    event_type: string;
    status: string;
    scheduled_time: string | null;
    round: string;
    gender: string;
    age_group: string | null;
    is_public: boolean;
  }>;
  entryCounts: Record<string, number>;
  resultsCounts: Record<string, number>;
  stats: {
    totalEntries: number;
    totalResults: number;
    completedEvents: number;
    totalEvents: number;
  };
}

export async function getControlDashboardData(competitionId: string): Promise<ControlDashboardData> {
  const supabase = await createClient();

  // Fetch all base data in parallel (3 queries instead of 5+ separate calls)
  const [competitionRes, eventsRes, entriesRes] = await Promise.all([
    supabase
      .from('competitions')
      .select('id, name, date, status, settings')
      .eq('id', competitionId)
      .single(),
    supabase
      .from('events')
      .select('id, name, event_type, status, scheduled_time, round, gender, age_group, is_public')
      .eq('competition_id', competitionId)
      .order('scheduled_time', { ascending: true, nullsFirst: false }),
    supabase
      .from('entries')
      .select('id, event_id')
      .eq('competition_id', competitionId),
  ]);

  const competition = competitionRes.data;
  const events = (eventsRes.data || []) as ControlDashboardData['events'];
  const entries = entriesRes.data || [];

  // Calculate entry counts per event (in memory)
  const entryCounts: Record<string, number> = {};
  for (const entry of entries) {
    entryCounts[entry.event_id] = (entryCounts[entry.event_id] || 0) + 1;
  }

  // Get results counts - use single queries per table instead of N+1
  const resultsCounts: Record<string, number> = {};
  let totalResults = 0;

  if (entries.length > 0) {
    const entryIds = entries.map(e => e.id);

    // Fetch all results with entry_id in parallel (3 queries total, not N*3)
    const [trackRes, verticalRes, fieldRes] = await Promise.all([
      supabase.from('track_results').select('entry_id').in('entry_id', entryIds),
      supabase.from('vertical_results').select('entry_id').in('entry_id', entryIds),
      supabase.from('field_results').select('entry_id').in('entry_id', entryIds),
    ]);

    // Build entry_id to event_id lookup
    const entryToEvent: Record<string, string> = {};
    for (const entry of entries) {
      entryToEvent[entry.id] = entry.event_id;
    }

    // Aggregate results counts per event
    const allResults = [
      ...(trackRes.data || []),
      ...(verticalRes.data || []),
      ...(fieldRes.data || []),
    ];

    for (const result of allResults) {
      const eventId = entryToEvent[result.entry_id];
      if (eventId) {
        resultsCounts[eventId] = (resultsCounts[eventId] || 0) + 1;
        totalResults++;
      }
    }
  }

  const completedEvents = events.filter(e => e.status === 'completed').length;

  return {
    competition,
    events,
    entryCounts,
    resultsCounts,
    stats: {
      totalEntries: entries.length,
      totalResults,
      completedEvents,
      totalEvents: events.length,
    },
  };
}

// Bulk import entries from CSV data
export interface BulkEntryImportRow {
  bib_number?: string;
  first_name: string;
  last_name: string;
  club_name?: string;
  event_code: string;
  seed_mark?: string;
}

export interface BulkEntryImportResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
  createdAthletes: number;
}

export async function bulkImportEntries(
  competitionId: string,
  rows: BulkEntryImportRow[],
  organizationId?: string
): Promise<BulkEntryImportResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      totalCount: rows.length,
      successCount: 0,
      errorCount: rows.length,
      errors: [{ row: 0, message: 'You must be logged in to import entries' }],
      createdAthletes: 0,
    };
  }

  // Get all events for this competition to map event_code to event_id
  const { data: events } = await supabase
    .from('events')
    .select('id, event_code, name')
    .eq('competition_id', competitionId);

  if (!events || events.length === 0) {
    return {
      success: false,
      totalCount: rows.length,
      successCount: 0,
      errorCount: rows.length,
      errors: [{ row: 0, message: 'No events found for this competition. Create events first.' }],
      createdAthletes: 0,
    };
  }

  const eventMap = new Map(events.map(e => [e.event_code.toLowerCase(), e.id]));

  const errors: Array<{ row: number; message: string }> = [];
  let successCount = 0;
  let createdAthletes = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Validate required fields
    if (!row.first_name || !row.last_name) {
      errors.push({ row: rowNum, message: 'Missing first_name or last_name' });
      continue;
    }

    if (!row.event_code) {
      errors.push({ row: rowNum, message: 'Missing event_code' });
      continue;
    }

    // Find event
    const eventId = eventMap.get(row.event_code.toLowerCase());
    if (!eventId) {
      errors.push({ row: rowNum, message: `Event "${row.event_code}" not found in this competition` });
      continue;
    }

    // Find or create athlete
    let athleteId: string | null = null;

    // Search for existing athlete
    const { data: existingAthletes } = await supabase
      .from('athletes')
      .select('id')
      .ilike('first_name', row.first_name)
      .ilike('last_name', row.last_name)
      .limit(1);

    if (existingAthletes && existingAthletes.length > 0) {
      athleteId = existingAthletes[0].id;
    } else {
      // Create new athlete
      const { data: newAthlete, error: athleteError } = await supabase
        .from('athletes')
        .insert({
          first_name: row.first_name,
          last_name: row.last_name,
          club_name: row.club_name || null,
          gender: 'X', // Default, can be updated later
          nationality: 'NOR',
          organization_id: organizationId || null,
          social_links: {},
          personal_bests: {},
        })
        .select('id')
        .single();

      if (athleteError) {
        errors.push({ row: rowNum, message: `Failed to create athlete: ${athleteError.message}` });
        continue;
      }

      athleteId = newAthlete.id;
      createdAthletes++;
    }

    // Check if entry already exists
    const { data: existingEntry } = await supabase
      .from('entries')
      .select('id')
      .eq('event_id', eventId)
      .eq('athlete_id', athleteId)
      .single();

    if (existingEntry) {
      errors.push({ row: rowNum, message: `${row.first_name} ${row.last_name} already entered in ${row.event_code}` });
      continue;
    }

    // Parse seed mark value
    let seedMarkValue: number | null = null;
    if (row.seed_mark) {
      if (row.seed_mark.includes(':')) {
        const parts = row.seed_mark.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseFloat(parts[1]) || 0;
        seedMarkValue = minutes * 60 * 1000 + seconds * 1000;
      } else {
        seedMarkValue = parseFloat(row.seed_mark) * 1000;
      }
    }

    // Create entry
    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        competition_id: competitionId,
        event_id: eventId,
        athlete_id: athleteId,
        bib_number: row.bib_number || null,
        seed_mark: row.seed_mark || null,
        seed_mark_value: seedMarkValue,
        status: 'registered',
      });

    if (entryError) {
      errors.push({ row: rowNum, message: `Failed to create entry: ${entryError.message}` });
      continue;
    }

    successCount++;
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return {
    success: successCount > 0,
    totalCount: rows.length,
    successCount,
    errorCount: errors.length,
    errors,
    createdAthletes,
  };
}
