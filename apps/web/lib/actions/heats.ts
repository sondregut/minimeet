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

export interface Heat {
  id: string;
  event_id: string;
  heat_number: number;
  name: string | null;
  scheduled_time: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  wind_reading: number | null;
  notes: string | null;
}

export interface HeatEntry {
  id: string;
  heat_id: string;
  entry_id: string;
  lane: number | null;
  position: number | null;
  seed_time_ms: number | null;
  result_time_ms: number | null;
  result_place: number | null;
  qualification_mark: string | null;
  status: string;
  reaction_time_ms: number | null;
  // Joined data
  athlete?: {
    id: string;
    first_name: string;
    last_name: string;
    bib_number: string | null;
  };
  entry?: {
    bib_number: string | null;
    seed_mark: string | null;
  };
}

export interface HeatResult {
  success?: boolean;
  error?: string;
  id?: string;
}

// Get heats for an event
export async function getHeatsForEvent(eventId: string): Promise<Heat[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('heats')
    .select('*')
    .eq('event_id', eventId)
    .order('heat_number', { ascending: true });

  if (error) {
    console.error('Error fetching heats:', error);
    return [];
  }

  return data || [];
}

// Get entries for a heat with athlete info
export async function getHeatEntries(heatId: string): Promise<HeatEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('heat_entries')
    .select(`
      *,
      entry:entries (
        id,
        bib_number,
        seed_mark,
        athlete:athletes (
          id,
          first_name,
          last_name
        )
      )
    `)
    .eq('heat_id', heatId)
    .order('lane', { ascending: true });

  if (error) {
    console.error('Error fetching heat entries:', error);
    return [];
  }

  // Flatten the data
  return (data || []).map(he => ({
    ...he,
    athlete: he.entry?.athlete,
    entry: {
      bib_number: he.entry?.bib_number,
      seed_mark: he.entry?.seed_mark,
    },
  }));
}

// Get all entries for an event (for heat generation)
export async function getEventEntriesForHeats(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('entries')
    .select(`
      id,
      bib_number,
      seed_mark,
      seed_mark_value,
      status,
      athlete:athletes (
        id,
        first_name,
        last_name
      )
    `)
    .eq('event_id', eventId)
    .in('status', ['registered', 'confirmed', 'checked_in'])
    .order('seed_mark_value', { ascending: true });

  if (error) {
    console.error('Error fetching entries for heats:', error);
    return [];
  }

  return data || [];
}

// Generate heats automatically
export interface GenerateHeatsInput {
  eventId: string;
  competitionId: string;
  numLanes: number;
  seedingMethod: 'random' | 'serpentine' | 'fastest_last';
}

export async function generateHeats(input: GenerateHeatsInput): Promise<{ success?: boolean; error?: string; heatsCreated?: number }> {
  const supabase = await createClient();

  const { eventId, competitionId, numLanes, seedingMethod } = input;

  // Get all entries
  const entries = await getEventEntriesForHeats(eventId);

  if (entries.length === 0) {
    return { error: 'No entries found for this event' };
  }

  // Calculate number of heats needed
  const numHeats = Math.ceil(entries.length / numLanes);

  // Delete existing heats for this event
  const { error: deleteError } = await supabase
    .from('heats')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    console.error('Error deleting existing heats:', deleteError);
    return { error: 'Failed to clear existing heats' };
  }

  // Create heats
  const heatsToCreate = Array.from({ length: numHeats }, (_, i) => ({
    event_id: eventId,
    heat_number: i + 1,
    name: `Heat ${i + 1}`,
    status: 'scheduled',
  }));

  const { data: createdHeats, error: heatsError } = await supabase
    .from('heats')
    .insert(heatsToCreate)
    .select();

  if (heatsError || !createdHeats) {
    console.error('Error creating heats:', heatsError);
    return { error: 'Failed to create heats' };
  }

  // Sort entries based on seeding method
  let sortedEntries = [...entries];

  if (seedingMethod === 'random') {
    // Shuffle randomly
    for (let i = sortedEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sortedEntries[i], sortedEntries[j]] = [sortedEntries[j], sortedEntries[i]];
    }
  } else if (seedingMethod === 'serpentine' || seedingMethod === 'fastest_last') {
    // Sort by seed time (already sorted from DB)
    // For fastest_last, we'll assign fastest to last heat
  }

  // Assign entries to heats with lanes
  const heatEntries: { heat_id: string; entry_id: string; lane: number; seed_time_ms: number | null }[] = [];

  if (seedingMethod === 'serpentine') {
    // Serpentine seeding: 1st heat gets seeds 1, 2*numHeats, 2*numHeats+1, etc.
    // This distributes talent evenly across heats
    let entryIndex = 0;
    let direction = 1;
    let heatIndex = 0;
    const heatAssignments: number[][] = Array.from({ length: numHeats }, () => []);

    while (entryIndex < sortedEntries.length) {
      heatAssignments[heatIndex].push(entryIndex);
      entryIndex++;

      if (direction === 1) {
        heatIndex++;
        if (heatIndex >= numHeats) {
          heatIndex = numHeats - 1;
          direction = -1;
        }
      } else {
        heatIndex--;
        if (heatIndex < 0) {
          heatIndex = 0;
          direction = 1;
        }
      }
    }

    // Now create heat entries with lane assignments
    for (let h = 0; h < numHeats; h++) {
      const heatId = createdHeats[h].id;
      const entriesInHeat = heatAssignments[h];

      // Assign lanes (center lanes first for faster athletes)
      const laneOrder = getLaneOrder(numLanes, entriesInHeat.length);

      entriesInHeat.forEach((entryIdx, laneIdx) => {
        const entry = sortedEntries[entryIdx];
        heatEntries.push({
          heat_id: heatId,
          entry_id: entry.id,
          lane: laneOrder[laneIdx],
          seed_time_ms: entry.seed_mark_value ? Math.round(entry.seed_mark_value * 1000) : null,
        });
      });
    }
  } else {
    // Simple sequential assignment (random or fastest_last)
    let entryIndex = 0;
    const heatOrder = seedingMethod === 'fastest_last'
      ? [...createdHeats].reverse()
      : createdHeats;

    for (const heat of heatOrder) {
      const entriesInHeat: typeof sortedEntries = [];

      for (let lane = 1; lane <= numLanes && entryIndex < sortedEntries.length; lane++) {
        entriesInHeat.push(sortedEntries[entryIndex]);
        entryIndex++;
      }

      // Assign lanes (center lanes first)
      const laneOrder = getLaneOrder(numLanes, entriesInHeat.length);

      entriesInHeat.forEach((entry, idx) => {
        heatEntries.push({
          heat_id: heat.id,
          entry_id: entry.id,
          lane: laneOrder[idx],
          seed_time_ms: entry.seed_mark_value ? Math.round(entry.seed_mark_value * 1000) : null,
        });
      });
    }
  }

  // Insert heat entries
  const { error: entriesError } = await supabase
    .from('heat_entries')
    .insert(heatEntries);

  if (entriesError) {
    console.error('Error creating heat entries:', entriesError);
    return { error: 'Failed to assign athletes to heats' };
  }

  // Update event to mark it has heats
  await supabase
    .from('events')
    .update({ has_heats: true, num_lanes: numLanes })
    .eq('id', eventId);

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);
  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);

  return { success: true, heatsCreated: numHeats };
}

// Helper: Get lane order with center lanes first (for track events)
function getLaneOrder(numLanes: number, numAthletes: number): number[] {
  // Standard lane preference order for 8 lanes: 4, 5, 3, 6, 2, 7, 1, 8
  const centerFirst = [];
  const mid = Math.floor(numLanes / 2);

  for (let offset = 0; offset <= mid; offset++) {
    if (mid + offset <= numLanes) centerFirst.push(mid + offset);
    if (offset > 0 && mid - offset + 1 >= 1) centerFirst.push(mid - offset + 1);
  }

  return centerFirst.slice(0, numAthletes);
}

// Update lane assignment
export async function updateLaneAssignment(
  heatEntryId: string,
  lane: number,
  competitionId: string,
  eventId: string
): Promise<HeatResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('heat_entries')
    .update({ lane })
    .eq('id', heatEntryId);

  if (error) {
    console.error('Error updating lane:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);
  return { success: true };
}

// Move athlete between heats
export async function moveAthleteBetweenHeats(
  heatEntryId: string,
  newHeatId: string,
  newLane: number,
  competitionId: string,
  eventId: string
): Promise<HeatResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('heat_entries')
    .update({ heat_id: newHeatId, lane: newLane })
    .eq('id', heatEntryId);

  if (error) {
    console.error('Error moving athlete:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);
  return { success: true };
}

// Update heat status
export async function updateHeatStatus(
  heatId: string,
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
  competitionId: string,
  eventId: string
): Promise<HeatResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('heats')
    .update({ status })
    .eq('id', heatId);

  if (error) {
    console.error('Error updating heat status:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);
  return { success: true };
}

// Delete all heats for an event
export async function deleteEventHeats(
  eventId: string,
  competitionId: string
): Promise<HeatResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('heats')
    .delete()
    .eq('event_id', eventId);

  if (error) {
    console.error('Error deleting heats:', error);
    return { error: error.message };
  }

  // Update event to mark no heats
  await supabase
    .from('events')
    .update({ has_heats: false })
    .eq('id', eventId);

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);
  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);

  return { success: true };
}

// Record heat result for an entry
export async function recordHeatResult(
  heatEntryId: string,
  resultTimeMs: number,
  status: 'finished' | 'DNS' | 'DNF' | 'DQ',
  competitionId: string,
  eventId: string,
  reactionTimeMs?: number
): Promise<HeatResult> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    result_time_ms: status === 'finished' ? resultTimeMs : null,
    status,
  };

  if (reactionTimeMs !== undefined) {
    updateData.reaction_time_ms = reactionTimeMs;
  }

  const { error } = await supabase
    .from('heat_entries')
    .update(updateData)
    .eq('id', heatEntryId);

  if (error) {
    console.error('Error recording result:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);
  return { success: true };
}

// Calculate places and qualification marks for a heat
export async function calculateHeatResults(
  heatId: string,
  advancementRule: { by_place: number; by_time: number },
  competitionId: string,
  eventId: string
): Promise<HeatResult> {
  const supabase = await createClient();

  // Get all entries for this heat
  const { data: entries, error: fetchError } = await supabase
    .from('heat_entries')
    .select('*')
    .eq('heat_id', heatId)
    .eq('status', 'finished')
    .order('result_time_ms', { ascending: true });

  if (fetchError) {
    console.error('Error fetching heat entries:', fetchError);
    return { error: fetchError.message };
  }

  // Assign places
  let place = 1;
  for (const entry of entries || []) {
    const qualMark = place <= advancementRule.by_place ? 'Q' : null;

    await supabase
      .from('heat_entries')
      .update({
        result_place: place,
        qualification_mark: qualMark,
      })
      .eq('id', entry.id);

    place++;
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);
  return { success: true };
}

// Get all heat results for qualification (to determine 'q' qualifiers by time)
export async function getHeatResultsForQualification(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('heat_entries')
    .select(`
      *,
      heat:heats!inner (
        id,
        heat_number,
        event_id
      )
    `)
    .eq('heat.event_id', eventId)
    .eq('status', 'finished')
    .is('qualification_mark', null) // Not already qualified by place
    .order('result_time_ms', { ascending: true });

  if (error) {
    console.error('Error fetching results for qualification:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// ADVANCEMENT CALCULATION (Q/q)
// ============================================================================

/**
 * Calculate advancement for all heats in an event
 * Q = Qualified by place (top N in each heat)
 * q = Qualified by time (next fastest times across all heats)
 *
 * @param eventId - The event ID
 * @param competitionId - The competition ID
 * @param advanceByPlace - Number of athletes from each heat that qualify by place (Q)
 * @param advanceByTime - Number of additional athletes that qualify by time (q)
 */
export async function calculateAdvancement(
  eventId: string,
  competitionId: string,
  advanceByPlace: number,
  advanceByTime: number
): Promise<HeatResult> {
  const supabase = await createClient();

  // Get all heats for this event
  const heats = await getHeatsForEvent(eventId);

  if (heats.length === 0) {
    return { error: 'No heats found for this event' };
  }

  // First, clear all existing qualification marks
  for (const heat of heats) {
    await supabase
      .from('heat_entries')
      .update({ qualification_mark: null })
      .eq('heat_id', heat.id);
  }

  // For each heat, assign places and Q marks for top finishers
  const allFinishedEntries: { id: string; heat_id: string; result_time_ms: number; result_place: number }[] = [];

  for (const heat of heats) {
    // Get finished entries for this heat, sorted by time
    const { data: entries, error: fetchError } = await supabase
      .from('heat_entries')
      .select('*')
      .eq('heat_id', heat.id)
      .eq('status', 'finished')
      .not('result_time_ms', 'is', null)
      .order('result_time_ms', { ascending: true });

    if (fetchError) {
      console.error('Error fetching heat entries:', fetchError);
      continue;
    }

    // Assign places and Q marks
    let place = 1;
    for (const entry of entries || []) {
      const qualMark = place <= advanceByPlace ? 'Q' : null;

      await supabase
        .from('heat_entries')
        .update({
          result_place: place,
          qualification_mark: qualMark,
        })
        .eq('id', entry.id);

      // Collect non-Q entries for time-based qualification
      if (!qualMark && entry.result_time_ms) {
        allFinishedEntries.push({
          id: entry.id,
          heat_id: heat.id,
          result_time_ms: entry.result_time_ms,
          result_place: place,
        });
      }

      place++;
    }
  }

  // Now assign 'q' marks to the fastest non-Q athletes across all heats
  if (advanceByTime > 0 && allFinishedEntries.length > 0) {
    // Sort by time (fastest first)
    allFinishedEntries.sort((a, b) => a.result_time_ms - b.result_time_ms);

    // Take the top N by time
    const qualifyByTime = allFinishedEntries.slice(0, advanceByTime);

    for (const entry of qualifyByTime) {
      await supabase
        .from('heat_entries')
        .update({ qualification_mark: 'q' })
        .eq('id', entry.id);
    }
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}/heats`);
  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

/**
 * Get advancement summary for an event
 * Returns counts of Q and q qualifiers and total advancing
 */
export async function getAdvancementSummary(eventId: string): Promise<{
  qualifiedByPlace: number;
  qualifiedByTime: number;
  totalAdvancing: number;
  totalFinished: number;
}> {
  const supabase = await createClient();

  // Get all heat entries with Q or q marks
  const { data: heats } = await supabase
    .from('heats')
    .select('id')
    .eq('event_id', eventId);

  if (!heats || heats.length === 0) {
    return { qualifiedByPlace: 0, qualifiedByTime: 0, totalAdvancing: 0, totalFinished: 0 };
  }

  const heatIds = heats.map(h => h.id);

  const { data: entries } = await supabase
    .from('heat_entries')
    .select('id, qualification_mark, status')
    .in('heat_id', heatIds);

  if (!entries) {
    return { qualifiedByPlace: 0, qualifiedByTime: 0, totalAdvancing: 0, totalFinished: 0 };
  }

  const qualifiedByPlace = entries.filter(e => e.qualification_mark === 'Q').length;
  const qualifiedByTime = entries.filter(e => e.qualification_mark === 'q').length;
  const totalFinished = entries.filter(e => e.status === 'finished').length;

  return {
    qualifiedByPlace,
    qualifiedByTime,
    totalAdvancing: qualifiedByPlace + qualifiedByTime,
    totalFinished,
  };
}

/**
 * Update the event's advancement rule and recalculate
 */
export async function updateAdvancementRule(
  eventId: string,
  competitionId: string,
  advanceByPlace: number,
  advanceByTime: number
): Promise<HeatResult> {
  const supabase = await createClient();

  // Store the advancement rule in the event settings
  const { error: updateError } = await supabase
    .from('events')
    .update({
      advancement_rule: {
        by_place: advanceByPlace,
        by_time: advanceByTime,
      },
    })
    .eq('id', eventId);

  if (updateError) {
    console.error('Error updating advancement rule:', updateError);
    return { error: updateError.message };
  }

  // Recalculate advancement
  return calculateAdvancement(eventId, competitionId, advanceByPlace, advanceByTime);
}
