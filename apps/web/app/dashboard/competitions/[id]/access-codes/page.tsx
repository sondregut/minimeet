import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAccessCodesForCompetition } from '@/lib/actions/access-codes';
import { getEventsByCompetition } from '@/lib/actions/events';
import AccessCodesManager from './AccessCodesManager';

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

export default async function AccessCodesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: competitionId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/');
  }

  // Get competition
  const { data: competition } = await supabase
    .from('competitions')
    .select('id, name, created_by')
    .eq('id', competitionId)
    .single();

  if (!competition || competition.created_by !== user.id) {
    redirect('/dashboard');
  }

  // Get access codes and events
  const [accessCodes, events] = await Promise.all([
    getAccessCodesForCompetition(competitionId),
    getEventsByCompetition(competitionId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tilgangskoder</h1>
        <p className="text-slate-600 mt-1">
          Opprett og administrer tilgangskoder for funksjonaerer
        </p>
      </div>

      <AccessCodesManager
        competitionId={competitionId}
        initialCodes={accessCodes}
        events={events}
      />
    </div>
  );
}
