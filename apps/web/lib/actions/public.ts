'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Public client - no auth required, uses anon key for public data
async function createPublicClient() {
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

// Get public competition (published, active, or completed status only)
export async function getPublicCompetition(id: string) {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      organization:organizations(name)
    `)
    .eq('id', id)
    .in('status', ['published', 'active', 'completed'])
    .single();

  if (error) {
    console.error('Error fetching public competition:', error);
    return null;
  }

  return data;
}

// Get all public competitions
export async function getPublicCompetitions() {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      organization:organizations(name)
    `)
    .in('status', ['published', 'active', 'completed'])
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching public competitions:', error);
    return [];
  }

  return data || [];
}

// Get events for a public competition with club participation info
export async function getPublicEvents(competitionId: string) {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('competition_id', competitionId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching public events:', error);
    return [];
  }

  // Get club participation for each event
  const eventIds = data?.map(e => e.id) || [];

  if (eventIds.length > 0) {
    const { data: entries } = await supabase
      .from('entries')
      .select(`
        event_id,
        athlete:athletes(club_name)
      `)
      .in('event_id', eventIds);

    // Build event-to-clubs mapping
    const eventClubsMap: Record<string, string[]> = {};
    entries?.forEach((entry: any) => {
      const eventId = entry.event_id;
      const clubName = entry.athlete?.club_name;
      if (clubName) {
        if (!eventClubsMap[eventId]) {
          eventClubsMap[eventId] = [];
        }
        if (!eventClubsMap[eventId].includes(clubName)) {
          eventClubsMap[eventId].push(clubName);
        }
      }
    });

    // Add clubs to events
    return data?.map(event => ({
      ...event,
      clubs: eventClubsMap[event.id] || [],
    })) || [];
  }

  return data || [];
}

// Get all clubs participating in a competition
export async function getCompetitionClubs(competitionId: string): Promise<string[]> {
  const supabase = await createPublicClient();

  // Get all event IDs for this competition
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('competition_id', competitionId);

  if (!events || events.length === 0) return [];

  const eventIds = events.map(e => e.id);

  // Get all entries with athlete club info
  const { data: entries, error } = await supabase
    .from('entries')
    .select(`
      athlete:athletes(club_name)
    `)
    .in('event_id', eventIds);

  if (error) {
    console.error('Error fetching competition clubs:', error);
    return [];
  }

  // Extract unique clubs
  const clubs = new Set<string>();
  entries?.forEach((entry: any) => {
    const clubName = entry.athlete?.club_name;
    if (clubName && clubName.trim()) {
      clubs.add(clubName);
    }
  });

  return Array.from(clubs).sort();
}

// Get public event with results
export async function getPublicEvent(eventId: string) {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching public event:', error);
    return null;
  }

  return data;
}

// Get entries with results for an event (public view)
export async function getPublicEventResults(eventId: string) {
  const supabase = await createPublicClient();

  // First get the event to determine type
  const { data: event } = await supabase
    .from('events')
    .select('event_type')
    .eq('id', eventId)
    .single();

  if (!event) return [];

  // Get entries with athlete info
  const { data: entries, error } = await supabase
    .from('entries')
    .select(`
      *,
      athlete:athletes(
        first_name,
        last_name,
        nationality,
        club_name
      )
    `)
    .eq('event_id', eventId)
    .order('bib_number', { ascending: true });

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  // Get results based on event type
  const entryIds = entries?.map(e => e.id) || [];

  if (event.event_type === 'track' || event.event_type === 'relay') {
    const { data: results } = await supabase
      .from('track_results')
      .select('*')
      .in('entry_id', entryIds);

    return entries?.map(entry => ({
      ...entry,
      result: results?.find(r => r.entry_id === entry.id) || null,
    })).sort((a, b) => {
      // Sort by place, then by time
      if (a.result?.place && b.result?.place) {
        return a.result.place - b.result.place;
      }
      if (a.result?.place) return -1;
      if (b.result?.place) return 1;
      return 0;
    }) || [];
  }

  if (event.event_type === 'field_vertical') {
    const { data: results } = await supabase
      .from('vertical_results')
      .select('*')
      .in('entry_id', entryIds);

    // Get attempts for vertical events
    const resultIds = results?.map(r => r.id) || [];
    const { data: attempts } = await supabase
      .from('vertical_attempts')
      .select('*')
      .in('result_id', resultIds)
      .order('height', { ascending: true })
      .order('attempt_number', { ascending: true });

    return entries?.map(entry => {
      const result = results?.find(r => r.entry_id === entry.id) || null;
      const athleteAttempts = attempts?.filter(a => a.result_id === result?.id) || [];
      return {
        ...entry,
        result,
        attempts: athleteAttempts,
      };
    }).sort((a, b) => {
      if (a.result?.place && b.result?.place) {
        return a.result.place - b.result.place;
      }
      if (a.result?.best_height && b.result?.best_height) {
        return b.result.best_height - a.result.best_height;
      }
      return 0;
    }) || [];
  }

  if (event.event_type === 'field_horizontal' || event.event_type === 'throw') {
    const { data: results } = await supabase
      .from('field_results')
      .select('*')
      .in('entry_id', entryIds);

    // Get attempts for field events
    const resultIds = results?.map(r => r.id) || [];
    const { data: attempts } = await supabase
      .from('field_attempts')
      .select('*')
      .in('result_id', resultIds)
      .order('attempt_number', { ascending: true });

    return entries?.map(entry => {
      const result = results?.find(r => r.entry_id === entry.id) || null;
      const athleteAttempts = attempts?.filter(a => a.result_id === result?.id) || [];
      return {
        ...entry,
        result,
        attempts: athleteAttempts,
      };
    }).sort((a, b) => {
      if (a.result?.place && b.result?.place) {
        return a.result.place - b.result.place;
      }
      if (a.result?.best_mark && b.result?.best_mark) {
        return b.result.best_mark - a.result.best_mark;
      }
      return 0;
    }) || [];
  }

  return entries || [];
}

// Get height progression for vertical events
export async function getPublicEventHeights(eventId: string) {
  const supabase = await createPublicClient();

  // Get all vertical attempts for this event to extract unique heights
  const { data: entries } = await supabase
    .from('entries')
    .select('id')
    .eq('event_id', eventId);

  if (!entries || entries.length === 0) return [];

  const entryIds = entries.map(e => e.id);

  const { data: results } = await supabase
    .from('vertical_results')
    .select('id')
    .in('entry_id', entryIds);

  if (!results || results.length === 0) return [];

  const resultIds = results.map(r => r.id);

  const { data: attempts } = await supabase
    .from('vertical_attempts')
    .select('height')
    .in('result_id', resultIds);

  if (!attempts) return [];

  // Get unique heights sorted
  const heights = [...new Set(attempts.map(a => a.height))].sort((a, b) => a - b);
  return heights;
}

// Search athletes by name (public view)
export async function searchPublicAthletes(query: string, limit: number = 20) {
  const supabase = await createPublicClient();

  if (!query || query.length < 2) return [];

  // Search by first name, last name, or full name
  const searchTerm = `%${query}%`;

  const { data, error } = await supabase
    .from('athletes')
    .select(`
      id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      nationality,
      club_name
    `)
    .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error searching athletes:', error);
    return [];
  }

  return data || [];
}

// Type definitions for athlete profile
type AthleteEvent = {
  id: string;
  name: string;
  event_code: string;
  event_type: string;
  gender: string;
  age_group: string;
  round: string;
  scheduled_time: string | null;
  wind_reading: number | null;
  competition: {
    id: string;
    name: string;
    date: string;
    location: string;
    status: string;
  } | null;
};

type AthleteResult = {
  entry_id: string;
  bib_number: string | null;
  event: AthleteEvent | null;
  result: any;
};

type PersonalBest = {
  mark: string;
  value: number;
  date: string;
  competition: string;
  wind?: number;
};

// Get athlete profile with competition history
export async function getPublicAthleteProfile(athleteId: string) {
  const supabase = await createPublicClient();

  // Get athlete info
  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select(`
      id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      nationality,
      club_name,
      profile_image_url
    `)
    .eq('id', athleteId)
    .single();

  if (athleteError || !athlete) {
    console.error('Error fetching athlete:', athleteError);
    return null;
  }

  // Get all entries for this athlete with event and competition info
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select(`
      id,
      bib_number,
      event:events!inner(
        id,
        name,
        event_code,
        event_type,
        gender,
        age_group,
        round,
        scheduled_time,
        wind_reading,
        competition:competitions!inner(
          id,
          name,
          date,
          location,
          status
        )
      )
    `)
    .eq('athlete_id', athleteId);

  if (entriesError) {
    console.error('Error fetching entries:', entriesError);
    return { ...athlete, results: [] as AthleteResult[], personalBests: {} as Record<string, PersonalBest> };
  }

  // Transform and filter entries - handle Supabase's nested relation format
  const transformedEntries = (entries || []).map((entry: any) => {
    // Supabase returns single relations as objects, not arrays
    const event = entry.event;
    const competition = event?.competition;

    return {
      id: entry.id,
      bib_number: entry.bib_number,
      event: event ? {
        id: event.id,
        name: event.name,
        event_code: event.event_code,
        event_type: event.event_type,
        gender: event.gender,
        age_group: event.age_group,
        round: event.round,
        scheduled_time: event.scheduled_time,
        wind_reading: event.wind_reading,
        competition: competition ? {
          id: competition.id,
          name: competition.name,
          date: competition.date,
          location: competition.location,
          status: competition.status,
        } : null,
      } : null,
    };
  });

  // Filter to only public competitions
  const publicEntries = transformedEntries.filter(
    (e: any) => e.event?.competition &&
    ['published', 'active', 'completed'].includes(e.event.competition.status)
  );

  // Get results for each entry
  const results: AthleteResult[] = await Promise.all(
    publicEntries.map(async (entry: any) => {
      const eventType = entry.event?.event_type;
      let result = null;

      if (eventType === 'track' || eventType === 'relay') {
        const { data } = await supabase
          .from('track_results')
          .select('*')
          .eq('entry_id', entry.id)
          .single();
        result = data;
      } else if (eventType === 'field_vertical') {
        const { data } = await supabase
          .from('vertical_results')
          .select('*')
          .eq('entry_id', entry.id)
          .single();
        result = data;
      } else if (eventType === 'field_horizontal' || eventType === 'throw') {
        const { data } = await supabase
          .from('field_results')
          .select('*')
          .eq('entry_id', entry.id)
          .single();
        result = data;
      }

      return {
        entry_id: entry.id,
        bib_number: entry.bib_number,
        event: entry.event,
        result,
      };
    })
  );

  // Sort results by competition date (most recent first)
  const sortedResults = results.sort((a, b) => {
    const dateA = a.event?.competition?.date || '';
    const dateB = b.event?.competition?.date || '';
    return dateB.localeCompare(dateA);
  });

  // Calculate personal bests by event code
  const personalBests: Record<string, PersonalBest> = {};

  for (const r of sortedResults) {
    if (!r.result || !r.event) continue;

    const eventCode = r.event.event_code;
    const eventType = r.event.event_type;

    let value: number | null = null;
    let mark: string = '';
    let wind: number | undefined;

    if (eventType === 'track' || eventType === 'relay') {
      if (r.result.time_ms && r.result.status === 'finished') {
        value = r.result.time_ms;
        mark = r.result.time_display || formatTime(r.result.time_ms);
        wind = r.result.wind;
      }
    } else if (eventType === 'field_vertical') {
      if (r.result.best_height && r.result.status !== 'NH') {
        value = r.result.best_height;
        mark = `${r.result.best_height.toFixed(2)}m`;
      }
    } else if (eventType === 'field_horizontal' || eventType === 'throw') {
      if (r.result.best_mark && r.result.status !== 'NM') {
        value = r.result.best_mark;
        mark = `${r.result.best_mark.toFixed(2)}m`;
        wind = r.result.best_mark_wind;
      }
    }

    if (value !== null && eventCode) {
      const isTrack = eventType === 'track' || eventType === 'relay';
      const isBetter = !personalBests[eventCode] ||
        (isTrack ? value < personalBests[eventCode].value : value > personalBests[eventCode].value);

      if (isBetter) {
        personalBests[eventCode] = {
          mark,
          value,
          date: r.event.competition?.date || '',
          competition: r.event.competition?.name || '',
          wind,
        };
      }
    }
  }

  return {
    ...athlete,
    results: sortedResults,
    personalBests,
  };
}

// Helper to format time from milliseconds
function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return totalSeconds.toFixed(2);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${seconds}`;
}

// Get athletes with results at a specific competition
export async function getCompetitionAthletes(competitionId: string) {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('entries')
    .select(`
      athlete:athletes(
        id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        nationality,
        club_name
      )
    `)
    .eq('competition_id', competitionId);

  if (error) {
    console.error('Error fetching competition athletes:', error);
    return [];
  }

  // Deduplicate athletes (an athlete may have multiple entries)
  const athleteMap = new Map();
  data?.forEach((entry: any) => {
    const athlete = entry.athlete;
    if (athlete && !athleteMap.has(athlete.id)) {
      athleteMap.set(athlete.id, athlete);
    }
  });

  return Array.from(athleteMap.values()).sort((a: any, b: any) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
  );
}
