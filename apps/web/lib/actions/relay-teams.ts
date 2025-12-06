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

// ============================================================================
// Types
// ============================================================================

export interface RelayTeamResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export interface RelayTeam {
  id: string;
  event_id: string;
  competition_id: string;
  club_id: string | null;
  club_name: string;
  team_name: string;
  bib_number: string | null;
  seed_time: string | null;
  seed_time_ms: number | null;
  heat_number: number | null;
  lane_or_position: number | null;
  status: 'registered' | 'confirmed' | 'checked_in' | 'DNS' | 'scratched';
  created_at: string;
  updated_at: string;
  legs?: RelayTeamLeg[];
  club?: {
    id: string;
    name: string;
  };
}

export interface RelayTeamLeg {
  id: string;
  relay_team_id: string;
  athlete_id: string | null;
  leg_number: number;
  status: 'pending' | 'confirmed' | 'DNS' | 'scratched';
  created_at: string;
  updated_at: string;
  athlete?: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
  };
}

export interface CreateRelayTeamInput {
  event_id: string;
  competition_id: string;
  club_id?: string;
  club_name: string;
  team_name: string;
  bib_number?: string;
  seed_time?: string;
  seed_time_ms?: number;
}

export interface UpdateRelayTeamInput {
  id: string;
  team_name?: string;
  bib_number?: string;
  seed_time?: string;
  seed_time_ms?: number;
  heat_number?: number;
  lane_or_position?: number;
  status?: 'registered' | 'confirmed' | 'checked_in' | 'DNS' | 'scratched';
}

export interface AssignLegAthleteInput {
  relay_team_id: string;
  leg_number: number;
  athlete_id: string | null;
}

// ============================================================================
// Relay Team CRUD
// ============================================================================

/**
 * Create a new relay team for a relay event.
 * The trigger will automatically create the leg entries.
 */
export async function createRelayTeam(input: CreateRelayTeamInput): Promise<RelayTeamResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn for å opprette et stafettlag' };
  }

  // Verify the event is a relay event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, event_type, event_code')
    .eq('id', input.event_id)
    .single();

  if (eventError || !event) {
    return { error: 'Fant ikke øvelsen' };
  }

  if (event.event_type !== 'relay') {
    return { error: 'Denne øvelsen er ikke en stafett' };
  }

  // Check if team name already exists for this event
  const { data: existingTeam } = await supabase
    .from('relay_teams')
    .select('id')
    .eq('event_id', input.event_id)
    .eq('team_name', input.team_name)
    .single();

  if (existingTeam) {
    return { error: 'Et lag med dette navnet er allerede påmeldt' };
  }

  const { data, error } = await supabase
    .from('relay_teams')
    .insert({
      event_id: input.event_id,
      competition_id: input.competition_id,
      club_id: input.club_id || null,
      club_name: input.club_name,
      team_name: input.team_name,
      bib_number: input.bib_number || null,
      seed_time: input.seed_time || null,
      seed_time_ms: input.seed_time_ms || null,
      status: 'registered',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating relay team:', error);
    return { error: 'Kunne ikke opprette stafettlag: ' + error.message };
  }

  revalidatePath(`/dashboard/competitions/${input.competition_id}`);
  return { success: true, id: data.id };
}

/**
 * Update a relay team's details
 */
export async function updateRelayTeam(input: UpdateRelayTeamInput): Promise<RelayTeamResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn for å oppdatere et stafettlag' };
  }

  const updateData: Record<string, unknown> = {};
  if (input.team_name !== undefined) updateData.team_name = input.team_name;
  if (input.bib_number !== undefined) updateData.bib_number = input.bib_number;
  if (input.seed_time !== undefined) updateData.seed_time = input.seed_time;
  if (input.seed_time_ms !== undefined) updateData.seed_time_ms = input.seed_time_ms;
  if (input.heat_number !== undefined) updateData.heat_number = input.heat_number;
  if (input.lane_or_position !== undefined) updateData.lane_or_position = input.lane_or_position;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from('relay_teams')
    .update(updateData)
    .eq('id', input.id)
    .select('competition_id')
    .single();

  if (error) {
    console.error('Error updating relay team:', error);
    return { error: 'Kunne ikke oppdatere stafettlag: ' + error.message };
  }

  revalidatePath(`/dashboard/competitions/${data.competition_id}`);
  return { success: true, id: input.id };
}

/**
 * Delete a relay team and its leg entries
 */
export async function deleteRelayTeam(id: string): Promise<RelayTeamResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn for å slette et stafettlag' };
  }

  // Get competition_id before deleting
  const { data: team } = await supabase
    .from('relay_teams')
    .select('competition_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('relay_teams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting relay team:', error);
    return { error: 'Kunne ikke slette stafettlag: ' + error.message };
  }

  if (team) {
    revalidatePath(`/dashboard/competitions/${team.competition_id}`);
  }
  return { success: true };
}

// ============================================================================
// Relay Team Queries
// ============================================================================

/**
 * Get all relay teams for an event with their leg assignments
 */
export async function getRelayTeamsForEvent(eventId: string): Promise<RelayTeam[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('relay_teams')
    .select(`
      *,
      club:organizations(id, name),
      legs:relay_team_legs(
        *,
        athlete:athletes(id, first_name, last_name, club_name)
      )
    `)
    .eq('event_id', eventId)
    .order('heat_number', { ascending: true, nullsFirst: false })
    .order('lane_or_position', { ascending: true, nullsFirst: false })
    .order('team_name', { ascending: true });

  if (error) {
    console.error('Error fetching relay teams:', error);
    return [];
  }

  // Sort legs by leg_number
  return (data || []).map(team => ({
    ...team,
    legs: team.legs?.sort((a: RelayTeamLeg, b: RelayTeamLeg) => a.leg_number - b.leg_number) || []
  }));
}

/**
 * Get a single relay team with legs
 */
export async function getRelayTeam(id: string): Promise<RelayTeam | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('relay_teams')
    .select(`
      *,
      club:organizations(id, name),
      legs:relay_team_legs(
        *,
        athlete:athletes(id, first_name, last_name, club_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching relay team:', error);
    return null;
  }

  return {
    ...data,
    legs: data.legs?.sort((a: RelayTeamLeg, b: RelayTeamLeg) => a.leg_number - b.leg_number) || []
  };
}

/**
 * Get all relay teams for a competition (for speaker/startlist views)
 */
export async function getRelayTeamsForCompetition(competitionId: string): Promise<RelayTeam[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('relay_teams')
    .select(`
      *,
      club:organizations(id, name),
      legs:relay_team_legs(
        *,
        athlete:athletes(id, first_name, last_name, club_name)
      )
    `)
    .eq('competition_id', competitionId)
    .order('team_name', { ascending: true });

  if (error) {
    console.error('Error fetching relay teams for competition:', error);
    return [];
  }

  return (data || []).map(team => ({
    ...team,
    legs: team.legs?.sort((a: RelayTeamLeg, b: RelayTeamLeg) => a.leg_number - b.leg_number) || []
  }));
}

// ============================================================================
// Leg Assignment
// ============================================================================

/**
 * Assign an athlete to a specific leg of a relay team
 */
export async function assignLegAthlete(input: AssignLegAthleteInput): Promise<RelayTeamResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn for å tildele løpere' };
  }

  // Get the leg entry
  const { data: leg, error: legError } = await supabase
    .from('relay_team_legs')
    .select('id, relay_team_id')
    .eq('relay_team_id', input.relay_team_id)
    .eq('leg_number', input.leg_number)
    .single();

  if (legError || !leg) {
    return { error: 'Fant ikke etappen' };
  }

  // Update the athlete assignment
  const { error } = await supabase
    .from('relay_team_legs')
    .update({
      athlete_id: input.athlete_id,
      status: input.athlete_id ? 'confirmed' : 'pending',
    })
    .eq('id', leg.id);

  if (error) {
    console.error('Error assigning athlete to leg:', error);
    return { error: 'Kunne ikke tildele løper: ' + error.message };
  }

  // Get competition_id for revalidation
  const { data: team } = await supabase
    .from('relay_teams')
    .select('competition_id')
    .eq('id', input.relay_team_id)
    .single();

  if (team) {
    revalidatePath(`/dashboard/competitions/${team.competition_id}`);
  }
  return { success: true };
}

/**
 * Bulk assign athletes to all legs of a relay team
 */
export async function assignAllLegs(
  relayTeamId: string,
  assignments: { leg_number: number; athlete_id: string | null }[]
): Promise<RelayTeamResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn for å tildele løpere' };
  }

  // Update each leg
  for (const assignment of assignments) {
    const { error } = await supabase
      .from('relay_team_legs')
      .update({
        athlete_id: assignment.athlete_id,
        status: assignment.athlete_id ? 'confirmed' : 'pending',
      })
      .eq('relay_team_id', relayTeamId)
      .eq('leg_number', assignment.leg_number);

    if (error) {
      console.error('Error assigning athlete to leg:', error);
      return { error: `Kunne ikke tildele løper til etappe ${assignment.leg_number}` };
    }
  }

  // Get competition_id for revalidation
  const { data: team } = await supabase
    .from('relay_teams')
    .select('competition_id')
    .eq('id', relayTeamId)
    .single();

  if (team) {
    revalidatePath(`/dashboard/competitions/${team.competition_id}`);
  }
  return { success: true };
}

// ============================================================================
// Status Management
// ============================================================================

/**
 * Check in a relay team (like check-in for individual athletes)
 */
export async function checkInRelayTeam(id: string): Promise<RelayTeamResult> {
  return updateRelayTeam({ id, status: 'checked_in' });
}

/**
 * Mark a relay team as DNS (Did Not Start)
 */
export async function markRelayTeamDNS(id: string): Promise<RelayTeamResult> {
  return updateRelayTeam({ id, status: 'DNS' });
}

/**
 * Scratch a relay team from the event
 */
export async function scratchRelayTeam(id: string): Promise<RelayTeamResult> {
  return updateRelayTeam({ id, status: 'scratched' });
}

// ============================================================================
// Heat Assignment
// ============================================================================

/**
 * Assign heat and lane to a relay team
 */
export async function assignRelayTeamToHeat(
  id: string,
  heatNumber: number,
  lane: number
): Promise<RelayTeamResult> {
  return updateRelayTeam({
    id,
    heat_number: heatNumber,
    lane_or_position: lane,
  });
}

/**
 * Clear heat assignment for a relay team
 */
export async function clearRelayTeamHeat(id: string): Promise<RelayTeamResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Du må være logget inn' };
  }

  const { data, error } = await supabase
    .from('relay_teams')
    .update({
      heat_number: null,
      lane_or_position: null,
    })
    .eq('id', id)
    .select('competition_id')
    .single();

  if (error) {
    return { error: 'Kunne ikke fjerne heat-tildeling' };
  }

  revalidatePath(`/dashboard/competitions/${data.competition_id}`);
  return { success: true };
}

// ============================================================================
// Public API (for speaker/results pages)
// ============================================================================

/**
 * Get relay teams for public display (speaker page, results)
 */
export async function getPublicRelayTeams(eventId: string): Promise<RelayTeam[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('relay_teams')
    .select(`
      id,
      team_name,
      club_name,
      bib_number,
      heat_number,
      lane_or_position,
      status,
      legs:relay_team_legs(
        leg_number,
        status,
        athlete:athletes(first_name, last_name)
      )
    `)
    .eq('event_id', eventId)
    .order('heat_number', { ascending: true, nullsFirst: false })
    .order('lane_or_position', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching public relay teams:', error);
    return [];
  }

  return (data || []).map(team => ({
    ...team,
    legs: team.legs?.sort((a: { leg_number: number }, b: { leg_number: number }) => a.leg_number - b.leg_number) || []
  })) as unknown as RelayTeam[];
}
