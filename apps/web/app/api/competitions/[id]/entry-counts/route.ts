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
  const { id: competitionId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('entries')
    .select('event_id')
    .eq('competition_id', competitionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count entries per event
  const counts: Record<string, number> = {};
  data?.forEach((entry) => {
    counts[entry.event_id] = (counts[entry.event_id] || 0) + 1;
  });

  return NextResponse.json(counts);
}
