'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  distributeToHeats,
  assignLanes,
  seedEvent,
  parseTimeToMs,
  getRaceTypeFromEvent,
  type SeededAthlete,
  type RaceType,
  type LaneCount,
} from '@/lib/seeding';
import { getPreset, type SeedingPresetId } from '@/lib/seeding/seeding-presets';

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

interface SeedingInput {
  eventId: string;
  competitionId: string;
  presetId: SeedingPresetId;
  laneCount?: LaneCount;
  heatCount?: number;
}

interface SeedingResultData {
  heatsCreated: number;
  entriesAssigned: number;
}

/**
 * Generate heats and lane assignments for a track event
 */
export async function generateSeeding(
  input: SeedingInput
): Promise<{ success?: boolean; error?: string; data?: SeedingResultData }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Get event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      name,
      event_type,
      num_lanes,
      competition_id,
      competitions!inner(id, created_by)
    `)
    .eq('id', input.eventId)
    .single();

  if (eventError || !event) {
    return { error: 'Kunne ikke finne øvelsen' };
  }

  // Verify ownership
  if ((event.competitions as any).created_by !== user.id) {
    return { error: 'Ingen tilgang' };
  }

  // Get all entries for this event with athlete info
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select(`
      id,
      athlete_id,
      seed_mark,
      seed_mark_value,
      bib_number,
      status,
      athletes(id, first_name, last_name, club_name)
    `)
    .eq('event_id', input.eventId)
    .in('status', ['registered', 'confirmed', 'checked_in']);

  if (entriesError) {
    return { error: 'Kunne ikke hente påmeldinger' };
  }

  if (!entries || entries.length === 0) {
    return { error: 'Ingen påmeldinger å seede' };
  }

  // Get preset settings
  const preset = getPreset(input.presetId);
  const laneCount = input.laneCount || (event.num_lanes as LaneCount) || preset.settings.defaultLaneCount;
  const raceType = getRaceTypeFromEvent(event.name);

  // Convert entries to SeededAthletes
  const seededAthletes: SeededAthlete[] = entries
    .map((entry, index) => {
      const athlete = entry.athletes as any;
      const seedValue = entry.seed_mark_value ? Number(entry.seed_mark_value) : null;

      return {
        id: entry.id,
        name: athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Ukjent',
        club: athlete?.club_name || undefined,
        seedTime: seedValue || undefined,
        seedMark: entry.seed_mark || undefined,
        ranking: 0, // Will be set below
      };
    })
    .sort((a, b) => {
      // Sort by seed time (for track events, lower is better)
      if (a.seedTime && b.seedTime) {
        return a.seedTime - b.seedTime;
      }
      if (a.seedTime) return -1;
      if (b.seedTime) return 1;
      return 0;
    })
    .map((athlete, index) => ({
      ...athlete,
      ranking: index + 1,
    }));

  // Calculate heat count
  const heatCount = input.heatCount || Math.ceil(seededAthletes.length / laneCount);

  // Run seeding algorithm
  const seedingResult = seedEvent(seededAthletes, {
    raceType,
    laneCount,
    heatCount,
    qualificationRule: preset.settings.qualificationRules.twoRounds,
  });

  // Delete existing heats for this event
  await supabase
    .from('heat_entries')
    .delete()
    .in('heat_id', (
      await supabase
        .from('heats')
        .select('id')
        .eq('event_id', input.eventId)
    ).data?.map(h => h.id) || []);

  await supabase
    .from('heats')
    .delete()
    .eq('event_id', input.eventId);

  // Clear existing heat assignments on entries
  await supabase
    .from('entries')
    .update({ heat_number: null, lane_or_position: null })
    .eq('event_id', input.eventId);

  // Create heats and assign entries
  let entriesAssigned = 0;

  for (const heat of seedingResult.heats) {
    // Create heat record
    const { data: newHeat, error: heatError } = await supabase
      .from('heats')
      .insert({
        event_id: input.eventId,
        heat_number: heat.heatNumber,
        name: `Heat ${heat.heatNumber}`,
        status: 'scheduled',
      })
      .select()
      .single();

    if (heatError || !newHeat) {
      console.error('Error creating heat:', heatError);
      continue;
    }

    // Assign athletes to heat
    for (const assignment of heat.athletes) {
      // Update entry with heat and lane
      await supabase
        .from('entries')
        .update({
          heat_number: heat.heatNumber,
          lane_or_position: assignment.lane || assignment.position,
        })
        .eq('id', assignment.athlete.id);

      // Create heat_entries record
      await supabase
        .from('heat_entries')
        .insert({
          heat_id: newHeat.id,
          entry_id: assignment.athlete.id,
          lane: assignment.lane,
          position: assignment.position,
          seed_time_ms: assignment.athlete.seedTime,
        });

      entriesAssigned++;
    }
  }

  // Update event to indicate it has heats
  await supabase
    .from('events')
    .update({ has_heats: true })
    .eq('id', input.eventId);

  revalidatePath(`/dashboard/competitions/${input.competitionId}`);
  revalidatePath(`/dashboard/competitions/${input.competitionId}/events/${input.eventId}`);

  return {
    success: true,
    data: {
      heatsCreated: seedingResult.heats.length,
      entriesAssigned,
    },
  };
}

/**
 * Clear all seeding for an event
 */
export async function clearSeeding(
  eventId: string,
  competitionId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Get event and verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('id, competitions!inner(created_by)')
    .eq('id', eventId)
    .single();

  if (!event || (event.competitions as any).created_by !== user.id) {
    return { error: 'Ingen tilgang' };
  }

  // Get heat IDs first
  const { data: heats } = await supabase
    .from('heats')
    .select('id')
    .eq('event_id', eventId);

  const heatIds = heats?.map(h => h.id) || [];

  // Delete heat_entries
  if (heatIds.length > 0) {
    await supabase
      .from('heat_entries')
      .delete()
      .in('heat_id', heatIds);
  }

  // Delete heats
  await supabase
    .from('heats')
    .delete()
    .eq('event_id', eventId);

  // Clear entry assignments
  await supabase
    .from('entries')
    .update({ heat_number: null, lane_or_position: null })
    .eq('event_id', eventId);

  // Update event
  await supabase
    .from('events')
    .update({ has_heats: false })
    .eq('id', eventId);

  revalidatePath(`/dashboard/competitions/${competitionId}`);
  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

/**
 * Get seeding preview without saving
 */
export async function previewSeeding(
  input: SeedingInput
): Promise<{
  success?: boolean;
  error?: string;
  preview?: {
    heats: Array<{
      heatNumber: number;
      athletes: Array<{
        name: string;
        club?: string;
        seedMark?: string;
        lane?: number;
      }>;
    }>;
  };
}> {
  const supabase = await createClient();

  // Verify user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select('id, name, num_lanes, competitions!inner(created_by)')
    .eq('id', input.eventId)
    .single();

  if (!event || (event.competitions as any).created_by !== user.id) {
    return { error: 'Ingen tilgang' };
  }

  // Get entries
  const { data: entries } = await supabase
    .from('entries')
    .select(`
      id,
      seed_mark,
      seed_mark_value,
      athletes(first_name, last_name, club_name)
    `)
    .eq('event_id', input.eventId)
    .in('status', ['registered', 'confirmed', 'checked_in']);

  if (!entries || entries.length === 0) {
    return { error: 'Ingen påmeldinger' };
  }

  // Get preset
  const preset = getPreset(input.presetId);
  const laneCount = input.laneCount || (event.num_lanes as LaneCount) || preset.settings.defaultLaneCount;
  const raceType = getRaceTypeFromEvent(event.name);

  // Build seeded athletes
  const seededAthletes: SeededAthlete[] = entries
    .map((entry) => {
      const athlete = entry.athletes as any;
      const seedValue = entry.seed_mark_value ? Number(entry.seed_mark_value) : null;
      return {
        id: entry.id,
        name: athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Ukjent',
        club: athlete?.club_name || undefined,
        seedTime: seedValue || undefined,
        seedMark: entry.seed_mark || undefined,
        ranking: 0,
      };
    })
    .sort((a, b) => {
      if (a.seedTime && b.seedTime) return a.seedTime - b.seedTime;
      if (a.seedTime) return -1;
      if (b.seedTime) return 1;
      return 0;
    })
    .map((athlete, index) => ({ ...athlete, ranking: index + 1 }));

  const heatCount = input.heatCount || Math.ceil(seededAthletes.length / laneCount);

  // Run seeding
  const result = seedEvent(seededAthletes, {
    raceType,
    laneCount,
    heatCount,
    qualificationRule: preset.settings.qualificationRules.twoRounds,
  });

  // Format preview
  const preview = {
    heats: result.heats.map(heat => ({
      heatNumber: heat.heatNumber,
      athletes: heat.athletes.map(a => ({
        name: a.athlete.name,
        club: a.athlete.club,
        seedMark: a.athlete.seedMark,
        lane: a.lane,
      })),
    })),
  };

  return { success: true, preview };
}

/**
 * Manually adjust a single entry's heat/lane assignment
 */
export async function updateEntryAssignment(
  entryId: string,
  heatNumber: number | null,
  laneOrPosition: number | null,
  competitionId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Get entry and verify ownership
  const { data: entry } = await supabase
    .from('entries')
    .select(`
      id,
      event_id,
      events!inner(
        id,
        competitions!inner(created_by)
      )
    `)
    .eq('id', entryId)
    .single();

  if (!entry || (entry.events as any).competitions.created_by !== user.id) {
    return { error: 'Ingen tilgang' };
  }

  // Update entry
  const { error } = await supabase
    .from('entries')
    .update({
      heat_number: heatNumber,
      lane_or_position: laneOrPosition,
    })
    .eq('id', entryId);

  if (error) {
    return { error: 'Kunne ikke oppdatere' };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return { success: true };
}

/**
 * Get current seeding status for an event
 */
export async function getSeedingStatus(eventId: string): Promise<{
  hasSeeding: boolean;
  heatCount: number;
  entryCount: number;
  assignedCount: number;
}> {
  const supabase = await createClient();

  // Get heats count
  const { count: heatCount } = await supabase
    .from('heats')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  // Get entries count
  const { count: entryCount } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('status', ['registered', 'confirmed', 'checked_in']);

  // Get assigned count
  const { count: assignedCount } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .not('heat_number', 'is', null);

  return {
    hasSeeding: (heatCount || 0) > 0,
    heatCount: heatCount || 0,
    entryCount: entryCount || 0,
    assignedCount: assignedCount || 0,
  };
}
