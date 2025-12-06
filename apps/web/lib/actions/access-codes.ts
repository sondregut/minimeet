'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

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

// Types
export interface AccessCode {
  id: string;
  competition_id: string;
  code: string;
  name: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  events?: { id: string; name: string; age_group?: string; gender?: string }[];
}

export interface OfficialSession {
  id: string;
  access_code_id: string;
  session_token: string;
  competition_id: string;
  expires_at: string;
  events: { id: string; name: string; event_type: string }[];
}

// Generate a secure access code like "HJ-ABCD-1234"
function generateSecureCode(prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for readability
  let result = prefix ? `${prefix}-` : '';

  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// Generate a secure session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new access code for specific events
 */
export async function createAccessCode(
  competitionId: string,
  name: string,
  eventIds: string[],
  prefix: string = ''
): Promise<{ success?: boolean; error?: string; code?: AccessCode }> {
  const supabase = await createClient();

  // Verify user is authenticated and owns this competition
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Check competition ownership
  const { data: competition } = await supabase
    .from('competitions')
    .select('id, created_by, end_date')
    .eq('id', competitionId)
    .single();

  if (!competition || competition.created_by !== user.id) {
    return { error: 'Ingen tilgang til dette stevnet' };
  }

  // Generate unique code
  let code = generateSecureCode(prefix);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('event_access_codes')
      .select('id')
      .eq('code', code)
      .single();

    if (!existing) break;
    code = generateSecureCode(prefix);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return { error: 'Kunne ikke generere unik kode' };
  }

  // Calculate expiry (end of competition day + 6 hours)
  const expiresAt = competition.end_date
    ? new Date(new Date(competition.end_date).getTime() + 6 * 60 * 60 * 1000).toISOString()
    : null;

  // Create the access code
  const { data: accessCode, error: createError } = await supabase
    .from('event_access_codes')
    .insert({
      competition_id: competitionId,
      code,
      name,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (createError || !accessCode) {
    return { error: 'Kunne ikke opprette tilgangskode' };
  }

  // Link events to the code
  if (eventIds.length > 0) {
    const eventLinks = eventIds.map(eventId => ({
      access_code_id: accessCode.id,
      event_id: eventId,
    }));

    const { error: linkError } = await supabase
      .from('event_access_code_events')
      .insert(eventLinks);

    if (linkError) {
      // Rollback - delete the access code
      await supabase.from('event_access_codes').delete().eq('id', accessCode.id);
      return { error: 'Kunne ikke koble øvelser til koden' };
    }
  }

  // Log the creation
  await supabase.from('access_code_log').insert({
    access_code_id: accessCode.id,
    action: 'created',
    details: { event_ids: eventIds, created_by: user.id },
  });

  revalidatePath(`/dashboard/competitions/${competitionId}`);

  return {
    success: true,
    code: {
      ...accessCode,
      events: []
    }
  };
}

/**
 * Validate an access code and create a session
 */
export async function validateAccessCode(
  code: string
): Promise<{ success?: boolean; error?: string; session?: OfficialSession }> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // Find the access code
  const { data: accessCode, error: findError } = await supabase
    .from('event_access_codes')
    .select(`
      id,
      competition_id,
      name,
      is_active,
      expires_at,
      competitions!inner(id, name, status)
    `)
    .eq('code', code.toUpperCase().trim())
    .single();

  if (findError || !accessCode) {
    return { error: 'Ugyldig kode' };
  }

  // Check if code is active
  if (!accessCode.is_active) {
    return { error: 'Denne koden er deaktivert' };
  }

  // Check if code has expired
  if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
    return { error: 'Denne koden har utløpt' };
  }

  // Get linked events
  const { data: linkedEvents } = await supabase
    .from('event_access_code_events')
    .select(`
      events!inner(id, name, event_type)
    `)
    .eq('access_code_id', accessCode.id);

  const events = linkedEvents?.map(le => {
    const event = le.events as unknown as { id: string; name: string; event_type: string };
    return {
      id: event.id,
      name: event.name,
      event_type: event.event_type,
    };
  }) || [];

  // Generate session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('official_sessions')
    .insert({
      access_code_id: accessCode.id,
      session_token: sessionToken,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (sessionError || !session) {
    return { error: 'Kunne ikke opprette økt' };
  }

  // Log the login
  await supabase.from('access_code_log').insert({
    access_code_id: accessCode.id,
    action: 'login',
    details: { session_id: session.id },
  });

  // Set session cookie
  cookieStore.set('official_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });

  return {
    success: true,
    session: {
      id: session.id,
      access_code_id: accessCode.id,
      session_token: sessionToken,
      competition_id: accessCode.competition_id,
      expires_at: expiresAt,
      events,
    },
  };
}

/**
 * Get current official session from cookie
 */
export async function getCurrentOfficialSession(): Promise<OfficialSession | null> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get('official_session')?.value;
  if (!sessionToken) {
    return null;
  }

  // Find session
  const { data: session } = await supabase
    .from('official_sessions')
    .select(`
      id,
      access_code_id,
      session_token,
      expires_at,
      event_access_codes!inner(
        id,
        competition_id,
        name,
        is_active
      )
    `)
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .single();

  if (!session) {
    // Clear invalid cookie
    cookieStore.set('official_session', '', { maxAge: 0, path: '/' });
    return null;
  }

  // Check if session expired
  if (new Date(session.expires_at) < new Date()) {
    cookieStore.set('official_session', '', { maxAge: 0, path: '/' });
    return null;
  }

  // Check if code is still active
  const accessCode = session.event_access_codes as unknown as {
    id: string;
    competition_id: string;
    name: string;
    is_active: boolean;
  };

  if (!accessCode.is_active) {
    cookieStore.set('official_session', '', { maxAge: 0, path: '/' });
    return null;
  }

  // Get linked events
  const { data: linkedEvents } = await supabase
    .from('event_access_code_events')
    .select(`
      events!inner(id, name, event_type)
    `)
    .eq('access_code_id', session.access_code_id);

  const events = linkedEvents?.map(le => {
    const event = le.events as unknown as { id: string; name: string; event_type: string };
    return {
      id: event.id,
      name: event.name,
      event_type: event.event_type,
    };
  }) || [];

  return {
    id: session.id,
    access_code_id: session.access_code_id,
    session_token: session.session_token,
    competition_id: accessCode.competition_id,
    expires_at: session.expires_at,
    events,
  };
}

/**
 * End official session (logout)
 */
export async function endOfficialSession(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get('official_session')?.value;
  if (sessionToken) {
    // Deactivate session in database
    await supabase
      .from('official_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken);
  }

  // Clear cookie
  cookieStore.set('official_session', '', { maxAge: 0, path: '/' });

  return { success: true };
}

/**
 * Get all access codes for a competition
 */
export async function getAccessCodesForCompetition(
  competitionId: string
): Promise<AccessCode[]> {
  const supabase = await createClient();

  // Verify user is authenticated and owns this competition
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: codes } = await supabase
    .from('event_access_codes')
    .select(`
      id,
      competition_id,
      code,
      name,
      is_active,
      expires_at,
      created_at,
      event_access_code_events(
        events!inner(id, name, age_group, gender)
      )
    `)
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false });

  if (!codes) return [];

  return codes.map(code => ({
    id: code.id,
    competition_id: code.competition_id,
    code: code.code,
    name: code.name,
    is_active: code.is_active,
    expires_at: code.expires_at,
    created_at: code.created_at,
    events: code.event_access_code_events?.map((link: { events: unknown }) => {
      const event = link.events as unknown as { id: string; name: string; age_group?: string; gender?: string };
      return {
        id: event.id,
        name: event.name,
        age_group: event.age_group,
        gender: event.gender,
      };
    }) || [],
  }));
}

/**
 * Deactivate an access code
 */
export async function deactivateAccessCode(
  codeId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Get the code and verify ownership
  const { data: accessCode } = await supabase
    .from('event_access_codes')
    .select(`
      id,
      competition_id,
      competitions!inner(created_by)
    `)
    .eq('id', codeId)
    .single();

  if (!accessCode) {
    return { error: 'Kode ikke funnet' };
  }

  const competition = accessCode.competitions as unknown as { created_by: string };
  if (competition.created_by !== user.id) {
    return { error: 'Ingen tilgang' };
  }

  // Deactivate the code
  const { error: updateError } = await supabase
    .from('event_access_codes')
    .update({ is_active: false })
    .eq('id', codeId);

  if (updateError) {
    return { error: 'Kunne ikke deaktivere kode' };
  }

  // Also deactivate any active sessions
  await supabase
    .from('official_sessions')
    .update({ is_active: false })
    .eq('access_code_id', codeId);

  // Log the deactivation
  await supabase.from('access_code_log').insert({
    access_code_id: codeId,
    action: 'deactivated',
    details: { deactivated_by: user.id },
  });

  revalidatePath(`/dashboard/competitions/${accessCode.competition_id}`);

  return { success: true };
}

/**
 * Reactivate an access code
 */
export async function reactivateAccessCode(
  codeId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Get the code and verify ownership
  const { data: accessCode } = await supabase
    .from('event_access_codes')
    .select(`
      id,
      competition_id,
      competitions!inner(created_by)
    `)
    .eq('id', codeId)
    .single();

  if (!accessCode) {
    return { error: 'Kode ikke funnet' };
  }

  const competition = accessCode.competitions as unknown as { created_by: string };
  if (competition.created_by !== user.id) {
    return { error: 'Ingen tilgang' };
  }

  // Reactivate the code
  const { error: updateError } = await supabase
    .from('event_access_codes')
    .update({ is_active: true })
    .eq('id', codeId);

  if (updateError) {
    return { error: 'Kunne ikke reaktivere kode' };
  }

  // Log the reactivation
  await supabase.from('access_code_log').insert({
    access_code_id: codeId,
    action: 'reactivated',
    details: { reactivated_by: user.id },
  });

  revalidatePath(`/dashboard/competitions/${accessCode.competition_id}`);

  return { success: true };
}

/**
 * Check if official has access to a specific event
 */
export async function checkEventAccess(eventId: string): Promise<boolean> {
  const session = await getCurrentOfficialSession();
  if (!session) return false;

  return session.events.some(e => e.id === eventId);
}

/**
 * Update events linked to an access code
 */
export async function updateAccessCodeEvents(
  codeId: string,
  eventIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Ikke autentisert' };
  }

  // Get the code and verify ownership
  const { data: accessCode } = await supabase
    .from('event_access_codes')
    .select(`
      id,
      competition_id,
      competitions!inner(created_by)
    `)
    .eq('id', codeId)
    .single();

  if (!accessCode) {
    return { error: 'Kode ikke funnet' };
  }

  const competition = accessCode.competitions as unknown as { created_by: string };
  if (competition.created_by !== user.id) {
    return { error: 'Ingen tilgang' };
  }

  // Delete existing links
  await supabase
    .from('event_access_code_events')
    .delete()
    .eq('access_code_id', codeId);

  // Add new links
  if (eventIds.length > 0) {
    const eventLinks = eventIds.map(eventId => ({
      access_code_id: codeId,
      event_id: eventId,
    }));

    const { error: linkError } = await supabase
      .from('event_access_code_events')
      .insert(eventLinks);

    if (linkError) {
      return { error: 'Kunne ikke oppdatere øvelser' };
    }
  }

  // Log the update
  await supabase.from('access_code_log').insert({
    access_code_id: codeId,
    action: 'events_updated',
    details: { event_ids: eventIds, updated_by: user.id },
  });

  revalidatePath(`/dashboard/competitions/${accessCode.competition_id}`);

  return { success: true };
}
