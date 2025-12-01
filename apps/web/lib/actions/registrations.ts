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

export type RegistrationMode = 'disabled' | 'organizer_only' | 'self_service' | 'hybrid';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'waitlist' | 'withdrawn';

export interface RegistrationSettings {
  id: string;
  competition_id: string;
  mode: RegistrationMode;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  require_license_number: boolean;
  require_pb: boolean;
  require_sb: boolean;
  require_date_of_birth: boolean;
  require_club: boolean;
  qualification_standards: Record<string, { min?: number; max?: number }>;
  max_entries_per_athlete: number;
  welcome_message: string | null;
  terms_and_conditions: string | null;
  contact_email: string | null;
  auto_approve: boolean;
}

export interface EventRegistrationSettings {
  id: string;
  event_id: string;
  registration_enabled: boolean;
  registration_closes_at: string | null;
  max_participants: number | null;
  min_standard: number | null;
  max_standard: number | null;
  min_age: number | null;
  max_age: number | null;
  allowed_genders: string[];
  registration_notes: string | null;
}

export interface Registration {
  id: string;
  competition_id: string;
  submitted_by: string | null;
  athlete_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string;
  nationality: string;
  club_name: string | null;
  license_number: string | null;
  status: RegistrationStatus;
  athlete_message: string | null;
  organizer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  registration_events?: RegistrationEvent[];
}

export interface RegistrationEvent {
  id: string;
  registration_id: string;
  event_id: string;
  pb_mark: string | null;
  pb_mark_value: number | null;
  sb_mark: string | null;
  sb_mark_value: number | null;
  status: RegistrationStatus;
  entry_id: string | null;
  waitlist_position: number | null;
  notes: string | null;
  event?: {
    id: string;
    name: string;
    event_code: string;
    event_type: string;
    gender: string;
    age_group: string;
  };
}

export interface ActionResult {
  success?: boolean;
  error?: string;
  id?: string;
}

// ============================================================================
// Registration Settings
// ============================================================================

export async function getRegistrationSettings(competitionId: string): Promise<RegistrationSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('registration_settings')
    .select('*')
    .eq('competition_id', competitionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching registration settings:', error);
    return null;
  }

  return data;
}

export async function upsertRegistrationSettings(
  settings: Partial<RegistrationSettings> & { competition_id: string }
): Promise<ActionResult> {
  const competitionId = settings.competition_id;
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to manage registration settings' };
  }

  // Check if settings exist
  const { data: existing } = await supabase
    .from('registration_settings')
    .select('id')
    .eq('competition_id', competitionId)
    .single();

  if (existing) {
    // Update
    const { error } = await supabase
      .from('registration_settings')
      .update({
        ...settings,
        competition_id: competitionId,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating registration settings:', error);
      return { error: error.message };
    }
  } else {
    // Insert
    const { error } = await supabase
      .from('registration_settings')
      .insert({
        ...settings,
        competition_id: competitionId,
      });

    if (error) {
      console.error('Error creating registration settings:', error);
      return { error: error.message };
    }
  }

  revalidatePath(`/dashboard/competitions/${competitionId}`);
  return { success: true };
}

// ============================================================================
// Event Registration Settings
// ============================================================================

export async function getEventRegistrationSettings(eventId: string): Promise<EventRegistrationSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('event_registration_settings')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching event registration settings:', error);
    return null;
  }

  return data;
}

export async function upsertEventRegistrationSettings(
  eventId: string,
  settings: Partial<EventRegistrationSettings>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to manage event registration settings' };
  }

  // Check if settings exist
  const { data: existing } = await supabase
    .from('event_registration_settings')
    .select('id')
    .eq('event_id', eventId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('event_registration_settings')
      .update({
        ...settings,
        event_id: eventId,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating event registration settings:', error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from('event_registration_settings')
      .insert({
        ...settings,
        event_id: eventId,
      });

    if (error) {
      console.error('Error creating event registration settings:', error);
      return { error: error.message };
    }
  }

  return { success: true };
}

// ============================================================================
// Public Registration Functions
// ============================================================================

export async function getEventsForRegistration(competitionId: string) {
  const supabase = await createClient();

  // Get events with their registration settings
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      event_code,
      event_type,
      gender,
      age_group,
      round,
      scheduled_time,
      event_registration_settings(*)
    `)
    .eq('competition_id', competitionId)
    .order('scheduled_time', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching events for registration:', error);
    return [];
  }

  return events || [];
}

export async function getPublicRegistrationInfo(competitionId: string) {
  const supabase = await createClient();

  // Get competition
  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select('id, name, date, end_date, location, venue, status')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) {
    return { error: 'Competition not found' };
  }

  // Get registration settings
  const { data: settings } = await supabase
    .from('registration_settings')
    .select('*')
    .eq('competition_id', competitionId)
    .single();

  // Get events available for registration
  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      name,
      event_code,
      event_type,
      gender,
      age_group,
      round,
      scheduled_time
    `)
    .eq('competition_id', competitionId)
    .order('scheduled_time', { ascending: true, nullsFirst: false });

  // Get event registration settings
  const eventIds = events?.map(e => e.id) || [];
  const { data: eventSettings } = await supabase
    .from('event_registration_settings')
    .select('*')
    .in('event_id', eventIds);

  // Get current entry counts per event
  const { data: entryCounts } = await supabase
    .from('entries')
    .select('event_id')
    .eq('competition_id', competitionId);

  const countsByEvent: Record<string, number> = {};
  entryCounts?.forEach(e => {
    countsByEvent[e.event_id] = (countsByEvent[e.event_id] || 0) + 1;
  });

  // Map event settings and entry counts to events
  const eventsWithInfo = events?.map(event => {
    const eventSetting = eventSettings?.find(s => s.event_id === event.id);
    return {
      ...event,
      registration_settings: eventSetting,
      entry_count: countsByEvent[event.id] || 0,
      is_full: eventSetting?.max_participants
        ? countsByEvent[event.id] >= eventSetting.max_participants
        : false,
    };
  });

  return {
    competition,
    settings,
    events: eventsWithInfo,
  };
}

export async function submitRegistration(
  registrationData: {
    competition_id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
    gender: string;
    nationality?: string;
    club_name?: string | null;
    license_number?: string | null;
    athlete_message?: string | null;
    terms_accepted?: boolean;
    events: Array<{
      event_id: string;
      pb_mark?: string | null;
      pb_mark_value?: number;
      sb_mark?: string | null;
      sb_mark_value?: number;
    }>;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const competitionId = registrationData.competition_id;

  const { data: { user } } = await supabase.auth.getUser();

  // Get registration settings
  const settings = await getRegistrationSettings(competitionId);

  if (!settings) {
    return { error: 'Registration is not available for this competition' };
  }

  if (settings.mode === 'disabled' || settings.mode === 'organizer_only') {
    return { error: 'Online registration is not available for this competition' };
  }

  // Check if registration is open
  const now = new Date();
  if (settings.registration_opens_at && new Date(settings.registration_opens_at) > now) {
    return { error: 'Registration has not opened yet' };
  }
  if (settings.registration_closes_at && new Date(settings.registration_closes_at) < now) {
    return { error: 'Registration has closed' };
  }

  // Check max events per athlete
  if (registrationData.events.length > settings.max_entries_per_athlete) {
    return { error: `Maximum ${settings.max_entries_per_athlete} events allowed per athlete` };
  }

  // Validate required fields
  if (settings.require_date_of_birth && !registrationData.date_of_birth) {
    return { error: 'Date of birth is required' };
  }
  if (settings.require_license_number && !registrationData.license_number) {
    return { error: 'License number is required' };
  }
  if (settings.require_club && !registrationData.club_name) {
    return { error: 'Club name is required' };
  }

  // Create registration
  const initialStatus: RegistrationStatus = settings.auto_approve ? 'approved' : 'pending';

  const { data: registration, error: regError } = await supabase
    .from('registrations')
    .insert({
      competition_id: competitionId,
      submitted_by: user?.id || null,
      first_name: registrationData.first_name,
      last_name: registrationData.last_name,
      email: registrationData.email,
      phone: registrationData.phone,
      date_of_birth: registrationData.date_of_birth,
      gender: registrationData.gender,
      nationality: registrationData.nationality || 'NOR',
      club_name: registrationData.club_name,
      license_number: registrationData.license_number,
      status: initialStatus,
      athlete_message: registrationData.athlete_message,
      terms_accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (regError) {
    console.error('Error creating registration:', regError);
    return { error: regError.message };
  }

  // Create registration events
  const eventInserts = registrationData.events.map(e => ({
    registration_id: registration.id,
    event_id: e.event_id,
    pb_mark: e.pb_mark || null,
    pb_mark_value: e.pb_mark_value || null,
    sb_mark: e.sb_mark || null,
    sb_mark_value: e.sb_mark_value || null,
    status: initialStatus,
  }));

  const { error: eventsError } = await supabase
    .from('registration_events')
    .insert(eventInserts);

  if (eventsError) {
    console.error('Error creating registration events:', eventsError);
    // Cleanup registration on failure
    await supabase.from('registrations').delete().eq('id', registration.id);
    return { error: eventsError.message };
  }

  // If auto-approve, create entries immediately
  if (settings.auto_approve) {
    await approveRegistration(registration.id);
  }

  return { success: true, id: registration.id };
}

// ============================================================================
// Organizer Registration Management
// ============================================================================

export async function getRegistrations(
  competitionId: string,
  status?: RegistrationStatus
): Promise<Registration[]> {
  const supabase = await createClient();

  let query = supabase
    .from('registrations')
    .select(`
      *,
      registration_events(
        *,
        event:events(id, name, event_code, event_type, gender, age_group)
      )
    `)
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching registrations:', error);
    return [];
  }

  return data || [];
}

export async function getRegistrationCounts(competitionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('registrations')
    .select('status')
    .eq('competition_id', competitionId);

  if (error) {
    console.error('Error fetching registration counts:', error);
    return { pending: 0, approved: 0, rejected: 0, waitlist: 0, withdrawn: 0, total: 0 };
  }

  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    waitlist: 0,
    withdrawn: 0,
    total: data?.length || 0,
  };

  data?.forEach(r => {
    counts[r.status as keyof typeof counts]++;
  });

  return counts;
}

export async function approveRegistration(
  registrationId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to approve registrations' };
  }

  // Get the registration
  const { data: registration, error: regError } = await supabase
    .from('registrations')
    .select(`
      *,
      registration_events(*)
    `)
    .eq('id', registrationId)
    .single();

  if (regError || !registration) {
    return { error: 'Registration not found' };
  }

  // Find or create athlete
  let athleteId = registration.athlete_id;

  if (!athleteId) {
    // Try to find existing athlete by name + dob
    const { data: existingAthlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('first_name', registration.first_name)
      .eq('last_name', registration.last_name)
      .eq('date_of_birth', registration.date_of_birth)
      .single();

    if (existingAthlete) {
      athleteId = existingAthlete.id;
    } else {
      // Create new athlete
      const { data: newAthlete, error: athleteError } = await supabase
        .from('athletes')
        .insert({
          first_name: registration.first_name,
          last_name: registration.last_name,
          date_of_birth: registration.date_of_birth,
          gender: registration.gender,
          nationality: registration.nationality,
          club_name: registration.club_name,
          license_number: registration.license_number,
        })
        .select()
        .single();

      if (athleteError) {
        console.error('Error creating athlete:', athleteError);
        return { error: athleteError.message };
      }

      athleteId = newAthlete.id;
    }
  }

  // Create entries for each registered event
  for (const regEvent of registration.registration_events || []) {
    // Check if entry already exists
    const { data: existingEntry } = await supabase
      .from('entries')
      .select('id')
      .eq('event_id', regEvent.event_id)
      .eq('athlete_id', athleteId)
      .single();

    if (!existingEntry) {
      const { data: entry, error: entryError } = await supabase
        .from('entries')
        .insert({
          competition_id: registration.competition_id,
          event_id: regEvent.event_id,
          athlete_id: athleteId,
          seed_mark: regEvent.pb_mark || regEvent.sb_mark,
          seed_mark_value: regEvent.pb_mark_value || regEvent.sb_mark_value,
          status: 'registered',
        })
        .select()
        .single();

      if (entryError) {
        console.error('Error creating entry:', entryError);
        continue;
      }

      // Update registration event with entry_id
      await supabase
        .from('registration_events')
        .update({ entry_id: entry.id, status: 'approved' })
        .eq('id', regEvent.id);
    }
  }

  // Update registration status
  const { error: updateError } = await supabase
    .from('registrations')
    .update({
      status: 'approved',
      athlete_id: athleteId,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  if (updateError) {
    console.error('Error updating registration:', updateError);
    return { error: updateError.message };
  }

  revalidatePath(`/dashboard/competitions/${registration.competition_id}/registration`);
  return { success: true };
}

export async function rejectRegistration(
  registrationId: string,
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to reject registrations' };
  }

  // Get registration to get competition_id
  const { data: registration } = await supabase
    .from('registrations')
    .select('competition_id')
    .eq('id', registrationId)
    .single();

  const { error } = await supabase
    .from('registrations')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  if (error) {
    console.error('Error rejecting registration:', error);
    return { error: error.message };
  }

  // Update all registration events
  await supabase
    .from('registration_events')
    .update({ status: 'rejected' })
    .eq('registration_id', registrationId);

  if (registration) {
    revalidatePath(`/dashboard/competitions/${registration.competition_id}/registration`);
  }
  return { success: true };
}

export async function bulkApproveRegistrations(
  registrationIds: string[]
): Promise<ActionResult> {
  for (const id of registrationIds) {
    const result = await approveRegistration(id);
    if (result.error) {
      return { error: `Failed to approve registration: ${result.error}` };
    }
  }

  return { success: true };
}

export async function bulkRejectRegistrations(
  registrationIds: string[],
  reason?: string
): Promise<ActionResult> {
  for (const id of registrationIds) {
    const result = await rejectRegistration(id, reason);
    if (result.error) {
      return { error: `Failed to reject registration: ${result.error}` };
    }
  }

  return { success: true };
}

export async function addToWaitlist(
  registrationId: string,
  competitionId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in' };
  }

  const { error } = await supabase
    .from('registrations')
    .update({
      status: 'waitlist',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  if (error) {
    console.error('Error adding to waitlist:', error);
    return { error: error.message };
  }

  await supabase
    .from('registration_events')
    .update({ status: 'waitlist' })
    .eq('registration_id', registrationId);

  revalidatePath(`/dashboard/competitions/${competitionId}/registrations`);
  return { success: true };
}

export async function updateOrganizerNotes(
  registrationId: string,
  notes: string,
  competitionId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('registrations')
    .update({ organizer_notes: notes })
    .eq('id', registrationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/competitions/${competitionId}/registrations`);
  return { success: true };
}

// ============================================================================
// Export Registrations
// ============================================================================

export async function exportRegistrationsCSV(competitionId: string): Promise<string> {
  const registrations = await getRegistrations(competitionId);

  const headers = [
    'Status',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'DOB',
    'Gender',
    'Club',
    'License',
    'Events',
    'Submitted At',
  ];

  const rows = registrations.map(r => [
    r.status,
    r.first_name,
    r.last_name,
    r.email || '',
    r.phone || '',
    r.date_of_birth || '',
    r.gender,
    r.club_name || '',
    r.license_number || '',
    r.registration_events?.map(e => e.event?.name).join('; ') || '',
    new Date(r.created_at).toLocaleString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
}
