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
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: competitionId, entryId } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['registered', 'confirmed', 'checked_in', 'DNS', 'scratched'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the entry belongs to the competition
    const { data: entry, error: fetchError } = await supabase
      .from('entries')
      .select('id, competition_id')
      .eq('id', entryId)
      .eq('competition_id', competitionId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Update the status
    const { data: updatedEntry, error: updateError } = await supabase
      .from('entries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .select()
      .single();

    if (updateError) {
      console.error('[entry-status] Update error:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    console.error('[entry-status] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
