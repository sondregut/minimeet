import Link from 'next/link';
import { getPublicCompetitions } from '@/lib/actions/public';
import { Calendar, MapPin, ChevronRight, Trophy, Search, Activity } from 'lucide-react';

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
          Avsluttet
        </span>
      );
    case 'active':
      return (
        <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full animate-pulse border border-red-200 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          Direkte
        </span>
      );
    case 'published':
      return (
        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
          Kommende
        </span>
      );
    default:
      return null;
  }
}

export default async function PublicResultsPage() {
  const competitions = await getPublicCompetitions();

  // Separate by status
  const liveCompetitions = competitions.filter(c => c.status === 'active');
  const upcomingCompetitions = competitions.filter(c => c.status === 'published');
  const pastCompetitions = competitions.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

        <div className="max-w-6xl mx-auto px-4 py-12 relative">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Hjem
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Stevneresultater</h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl">
            Følg friidrettsstevner live, eller se resultater fra tidligere arrangementer
          </p>

          {/* Quick Actions */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/results/athletes"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl transition-colors border border-white/10"
            >
              <Search className="w-4 h-4" />
              Søk etter utøver
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {liveCompetitions.length > 0 && (
        <div className="bg-red-500 text-white">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">
                {liveCompetitions.length} stevne{liveCompetitions.length > 1 ? 'r' : ''} pågår nå
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Live Competitions */}
        {liveCompetitions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              Pågår nå
            </h2>
            <div className="grid gap-4">
              {liveCompetitions.map(competition => (
                <Link
                  key={competition.id}
                  href={`/results/${competition.id}`}
                  className="group bg-white border-2 border-red-200 rounded-xl p-5 hover:border-red-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(competition.status)}
                        {competition.organization && (
                          <span className="text-sm text-slate-500">{competition.organization.name}</span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
                        {competition.name}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {competition.date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(competition.date).toLocaleDateString('nb-NO', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                        {competition.venue && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {competition.venue}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400 flex-shrink-0 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Competitions */}
        {upcomingCompetitions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Kommende stevner
            </h2>
            <div className="grid gap-4">
              {upcomingCompetitions.map(competition => (
                <Link
                  key={competition.id}
                  href={`/results/${competition.id}`}
                  className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(competition.status)}
                        {competition.organization && (
                          <span className="text-sm text-slate-500">{competition.organization.name}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {competition.name}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {competition.date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(competition.date).toLocaleDateString('nb-NO', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                        {competition.venue && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {competition.venue}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Past Competitions */}
        {pastCompetitions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              Tidligere resultater
            </h2>
            <div className="grid gap-3">
              {pastCompetitions.map(competition => (
                <Link
                  key={competition.id}
                  href={`/results/${competition.id}`}
                  className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(competition.status)}
                        {competition.organization && (
                          <span className="text-sm text-slate-500">{competition.organization.name}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {competition.name}
                      </h3>
                      <div className="flex gap-4 text-sm text-slate-500 mt-1">
                        {competition.date && (
                          <span>
                            {new Date(competition.date).toLocaleDateString('nb-NO', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        {competition.venue && <span>{competition.venue}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {competitions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Ingen stevner tilgjengelig</h3>
            <p className="text-slate-500">Det er ingen offentlige stevner å vise ennå.</p>
          </div>
        )}
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
