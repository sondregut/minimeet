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

export interface ResultResponse {
  success?: boolean;
  error?: string;
  id?: string;
}

// ============================================================================
// TRACK RESULTS
// ============================================================================

export interface TrackResultInput {
  entry_id: string;
  time_ms?: number;
  time_display?: string;
  place?: number;
  reaction_time_ms?: number;
  wind?: number;
  status: 'finished' | 'DNS' | 'DNF' | 'DQ' | 'FS';
  dq_rule?: string;
  notes?: string;
}

export async function createTrackResult(input: TrackResultInput): Promise<ResultResponse> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to record results' };
  }

  // Check if result already exists for this entry
  const { data: existingResult } = await supabase
    .from('track_results')
    .select('id')
    .eq('entry_id', input.entry_id)
    .single();

  if (existingResult) {
    // Update existing result
    const { error } = await supabase
      .from('track_results')
      .update({
        time_ms: input.time_ms,
        time_display: input.time_display,
        place: input.place,
        reaction_time_ms: input.reaction_time_ms,
        wind: input.wind,
        status: input.status,
        dq_rule: input.dq_rule || null,
        notes: input.notes || null,
      })
      .eq('id', existingResult.id);

    if (error) {
      console.error('Error updating track result:', error);
      return { error: error.message };
    }

    return { success: true, id: existingResult.id };
  }

  // Create new result
  const { data, error } = await supabase
    .from('track_results')
    .insert({
      entry_id: input.entry_id,
      time_ms: input.time_ms,
      time_display: input.time_display,
      place: input.place,
      reaction_time_ms: input.reaction_time_ms,
      wind: input.wind,
      status: input.status,
      dq_rule: input.dq_rule || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating track result:', error);
    return { error: error.message };
  }

  return { success: true, id: data.id };
}

export async function getTrackResultsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('track_results')
    .select(`
      *,
      entry:entries(
        id,
        bib_number,
        lane_or_position,
        athlete:athletes(
          id,
          first_name,
          last_name,
          club_name,
          nationality
        )
      )
    `)
    .eq('entry.event_id', eventId);

  if (error) {
    console.error('Error fetching track results:', error);
    return [];
  }

  // Filter out nulls (entries that don't match the event)
  return (data || []).filter(r => r.entry !== null);
}

export async function getTrackResultByEntry(entryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('track_results')
    .select('*')
    .eq('entry_id', entryId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching track result:', error);
    return null;
  }

  return data;
}

export async function saveTrackResults(
  eventId: string,
  competitionId: string,
  results: TrackResultInput[],
  eventWind?: number
): Promise<ResultResponse> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to record results' };
  }

  // Calculate places for finished athletes
  const finishedResults = results
    .filter(r => r.status === 'finished' && r.time_ms)
    .sort((a, b) => (a.time_ms || 0) - (b.time_ms || 0));

  let place = 1;
  finishedResults.forEach((result, index) => {
    // Handle ties (same time = same place)
    if (index > 0 && result.time_ms === finishedResults[index - 1].time_ms) {
      result.place = finishedResults[index - 1].place;
    } else {
      result.place = place;
    }
    place++;
  });

  // Save each result
  for (const result of results) {
    // Apply event wind if individual wind not set
    const wind = result.wind ?? eventWind;

    const saveResult = await createTrackResult({
      ...result,
      wind,
    });

    if (saveResult.error) {
      return saveResult;
    }
  }

  // Update event wind reading if provided
  if (eventWind !== undefined) {
    await supabase
      .from('events')
      .update({ wind_reading: eventWind })
      .eq('id', eventId);
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true };
}

export async function deleteTrackResult(entryId: string): Promise<ResultResponse> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('track_results')
    .delete()
    .eq('entry_id', entryId);

  if (error) {
    console.error('Error deleting track result:', error);
    return { error: error.message };
  }

  return { success: true };
}

// ============================================================================
// FIELD RESULTS (Horizontal Jumps & Throws)
// ============================================================================

export interface FieldAttemptInput {
  attempt_number: number;
  distance?: number;
  wind?: number;
  is_foul: boolean;
  is_pass: boolean;
}

export interface FieldResultInput {
  entry_id: string;
  attempts: FieldAttemptInput[];
  status: 'active' | 'complete' | 'retired' | 'NM' | 'ND';
  notes?: string;
}

export async function saveFieldResult(
  input: FieldResultInput,
  competitionId: string,
  eventId: string
): Promise<ResultResponse> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to record results' };
  }

  // Calculate best mark from attempts
  const validAttempts = input.attempts.filter(a => !a.is_foul && !a.is_pass && a.distance);
  const bestMark = validAttempts.length > 0
    ? Math.max(...validAttempts.map(a => a.distance!))
    : null;

  // Find best legal mark (wind <= 2.0 for jumps)
  const legalAttempts = validAttempts.filter(a => !a.wind || a.wind <= 2.0);
  const bestLegalMark = legalAttempts.length > 0
    ? Math.max(...legalAttempts.map(a => a.distance!))
    : null;

  // Find wind for best mark
  const bestAttempt = validAttempts.find(a => a.distance === bestMark);
  const bestMarkWind = bestAttempt?.wind;

  // Check if result exists
  const { data: existingResult } = await supabase
    .from('field_results')
    .select('id')
    .eq('entry_id', input.entry_id)
    .single();

  let resultId: string;

  if (existingResult) {
    // Update existing result
    const { error } = await supabase
      .from('field_results')
      .update({
        best_mark: bestMark,
        best_mark_wind: bestMarkWind,
        best_legal_mark: bestLegalMark,
        attempts_taken: input.attempts.filter(a => !a.is_pass).length,
        status: input.status,
        notes: input.notes || null,
      })
      .eq('id', existingResult.id);

    if (error) {
      console.error('Error updating field result:', error);
      return { error: error.message };
    }

    resultId = existingResult.id;

    // Delete existing attempts
    await supabase
      .from('field_attempts')
      .delete()
      .eq('result_id', resultId);
  } else {
    // Create new result
    const { data, error } = await supabase
      .from('field_results')
      .insert({
        entry_id: input.entry_id,
        best_mark: bestMark,
        best_mark_wind: bestMarkWind,
        best_legal_mark: bestLegalMark,
        attempts_taken: input.attempts.filter(a => !a.is_pass).length,
        status: input.status,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating field result:', error);
      return { error: error.message };
    }

    resultId = data.id;
  }

  // Insert attempts
  const attemptsToInsert = input.attempts
    .filter(a => !a.is_pass || a.distance !== undefined || a.is_foul)
    .map(a => ({
      result_id: resultId,
      attempt_number: a.attempt_number,
      distance: a.is_foul ? null : a.distance,
      wind: a.wind,
      is_foul: a.is_foul,
      is_pass: a.is_pass,
    }));

  if (attemptsToInsert.length > 0) {
    const { error: attemptsError } = await supabase
      .from('field_attempts')
      .insert(attemptsToInsert);

    if (attemptsError) {
      console.error('Error creating field attempts:', attemptsError);
      return { error: attemptsError.message };
    }
  }

  // Auto-recalculate places after saving
  await recalculateFieldEventPlaces(eventId, competitionId);

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true, id: resultId };
}

export async function getFieldResultsByEvent(eventId: string) {
  const supabase = await createClient();

  // First get all entries for this event
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('id')
    .eq('event_id', eventId);

  if (entriesError || !entries) {
    console.error('Error fetching entries:', entriesError);
    return [];
  }

  const entryIds = entries.map(e => e.id);

  if (entryIds.length === 0) return [];

  const { data, error } = await supabase
    .from('field_results')
    .select(`
      *,
      entry:entries(
        id,
        bib_number,
        lane_or_position,
        athlete:athletes(
          id,
          first_name,
          last_name,
          club_name,
          nationality
        )
      ),
      attempts:field_attempts(*)
    `)
    .in('entry_id', entryIds)
    .order('best_mark', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching field results:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// VERTICAL RESULTS (High Jump & Pole Vault)
// ============================================================================

export interface VerticalAttemptInput {
  height: number;
  attempt_number: number;
  outcome: 'o' | 'x' | '-' | 'r'; // made, miss, pass, retry
}

export interface VerticalResultInput {
  entry_id: string;
  attempts: VerticalAttemptInput[];
  status: 'active' | 'eliminated' | 'retired' | 'NH';
  notes?: string;
}

export async function saveVerticalResult(
  input: VerticalResultInput,
  competitionId: string,
  eventId: string
): Promise<ResultResponse> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to record results' };
  }

  // Calculate best height (highest cleared) - convert from cm to meters for storage
  const clearedHeights = input.attempts
    .filter(a => a.outcome === 'o')
    .map(a => a.height);
  const bestHeightCm = clearedHeights.length > 0
    ? Math.max(...clearedHeights)
    : null;
  // Convert to meters for database storage (column is NUMERIC(4,2) which supports up to 99.99)
  const bestHeight = bestHeightCm !== null ? bestHeightCm / 100 : null;

  // Count total attempts and misses
  // NOTE: For tie-breaking, we only count misses at heights that were CLEARED.
  // Misses at heights above the best cleared height are NOT relevant (WA/IAAF rules).
  // Example: If athlete A clears 1.20 (1 miss), stops, and athlete B clears 1.20 (1 miss)
  // then fails XXX at 1.25, they should be tied (both have 1 miss at cleared heights).
  const totalAttempts = input.attempts.filter(a => a.outcome === 'o' || a.outcome === 'x').length;
  const totalMisses = bestHeightCm
    ? input.attempts.filter(a => a.outcome === 'x' && a.height <= bestHeightCm).length
    : 0;

  // Count misses at best height (for tie-breaking) - use cm value for comparison
  const missesAtBest = bestHeightCm
    ? input.attempts.filter(a => a.height === bestHeightCm && a.outcome === 'x').length
    : 0;

  // Check if result exists
  const { data: existingResult } = await supabase
    .from('vertical_results')
    .select('id')
    .eq('entry_id', input.entry_id)
    .single();

  let resultId: string;

  if (existingResult) {
    // Update existing result
    const { error } = await supabase
      .from('vertical_results')
      .update({
        best_height: bestHeight,
        total_attempts: totalAttempts,
        total_misses: totalMisses,
        misses_at_best: missesAtBest,
        status: input.status,
        notes: input.notes || null,
      })
      .eq('id', existingResult.id);

    if (error) {
      console.error('Error updating vertical result:', error);
      return { error: error.message };
    }

    resultId = existingResult.id;

    // Delete existing attempts
    await supabase
      .from('vertical_attempts')
      .delete()
      .eq('result_id', resultId);
  } else {
    // Create new result
    const { data, error } = await supabase
      .from('vertical_results')
      .insert({
        entry_id: input.entry_id,
        best_height: bestHeight,
        total_attempts: totalAttempts,
        total_misses: totalMisses,
        misses_at_best: missesAtBest,
        status: input.status,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vertical result:', error);
      return { error: error.message };
    }

    resultId = data.id;
  }

  // Insert attempts - convert height from cm to meters for database storage
  const attemptsToInsert = input.attempts.map(a => ({
    result_id: resultId,
    height: a.height / 100, // Convert cm to meters for DECIMAL(4,2) column
    attempt_number: a.attempt_number,
    outcome: a.outcome,
  }));

  if (attemptsToInsert.length > 0) {
    const { error: attemptsError } = await supabase
      .from('vertical_attempts')
      .insert(attemptsToInsert);

    if (attemptsError) {
      console.error('Error creating vertical attempts:', attemptsError);
      return { error: attemptsError.message };
    }
  }

  // Auto-recalculate places after saving
  await recalculateVerticalEventPlaces(eventId, competitionId);

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);

  return { success: true, id: resultId };
}

export async function getVerticalResultsByEvent(eventId: string) {
  const supabase = await createClient();

  // First get all entries for this event
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('id')
    .eq('event_id', eventId);

  if (entriesError || !entries) {
    console.error('Error fetching entries:', entriesError);
    return [];
  }

  const entryIds = entries.map(e => e.id);

  if (entryIds.length === 0) return [];

  const { data, error } = await supabase
    .from('vertical_results')
    .select(`
      *,
      entry:entries(
        id,
        bib_number,
        lane_or_position,
        athlete:athletes(
          id,
          first_name,
          last_name,
          club_name,
          nationality
        )
      ),
      attempts:vertical_attempts(*)
    `)
    .in('entry_id', entryIds)
    .order('best_height', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching vertical results:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// PLACE CALCULATION & RECALCULATION
// ============================================================================

/**
 * Recalculate places for all results in a field event
 * Sorting: best_mark DESC, then by fewer attempts at best mark, then by earlier best
 */
export async function recalculateFieldEventPlaces(
  eventId: string,
  competitionId: string
): Promise<ResultResponse> {
  const supabase = await createClient();

  const results = await getFieldResultsByEvent(eventId);

  if (!results || results.length === 0) {
    return { success: true };
  }

  // Filter to only include athletes with valid marks
  const validResults = results.filter(r => r.best_mark !== null && r.status !== 'ND');
  const invalidResults = results.filter(r => r.best_mark === null || r.status === 'ND');

  // Sort by best_mark descending
  // Tie-break: best_legal_mark, then fewer attempts
  validResults.sort((a, b) => {
    // Primary: best mark (descending)
    if (b.best_mark !== a.best_mark) {
      return (b.best_mark || 0) - (a.best_mark || 0);
    }
    // Tie-break 1: best legal mark (descending)
    if (b.best_legal_mark !== a.best_legal_mark) {
      return (b.best_legal_mark || 0) - (a.best_legal_mark || 0);
    }
    // Tie-break 2: fewer attempts taken
    return (a.attempts_taken || 0) - (b.attempts_taken || 0);
  });

  // Assign places with tie handling
  let currentPlace = 1;
  for (let i = 0; i < validResults.length; i++) {
    const result = validResults[i];

    if (i > 0) {
      const prev = validResults[i - 1];
      // Same best_mark = same place (tie)
      if (result.best_mark === prev.best_mark) {
        result.place = prev.place;
      } else {
        result.place = currentPlace;
      }
    } else {
      result.place = currentPlace;
    }
    currentPlace++;

    // Update in database
    const { error } = await supabase
      .from('field_results')
      .update({ place: result.place })
      .eq('id', result.id);

    if (error) {
      console.error('Error updating field result place:', error);
      return { error: error.message };
    }
  }

  // Set null place for invalid results (NM, ND)
  for (const result of invalidResults) {
    await supabase
      .from('field_results')
      .update({ place: null })
      .eq('id', result.id);
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);
  revalidatePath(`/results/${competitionId}/${eventId}`);

  return { success: true };
}

/**
 * Recalculate places for all results in a vertical event
 * Sorting: best_height DESC, then misses_at_best ASC, then total_misses ASC
 */
export async function recalculateVerticalEventPlaces(
  eventId: string,
  competitionId: string
): Promise<ResultResponse> {
  const supabase = await createClient();

  const results = await getVerticalResultsByEvent(eventId);

  if (!results || results.length === 0) {
    return { success: true };
  }

  // Filter to only include athletes with valid heights
  const validResults = results.filter(r => r.best_height !== null && r.status !== 'NH');
  const invalidResults = results.filter(r => r.best_height === null || r.status === 'NH');

  // Sort by IAAF rules:
  // 1. Best height (descending)
  // 2. Misses at best height (ascending - fewer is better)
  // 3. Total misses (ascending - fewer is better)
  validResults.sort((a, b) => {
    // Primary: best height (descending)
    if (b.best_height !== a.best_height) {
      return (b.best_height || 0) - (a.best_height || 0);
    }
    // Tie-break 1: misses at best height (ascending)
    if (a.misses_at_best !== b.misses_at_best) {
      return (a.misses_at_best || 0) - (b.misses_at_best || 0);
    }
    // Tie-break 2: total misses (ascending)
    return (a.total_misses || 0) - (b.total_misses || 0);
  });

  // Assign places with tie handling
  let currentPlace = 1;
  for (let i = 0; i < validResults.length; i++) {
    const result = validResults[i];

    if (i > 0) {
      const prev = validResults[i - 1];
      // Same height AND same misses_at_best AND same total_misses = tie
      if (result.best_height === prev.best_height &&
          result.misses_at_best === prev.misses_at_best &&
          result.total_misses === prev.total_misses) {
        result.place = prev.place;
      } else {
        result.place = currentPlace;
      }
    } else {
      result.place = currentPlace;
    }
    currentPlace++;

    // Update in database
    const { error } = await supabase
      .from('vertical_results')
      .update({ place: result.place })
      .eq('id', result.id);

    if (error) {
      console.error('Error updating vertical result place:', error);
      return { error: error.message };
    }
  }

  // Set null place for invalid results (NH)
  for (const result of invalidResults) {
    await supabase
      .from('vertical_results')
      .update({ place: null })
      .eq('id', result.id);
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);
  revalidatePath(`/results/${competitionId}/${eventId}`);

  return { success: true };
}

/**
 * Recalculate places for all results in a track event
 * Sorting: time_ms ASC (fastest first)
 */
export async function recalculateTrackEventPlaces(
  eventId: string,
  competitionId: string
): Promise<ResultResponse> {
  const supabase = await createClient();

  const results = await getTrackResultsByEvent(eventId);

  if (!results || results.length === 0) {
    return { success: true };
  }

  // Filter to only include finished athletes with valid times
  const finishedResults = results.filter(r => r.status === 'finished' && r.time_ms);
  const unfinishedResults = results.filter(r => r.status !== 'finished' || !r.time_ms);

  // Sort by time ascending (fastest first)
  finishedResults.sort((a, b) => (a.time_ms || 0) - (b.time_ms || 0));

  // Assign places with tie handling
  let currentPlace = 1;
  for (let i = 0; i < finishedResults.length; i++) {
    const result = finishedResults[i];

    if (i > 0) {
      const prev = finishedResults[i - 1];
      // Same time = same place (tie)
      if (result.time_ms === prev.time_ms) {
        result.place = prev.place;
      } else {
        result.place = currentPlace;
      }
    } else {
      result.place = currentPlace;
    }
    currentPlace++;

    // Update in database
    const { error } = await supabase
      .from('track_results')
      .update({ place: result.place })
      .eq('id', result.id);

    if (error) {
      console.error('Error updating track result place:', error);
      return { error: error.message };
    }
  }

  // Set null place for unfinished results (DNS, DNF, DQ, FS)
  for (const result of unfinishedResults) {
    await supabase
      .from('track_results')
      .update({ place: null })
      .eq('id', result.id);
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);
  revalidatePath(`/results/${competitionId}/${eventId}`);

  return { success: true };
}

/**
 * Recalculate all places for an event based on event type
 */
export async function recalculateEventPlaces(
  eventId: string,
  competitionId: string,
  eventType: string
): Promise<ResultResponse> {
  if (eventType === 'track' || eventType === 'relay' || eventType === 'road') {
    return recalculateTrackEventPlaces(eventId, competitionId);
  } else if (eventType === 'field_vertical') {
    return recalculateVerticalEventPlaces(eventId, competitionId);
  } else if (eventType === 'field_horizontal' || eventType === 'throw') {
    return recalculateFieldEventPlaces(eventId, competitionId);
  }

  return { error: 'Unknown event type' };
}

// ============================================================================
// PERSONAL BEST (PB) & SEASON BEST (SB) DETECTION
// ============================================================================

/**
 * Check if a result is a Personal Best (PB) or Season Best (SB)
 * and update the result and personal_bests table accordingly
 */
export async function checkAndUpdateRecords(
  athleteId: string,
  eventCode: string,
  mark: number, // time_ms for track, distance in meters for field, height in meters for vertical
  eventType: string,
  resultId: string,
  resultTable: 'track_results' | 'field_results' | 'vertical_results'
): Promise<{ isPB: boolean; isSB: boolean }> {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();

  // Get existing personal best for this athlete + event
  const { data: existingPB } = await supabase
    .from('personal_bests')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('event_code', eventCode)
    .single();

  let isPB = false;
  let isSB = false;

  // Determine if this is a better mark
  // For track: lower is better (time in ms)
  // For field/vertical: higher is better (distance/height)
  const isBetter = (newMark: number, oldMark: number | null): boolean => {
    if (oldMark === null) return true;
    if (eventType === 'track' || eventType === 'relay' || eventType === 'road') {
      return newMark < oldMark;
    }
    return newMark > oldMark;
  };

  if (!existingPB) {
    // No existing record - this is both PB and SB
    isPB = true;
    isSB = true;

    // Create new personal_bests entry
    await supabase
      .from('personal_bests')
      .insert({
        athlete_id: athleteId,
        event_code: eventCode,
        best_mark: mark,
        best_mark_date: new Date().toISOString().split('T')[0],
        season_best: mark,
        season_best_date: new Date().toISOString().split('T')[0],
        season_year: currentYear,
      });
  } else {
    // Check if this is a new PB
    if (isBetter(mark, existingPB.best_mark)) {
      isPB = true;
      await supabase
        .from('personal_bests')
        .update({
          best_mark: mark,
          best_mark_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', existingPB.id);
    }

    // Check if this is a new SB (same season or new season)
    if (existingPB.season_year !== currentYear) {
      // New season - this is the first mark, so it's SB
      isSB = true;
      await supabase
        .from('personal_bests')
        .update({
          season_best: mark,
          season_best_date: new Date().toISOString().split('T')[0],
          season_year: currentYear,
        })
        .eq('id', existingPB.id);
    } else if (isBetter(mark, existingPB.season_best)) {
      // Same season, better mark
      isSB = true;
      await supabase
        .from('personal_bests')
        .update({
          season_best: mark,
          season_best_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', existingPB.id);
    }
  }

  // Update the result record with PB/SB flags
  if (isPB || isSB) {
    await supabase
      .from(resultTable)
      .update({
        is_pb: isPB,
        is_sb: isSB,
      })
      .eq('id', resultId);
  }

  return { isPB, isSB };
}

/**
 * Detect and update PB/SB for all results in an event
 * Also checks for MR/CR/NR if record settings are configured
 */
export async function detectRecordsForEvent(
  eventId: string,
  competitionId: string,
  eventType: string,
  eventCode: string,
  gender?: string,
  ageGroup?: string | null
): Promise<ResultResponse> {
  const supabase = await createClient();

  // Import checkForRecordBreaks dynamically to avoid circular dependencies
  const { checkForRecordBreaks } = await import('./records');

  const isTrackEvent = eventType === 'track' || eventType === 'relay' || eventType === 'road';

  if (isTrackEvent) {
    const results = await getTrackResultsByEvent(eventId);
    for (const result of results) {
      if (result.status === 'finished' && result.time_ms && result.entry?.athlete?.id) {
        // Check PB/SB using existing function
        await checkAndUpdateRecords(
          result.entry.athlete.id,
          eventCode,
          result.time_ms,
          eventType,
          result.id,
          'track_results'
        );

        // Check for MR/CR/NR using new records system
        if (gender) {
          const athleteName = `${result.entry.athlete.first_name} ${result.entry.athlete.last_name}`;
          const timeDisplay = result.time_display || formatTime(result.time_ms);

          await checkForRecordBreaks({
            competitionId,
            eventId,
            entryId: result.entry.id,
            athleteId: result.entry.athlete.id,
            athleteName,
            eventCode,
            gender,
            ageGroup: ageGroup || null,
            markValue: result.time_ms / 1000, // Convert ms to seconds for storage
            markDisplay: timeDisplay,
            wind: result.wind,
            isTrackEvent: true,
          });
        }
      }
    }
  } else if (eventType === 'field_vertical') {
    const results = await getVerticalResultsByEvent(eventId);
    for (const result of results) {
      if (result.best_height && result.entry?.athlete?.id) {
        await checkAndUpdateRecords(
          result.entry.athlete.id,
          eventCode,
          result.best_height,
          eventType,
          result.id,
          'vertical_results'
        );

        // Check for MR/CR/NR
        if (gender) {
          const athleteName = `${result.entry.athlete.first_name} ${result.entry.athlete.last_name}`;

          await checkForRecordBreaks({
            competitionId,
            eventId,
            entryId: result.entry.id,
            athleteId: result.entry.athlete.id,
            athleteName,
            eventCode,
            gender,
            ageGroup: ageGroup || null,
            markValue: result.best_height,
            markDisplay: `${result.best_height.toFixed(2)}m`,
            wind: null,
            isTrackEvent: false,
          });
        }
      }
    }
  } else if (eventType === 'field_horizontal' || eventType === 'throw') {
    const results = await getFieldResultsByEvent(eventId);
    for (const result of results) {
      if (result.best_mark && result.entry?.athlete?.id) {
        await checkAndUpdateRecords(
          result.entry.athlete.id,
          eventCode,
          result.best_mark,
          eventType,
          result.id,
          'field_results'
        );

        // Check for MR/CR/NR
        if (gender) {
          const athleteName = `${result.entry.athlete.first_name} ${result.entry.athlete.last_name}`;

          await checkForRecordBreaks({
            competitionId,
            eventId,
            entryId: result.entry.id,
            athleteId: result.entry.athlete.id,
            athleteName,
            eventCode,
            gender,
            ageGroup: ageGroup || null,
            markValue: result.best_mark,
            markDisplay: `${result.best_mark.toFixed(2)}m`,
            wind: result.best_mark_wind,
            isTrackEvent: false,
          });
        }
      }
    }
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/events/${eventId}`);
  revalidatePath(`/results/${competitionId}/${eventId}`);

  return { success: true };
}

// Helper function to format time in ms to display string
function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  }
  return totalSeconds.toFixed(2);
}

/**
 * Recalculate all places AND detect records for an event
 */
export async function recalculateAll(
  eventId: string,
  competitionId: string,
  eventType: string,
  eventCode: string,
  gender?: string,
  ageGroup?: string | null
): Promise<ResultResponse> {
  // First recalculate places
  const placesResult = await recalculateEventPlaces(eventId, competitionId, eventType);
  if (placesResult.error) {
    return placesResult;
  }

  // Then detect records (PB/SB and MR/CR/NR)
  const recordsResult = await detectRecordsForEvent(
    eventId,
    competitionId,
    eventType,
    eventCode,
    gender,
    ageGroup
  );
  if (recordsResult.error) {
    return recordsResult;
  }

  return { success: true };
}
