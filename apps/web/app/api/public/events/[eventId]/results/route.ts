import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
          // Not needed for GET requests
        },
        remove(name: string, options: CookieOptions) {
          // Not needed for GET requests
        },
      },
    }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createPublicClient();

  // Get the event to determine type
  const { data: event } = await supabase
    .from('events')
    .select('event_type')
    .eq('id', eventId)
    .single();

  if (!event) {
    return NextResponse.json({ entries: [] });
  }

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
    return NextResponse.json({ entries: [] });
  }

  // Get results based on event type
  const entryIds = entries?.map(e => e.id) || [];

  if (event.event_type === 'track' || event.event_type === 'relay') {
    const { data: results } = await supabase
      .from('track_results')
      .select('*')
      .in('entry_id', entryIds);

    const entriesWithResults = entries?.map(entry => ({
      ...entry,
      result: results?.find(r => r.entry_id === entry.id) || null,
    })).sort((a, b) => {
      if (a.result?.place && b.result?.place) {
        return a.result.place - b.result.place;
      }
      if (a.result?.place) return -1;
      if (b.result?.place) return 1;
      return 0;
    }) || [];

    return NextResponse.json({ entries: entriesWithResults });
  }

  if (event.event_type === 'field_vertical') {
    const { data: results } = await supabase
      .from('vertical_results')
      .select('*')
      .in('entry_id', entryIds);

    // Get all result IDs to fetch attempts
    const resultIds = results?.map(r => r.id) || [];

    // Fetch all vertical attempts for these results
    const { data: attempts } = await supabase
      .from('vertical_attempts')
      .select('*')
      .in('result_id', resultIds)
      .order('height', { ascending: true })
      .order('attempt_number', { ascending: true });

    // Get unique heights for the height progression
    const heights = [...new Set(attempts?.map(a => a.height) || [])].sort((a, b) => a - b);

    const entriesWithResults = entries?.map(entry => {
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

    return NextResponse.json({ entries: entriesWithResults, heights });
  }

  if (event.event_type === 'field_horizontal' || event.event_type === 'throw') {
    const { data: results } = await supabase
      .from('field_results')
      .select('*')
      .in('entry_id', entryIds);

    // Get all result IDs to fetch attempts
    const resultIds = results?.map(r => r.id) || [];

    // Fetch all field attempts for these results
    const { data: attempts } = await supabase
      .from('field_attempts')
      .select('*')
      .in('result_id', resultIds)
      .order('attempt_number', { ascending: true });

    const entriesWithResults = entries?.map(entry => {
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

    return NextResponse.json({ entries: entriesWithResults });
  }

  return NextResponse.json({ entries: entries || [] });
}
