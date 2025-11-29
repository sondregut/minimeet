import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const format = request.nextUrl.searchParams.get('format') || 'csv';

  const supabase = await createClient();

  // Get event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*, competition:competitions(name)')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Get results based on event type
  let results: Array<{
    place: number | null;
    athlete_name: string;
    bib: string;
    club: string;
    result: string;
    status: string;
    wind?: string;
  }> = [];

  if (event.event_type === 'track' || event.event_type === 'relay') {
    // Track results
    const { data: trackResults } = await supabase
      .from('track_results')
      .select(`
        *,
        entry:entries(
          bib_number,
          athlete:athletes(first_name, last_name, club_name)
        )
      `)
      .in('entry_id',
        (await supabase.from('entries').select('id').eq('event_id', eventId)).data?.map(e => e.id) || []
      )
      .order('place', { ascending: true, nullsFirst: false });

    results = (trackResults || [])
      .filter(r => r.entry)
      .map(r => ({
        place: r.status === 'finished' ? r.place : null,
        athlete_name: `${r.entry.athlete?.first_name || ''} ${r.entry.athlete?.last_name || ''}`.trim(),
        bib: r.entry.bib_number || '',
        club: r.entry.athlete?.club_name || '',
        result: r.time_display || '',
        status: r.status,
        wind: r.wind ? `${r.wind > 0 ? '+' : ''}${r.wind}` : '',
      }));
  } else if (event.event_type === 'field_vertical') {
    // Vertical jump results
    const { data: verticalResults } = await supabase
      .from('vertical_results')
      .select(`
        *,
        entry:entries(
          bib_number,
          athlete:athletes(first_name, last_name, club_name)
        )
      `)
      .in('entry_id',
        (await supabase.from('entries').select('id').eq('event_id', eventId)).data?.map(e => e.id) || []
      )
      .order('best_height', { ascending: false, nullsFirst: false });

    results = (verticalResults || [])
      .filter(r => r.entry)
      .map((r, i) => ({
        place: r.status !== 'NH' ? i + 1 : null,
        athlete_name: `${r.entry.athlete?.first_name || ''} ${r.entry.athlete?.last_name || ''}`.trim(),
        bib: r.entry.bib_number || '',
        club: r.entry.athlete?.club_name || '',
        result: r.best_height ? `${r.best_height}` : '',
        status: r.status,
      }));
  } else if (event.event_type === 'field_horizontal' || event.event_type === 'throw') {
    // Field results
    const { data: fieldResults } = await supabase
      .from('field_results')
      .select(`
        *,
        entry:entries(
          bib_number,
          athlete:athletes(first_name, last_name, club_name)
        )
      `)
      .in('entry_id',
        (await supabase.from('entries').select('id').eq('event_id', eventId)).data?.map(e => e.id) || []
      )
      .order('best_mark', { ascending: false, nullsFirst: false });

    results = (fieldResults || [])
      .filter(r => r.entry)
      .map((r, i) => ({
        place: r.status === 'complete' || r.status === 'active' ? i + 1 : null,
        athlete_name: `${r.entry.athlete?.first_name || ''} ${r.entry.athlete?.last_name || ''}`.trim(),
        bib: r.entry.bib_number || '',
        club: r.entry.athlete?.club_name || '',
        result: r.best_mark ? (r.best_mark / 100).toFixed(2) : '',
        status: r.status,
        wind: r.best_mark_wind ? `${r.best_mark_wind > 0 ? '+' : ''}${r.best_mark_wind}` : '',
      }));
  }

  if (format === 'csv') {
    // Generate CSV
    const headers = ['Place', 'Name', 'Bib', 'Club', 'Result', 'Status'];
    if (event.event_type === 'track' || event.event_type === 'field_horizontal') {
      headers.push('Wind');
    }

    const rows = results.map(r => {
      const row = [
        r.place || '',
        r.athlete_name,
        r.bib,
        r.club,
        r.result,
        r.status,
      ];
      if (event.event_type === 'track' || event.event_type === 'field_horizontal') {
        row.push(r.wind || '');
      }
      return row;
    });

    const csvContent = [
      `"${event.name} - ${event.competition?.name || 'Competition'}"`,
      `"${event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} ${event.round}"`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const filename = `${event.name.replace(/[^a-z0-9]/gi, '_')}_results.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // JSON format (default fallback)
  return NextResponse.json({
    event: {
      name: event.name,
      competition: event.competition?.name,
      gender: event.gender,
      round: event.round,
      wind: event.wind_reading,
    },
    results,
  });
}
