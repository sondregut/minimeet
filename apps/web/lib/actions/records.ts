'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Types
export type RecordType = 'PB' | 'SB' | 'MR' | 'CR' | 'CLR' | 'NR' | 'AR' | 'WR';

export interface RecordSettings {
  id: string;
  competition_id: string;
  track_pb: boolean;
  track_sb: boolean;
  track_mr: boolean;
  track_cr: boolean;
  track_clr: boolean;
  track_nr: boolean;
  highlight_records: boolean;
  announce_records: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecordDefinition {
  id: string;
  competition_id: string | null;
  organization_id: string | null;
  record_type: RecordType;
  event_code: string;
  gender: string;
  age_group: string | null;
  mark_value: number;
  mark_display: string;
  wind: number | null;
  athlete_name: string;
  athlete_id: string | null;
  nationality: string | null;
  club_name: string | null;
  set_date: string;
  set_location: string | null;
  set_competition: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordBreak {
  id: string;
  competition_id: string;
  event_id: string;
  entry_id: string;
  record_type: RecordType;
  previous_record_id: string | null;
  previous_mark_value: number | null;
  previous_mark_display: string | null;
  previous_holder_name: string | null;
  previous_set_date: string | null;
  new_mark_value: number;
  new_mark_display: string;
  wind: number | null;
  athlete_id: string;
  athlete_name: string;
  is_official: boolean;
  is_announced: boolean;
  announced_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Record Settings
// ============================================================================

export async function getRecordSettings(
  competitionId: string
): Promise<ActionResult<RecordSettings | null>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('competition_record_settings')
    .select('*')
    .eq('competition_id', competitionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return { success: false, error: error.message };
  }

  return { success: true, data: data || null };
}

export async function upsertRecordSettings(
  settings: Partial<RecordSettings> & { competition_id: string }
): Promise<ActionResult<RecordSettings>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('competition_record_settings')
    .upsert(settings, { onConflict: 'competition_id' })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${settings.competition_id}`);
  return { success: true, data };
}

// ============================================================================
// Record Definitions
// ============================================================================

export async function getRecordDefinitions(params: {
  competitionId?: string;
  organizationId?: string;
  eventCode?: string;
  gender?: string;
  ageGroup?: string;
  recordType?: RecordType;
}): Promise<ActionResult<RecordDefinition[]>> {
  const supabase = await createClient();

  let query = supabase.from('record_definitions').select('*');

  if (params.competitionId) {
    query = query.eq('competition_id', params.competitionId);
  }
  if (params.organizationId) {
    query = query.eq('organization_id', params.organizationId);
  }
  if (params.eventCode) {
    query = query.eq('event_code', params.eventCode);
  }
  if (params.gender) {
    query = query.eq('gender', params.gender);
  }
  if (params.ageGroup !== undefined) {
    if (params.ageGroup === null) {
      query = query.is('age_group', null);
    } else {
      query = query.eq('age_group', params.ageGroup);
    }
  }
  if (params.recordType) {
    query = query.eq('record_type', params.recordType);
  }

  const { data, error } = await query.order('mark_value', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

export async function createRecordDefinition(
  record: Omit<RecordDefinition, 'id' | 'created_at' | 'updated_at' | 'is_verified' | 'verified_by' | 'verified_at'>
): Promise<ActionResult<RecordDefinition>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('record_definitions')
    .insert(record)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (record.competition_id) {
    revalidatePath(`/dashboard/competitions/${record.competition_id}`);
  }
  return { success: true, data };
}

export async function updateRecordDefinition(
  id: string,
  updates: Partial<RecordDefinition>
): Promise<ActionResult<RecordDefinition>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('record_definitions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.competition_id) {
    revalidatePath(`/dashboard/competitions/${data.competition_id}`);
  }
  return { success: true, data };
}

export async function deleteRecordDefinition(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Get the record first to know the competition_id for revalidation
  const { data: record } = await supabase
    .from('record_definitions')
    .select('competition_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('record_definitions')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  if (record?.competition_id) {
    revalidatePath(`/dashboard/competitions/${record.competition_id}`);
  }
  return { success: true };
}

// ============================================================================
// Record Breaks
// ============================================================================

export async function getRecordBreaks(params: {
  competitionId?: string;
  eventId?: string;
  athleteId?: string;
  recordType?: RecordType;
}): Promise<ActionResult<RecordBreak[]>> {
  const supabase = await createClient();

  let query = supabase.from('record_breaks').select('*');

  if (params.competitionId) {
    query = query.eq('competition_id', params.competitionId);
  }
  if (params.eventId) {
    query = query.eq('event_id', params.eventId);
  }
  if (params.athleteId) {
    query = query.eq('athlete_id', params.athleteId);
  }
  if (params.recordType) {
    query = query.eq('record_type', params.recordType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

export async function createRecordBreak(
  recordBreak: Omit<RecordBreak, 'id' | 'created_at' | 'updated_at' | 'is_official' | 'is_announced' | 'announced_at'>
): Promise<ActionResult<RecordBreak>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('record_breaks')
    .insert(recordBreak)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${recordBreak.competition_id}`);
  return { success: true, data };
}

export async function markRecordBreakOfficial(
  id: string,
  isOfficial: boolean
): Promise<ActionResult<RecordBreak>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('record_breaks')
    .update({ is_official: isOfficial })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${data.competition_id}`);
  return { success: true, data };
}

export async function markRecordBreakAnnounced(
  id: string
): Promise<ActionResult<RecordBreak>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('record_breaks')
    .update({ is_announced: true, announced_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${data.competition_id}`);
  return { success: true, data };
}

// ============================================================================
// Record Detection
// ============================================================================

interface CheckRecordParams {
  competitionId: string;
  eventId: string;
  entryId: string;
  athleteId: string;
  athleteName: string;
  eventCode: string;
  gender: string;
  ageGroup: string | null;
  markValue: number; // Time in seconds or distance in meters
  markDisplay: string;
  wind?: number | null;
  isTrackEvent: boolean; // For track events, lower is better
}

/**
 * Check if a result breaks any records (PB, SB, MR, CR, CLR, NR)
 * Returns array of record breaks that were detected
 */
export async function checkForRecordBreaks(
  params: CheckRecordParams
): Promise<ActionResult<{ recordBreaks: RecordBreak[]; isPB: boolean; isSB: boolean }>> {
  const supabase = await createClient();

  const recordBreaks: RecordBreak[] = [];
  let isPB = false;
  let isSB = false;

  // Get competition record settings
  const { data: settings } = await supabase
    .from('competition_record_settings')
    .select('*')
    .eq('competition_id', params.competitionId)
    .single();

  // Get athlete's current PB and SB
  const { data: athlete } = await supabase
    .from('athletes')
    .select('personal_bests, season_bests')
    .eq('id', params.athleteId)
    .single();

  // Check PB
  if (settings?.track_pb !== false) {
    const currentPB = athlete?.personal_bests?.[params.eventCode];
    if (currentPB) {
      const isBetter = params.isTrackEvent
        ? params.markValue < currentPB
        : params.markValue > currentPB;
      if (isBetter) {
        isPB = true;
      }
    } else {
      // No existing PB means this is their first recorded result
      isPB = true;
    }
  }

  // Check SB
  if (settings?.track_sb !== false) {
    const currentSB = athlete?.season_bests?.[params.eventCode];
    if (currentSB) {
      const isBetter = params.isTrackEvent
        ? params.markValue < currentSB
        : params.markValue > currentSB;
      if (isBetter) {
        isSB = true;
      }
    } else {
      // No existing SB means this is their first result this season
      isSB = true;
    }
  }

  // Get existing record definitions to check against
  const recordTypesToCheck: { type: RecordType; enabled: boolean; competitionId?: string; organizationId?: string }[] = [
    { type: 'MR', enabled: settings?.track_mr ?? false, competitionId: params.competitionId },
    { type: 'CR', enabled: settings?.track_cr ?? false, competitionId: params.competitionId },
    { type: 'CLR', enabled: settings?.track_clr ?? false },
    { type: 'NR', enabled: settings?.track_nr ?? false },
  ];

  for (const recordCheck of recordTypesToCheck) {
    if (!recordCheck.enabled) continue;

    // Build query for this record type
    let query = supabase
      .from('record_definitions')
      .select('*')
      .eq('record_type', recordCheck.type)
      .eq('event_code', params.eventCode)
      .eq('gender', params.gender);

    if (params.ageGroup) {
      query = query.eq('age_group', params.ageGroup);
    } else {
      query = query.is('age_group', null);
    }

    if (recordCheck.competitionId) {
      query = query.eq('competition_id', recordCheck.competitionId);
    }

    const { data: existingRecords } = await query;

    // Check if this result breaks any existing records
    for (const record of existingRecords || []) {
      const isBetter = params.isTrackEvent
        ? params.markValue < record.mark_value
        : params.markValue > record.mark_value;

      if (isBetter) {
        // Create a record break entry
        const { data: recordBreak, error } = await supabase
          .from('record_breaks')
          .insert({
            competition_id: params.competitionId,
            event_id: params.eventId,
            entry_id: params.entryId,
            record_type: recordCheck.type,
            previous_record_id: record.id,
            previous_mark_value: record.mark_value,
            previous_mark_display: record.mark_display,
            previous_holder_name: record.athlete_name,
            previous_set_date: record.set_date,
            new_mark_value: params.markValue,
            new_mark_display: params.markDisplay,
            wind: params.wind,
            athlete_id: params.athleteId,
            athlete_name: params.athleteName,
          })
          .select()
          .single();

        if (!error && recordBreak) {
          recordBreaks.push(recordBreak);

          // Update the record definition with the new record
          await supabase
            .from('record_definitions')
            .update({
              mark_value: params.markValue,
              mark_display: params.markDisplay,
              wind: params.wind,
              athlete_name: params.athleteName,
              athlete_id: params.athleteId,
              set_date: new Date().toISOString().split('T')[0],
              set_competition: params.competitionId,
              is_verified: false,
            })
            .eq('id', record.id);
        }
      }
    }
  }

  // Update athlete's PB and SB if improved
  if (isPB || isSB) {
    const updates: { personal_bests?: Record<string, number>; season_bests?: Record<string, number> } = {};

    if (isPB) {
      updates.personal_bests = {
        ...(athlete?.personal_bests || {}),
        [params.eventCode]: params.markValue,
      };
    }

    if (isSB) {
      updates.season_bests = {
        ...(athlete?.season_bests || {}),
        [params.eventCode]: params.markValue,
      };
    }

    await supabase
      .from('athletes')
      .update(updates)
      .eq('id', params.athleteId);
  }

  revalidatePath(`/dashboard/competitions/${params.competitionId}`);

  return {
    success: true,
    data: { recordBreaks, isPB, isSB },
  };
}

/**
 * Get summary of all records broken at a competition
 */
export async function getCompetitionRecordsSummary(
  competitionId: string
): Promise<ActionResult<{
  totalRecords: number;
  byType: Record<RecordType, number>;
  recentBreaks: RecordBreak[];
}>> {
  const supabase = await createClient();

  const { data: breaks, error } = await supabase
    .from('record_breaks')
    .select('*')
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  const byType: Record<RecordType, number> = {
    PB: 0,
    SB: 0,
    MR: 0,
    CR: 0,
    CLR: 0,
    NR: 0,
    AR: 0,
    WR: 0,
  };

  for (const brk of breaks || []) {
    byType[brk.record_type as RecordType]++;
  }

  return {
    success: true,
    data: {
      totalRecords: breaks?.length || 0,
      byType,
      recentBreaks: (breaks || []).slice(0, 10),
    },
  };
}
