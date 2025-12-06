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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id: competitionId, eventId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { scheduled_time } = body;

  // Get the competition date to combine with time
  const { data: competition } = await supabase
    .from('competitions')
    .select('date')
    .eq('id', competitionId)
    .single();

  let fullDateTime: string | null = null;
  if (scheduled_time && competition?.date) {
    fullDateTime = `${competition.date}T${scheduled_time}:00`;
  }

  const { error } = await supabase
    .from('events')
    .update({ scheduled_time: fullDateTime })
    .eq('id', eventId)
    .eq('competition_id', competitionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, scheduled_time: fullDateTime });
}
