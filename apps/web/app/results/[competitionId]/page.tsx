import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCompetition, getPublicEvents, getCompetitionClubs } from '@/lib/actions/public';
import { Calendar, MapPin, ChevronRight, Activity } from 'lucide-react';
import EventFilters from './EventFilters';

export default async function PublicCompetitionPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = await params;

  const [competition, events, clubs] = await Promise.all([
    getPublicCompetition(competitionId),
    getPublicEvents(competitionId),
    getCompetitionClubs(competitionId),
  ]);

  if (!competition) {
    notFound();
  }

  // Get unique age groups for filtering
  const ageGroups = [...new Set(events.map(e => e.age_group))].filter(Boolean).sort();
  const eventTypes = [...new Set(events.map(e => e.event_type))].filter(Boolean);

  // Stats
  const liveCount = events.filter(e => e.status === 'in_progress').length;
  const completedCount = events.filter(e => e.status === 'completed').length;
  const totalEntries = events.reduce((sum, e) => sum + (e.entry_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header with gradient */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

        <div className="max-w-6xl mx-auto px-4 py-8 relative">
          <Link
            href="/results"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Alle stevner
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight">
                {competition.name}
              </h1>
              {competition.organization && (
                <p className="text-slate-400 mb-4">
                  Arrangert av {competition.organization.name}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                {competition.date && (
                  <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(competition.date).toLocaleDateString('nb-NO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                )}
                {competition.venue && (
                  <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                    <MapPin className="w-4 h-4" />
                    {competition.venue}
                  </div>
                )}
              </div>
            </div>

            {/* Live indicator */}
            {liveCount > 0 && (
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3">
                <div className="relative">
                  <span className="absolute inset-0 animate-ping bg-red-500 rounded-full opacity-75"></span>
                  <span className="relative block w-3 h-3 bg-red-500 rounded-full"></span>
                </div>
                <div>
                  <div className="text-red-200 text-sm font-medium">Direkte nå</div>
                  <div className="text-white font-bold">{liveCount} øvelse{liveCount > 1 ? 'r' : ''}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{events.length}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Øvelser</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Offisielle</div>
              </div>
              {liveCount > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{liveCount}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Pågår</div>
                </div>
              )}
              <div className="text-center hidden sm:block">
                <div className="text-2xl font-bold text-slate-700">{totalEntries}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Deltagere</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Filters */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <EventFilters
          events={events}
          ageGroups={ageGroups}
          eventTypes={eventTypes}
          clubs={clubs}
          competitionId={competitionId}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-white">MiniMeet</span>
            </div>
            <p className="text-sm">
              Friidrettsresultater i sanntid
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
