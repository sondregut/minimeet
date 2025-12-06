import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: competitionId } = await params;
    console.log('[lists-data] Fetching data for competition:', competitionId);

    const supabase = await createClient();

    // Get competition details
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('id, name, date, venue, settings')
      .eq('id', competitionId)
      .single();

    if (compError) {
      console.error('[lists-data] Competition error:', compError);
      return NextResponse.json({ error: compError.message }, { status: 500 });
    }
    console.log('[lists-data] Competition loaded:', competition?.name);

    // Get all events with their details
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_code, event_type, gender, age_group, scheduled_time, sort_order')
      .eq('competition_id', competitionId)
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true });

    if (eventsError) {
      console.error('[lists-data] Events error:', eventsError);
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }
    console.log('[lists-data] Events loaded:', events?.length);

    // Get all entries with athlete info
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select(`
        id,
        bib_number,
        athlete_id,
        event_id,
        status,
        athletes (
          id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          club_name,
          nationality
        )
      `)
      .eq('competition_id', competitionId);

    if (entriesError) {
      console.error('[lists-data] Entries error:', entriesError);
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }
    console.log('[lists-data] Entries loaded:', entries?.length);

    // Process data into a useful format
    const athleteMap = new Map<string, {
      athlete_id: string;
      first_name: string;
      last_name: string;
      date_of_birth: string | null;
      gender: string;
      club_name: string;
      nationality: string;
      bib_number: string | null;
      events: Array<{
        event_id: string;
        event_name: string;
        event_code: string;
        age_group: string;
        scheduled_time: string | null;
      }>;
    }>();

    for (const entry of entries || []) {
      const athlete = entry.athletes as any;
      if (!athlete) continue;

      const key = athlete.id;
      const event = events?.find(e => e.id === entry.event_id);

      if (!athleteMap.has(key)) {
        athleteMap.set(key, {
          athlete_id: athlete.id,
          first_name: athlete.first_name,
          last_name: athlete.last_name,
          date_of_birth: athlete.date_of_birth,
          gender: athlete.gender,
          club_name: athlete.club_name || 'Klubbløs',
          nationality: athlete.nationality || 'NOR',
          bib_number: entry.bib_number,
          events: [],
        });
      }

      if (event) {
        athleteMap.get(key)!.events.push({
          event_id: event.id,
          event_name: event.name,
          event_code: event.event_code,
          age_group: event.age_group,
          scheduled_time: event.scheduled_time,
        });
      }

      // Update bib number if we have one
      if (entry.bib_number) {
        athleteMap.get(key)!.bib_number = entry.bib_number;
      }
    }

    const athletes = Array.from(athleteMap.values());

    // Sort athletes by last name, first name
    athletes.sort((a, b) => {
      const lastNameCompare = a.last_name.localeCompare(b.last_name, 'nb');
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.first_name.localeCompare(b.first_name, 'nb');
    });

    // Sort events within each athlete by scheduled_time
    athletes.forEach(athlete => {
      athlete.events.sort((a, b) => {
        if (!a.scheduled_time && !b.scheduled_time) return 0;
        if (!a.scheduled_time) return 1;
        if (!b.scheduled_time) return -1;
        return a.scheduled_time.localeCompare(b.scheduled_time);
      });
    });

    // Group by club
    const byClub: Record<string, typeof athletes> = {};
    for (const athlete of athletes) {
      if (!byClub[athlete.club_name]) {
        byClub[athlete.club_name] = [];
      }
      byClub[athlete.club_name].push(athlete);
    }

    // Group by event (with entry_id and status for check-in management)
    const byEvent: Record<string, Array<{
      entry_id: string;
      athlete_id: string;
      first_name: string;
      last_name: string;
      club_name: string;
      bib_number: string | null;
      age_group: string;
      status: string;
    }>> = {};

    for (const event of events || []) {
      byEvent[event.id] = [];
    }

    // Build byEvent from entries directly to include entry_id and status
    for (const entry of entries || []) {
      const athlete = entry.athletes as any;
      if (!athlete) continue;

      const event = events?.find(e => e.id === entry.event_id);
      if (event && byEvent[event.id]) {
        byEvent[event.id].push({
          entry_id: entry.id,
          athlete_id: athlete.id,
          first_name: athlete.first_name,
          last_name: athlete.last_name,
          club_name: athlete.club_name || 'Klubbløs',
          bib_number: entry.bib_number,
          age_group: event.age_group,
          status: entry.status,
        });
      }
    }

    // Sort entries in each event by bib number
    for (const eventId of Object.keys(byEvent)) {
      byEvent[eventId].sort((a, b) => {
        if (!a.bib_number && !b.bib_number) {
          const lastNameCompare = a.last_name.localeCompare(b.last_name, 'nb');
          if (lastNameCompare !== 0) return lastNameCompare;
          return a.first_name.localeCompare(b.first_name, 'nb');
        }
        if (!a.bib_number) return 1;
        if (!b.bib_number) return -1;
        return parseInt(a.bib_number) - parseInt(b.bib_number);
      });
    }

    console.log('[lists-data] Success! Athletes:', athletes.length, 'Events:', events?.length);
    return NextResponse.json({
      competition,
      events: events || [],
      athletes,
      byClub,
      byEvent,
    });
  } catch (error) {
    console.error('[lists-data] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
