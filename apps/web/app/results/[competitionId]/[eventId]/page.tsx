import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCompetition, getPublicEvent, getPublicEventResults, getPublicEventHeights } from '@/lib/actions/public';
import { ChevronRight, Wind, Activity, Timer, Target, Zap, Users } from 'lucide-react';
import LiveResultsTable from './LiveResultsTable';

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full border border-emerald-200">
          Offisiell
        </span>
      );
    case 'in_progress':
      return (
        <span className="px-3 py-1.5 bg-red-100 text-red-800 text-sm font-semibold rounded-full animate-pulse border border-red-200 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Pågår
        </span>
      );
    case 'checkin':
      return (
        <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full border border-amber-200">
          Innsjekk
        </span>
      );
    default:
      return (
        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-full border border-slate-200">
          Planlagt
        </span>
      );
  }
}

function getGenderText(gender: string) {
  switch (gender) {
    case 'M':
      return 'Menn';
    case 'W':
      return 'Kvinner';
    case 'X':
      return 'Blandet';
    default:
      return gender;
  }
}

function getRoundText(round?: string) {
  if (!round || round === 'final') return 'Finale';
  if (round === 'heats') return 'Innledende';
  if (round === 'semi') return 'Semifinale';
  if (round === 'qualification') return 'Kvalifisering';
  return round;
}

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'track':
    case 'relay':
      return <Timer className="w-5 h-5" />;
    case 'field_vertical':
      return <Target className="w-5 h-5" />;
    case 'field_horizontal':
      return <Zap className="w-5 h-5" />;
    default:
      return null;
  }
}

export default async function PublicEventResultsPage({
  params,
}: {
  params: Promise<{ competitionId: string; eventId: string }>;
}) {
  const { competitionId, eventId } = await params;

  const [competition, event, entries] = await Promise.all([
    getPublicCompetition(competitionId),
    getPublicEvent(eventId),
    getPublicEventResults(eventId),
  ]);

  if (!competition || !event) {
    notFound();
  }

  const isTrackEvent = event.event_type === 'track' || event.event_type === 'relay';
  const isVerticalEvent = event.event_type === 'field_vertical';

  // Fetch heights for vertical events
  const heights = isVerticalEvent ? await getPublicEventHeights(eventId) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

        <div className="max-w-6xl mx-auto px-4 py-6 relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href="/results" className="hover:text-white transition-colors">
              Stevner
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/results/${competitionId}`} className="hover:text-white transition-colors">
              {competition.name}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-300">{event.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Event type icon */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                event.status === 'in_progress'
                  ? 'bg-red-500/20 text-red-300'
                  : event.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-slate-300'
              }`}>
                {getEventTypeIcon(event.event_type)}
              </div>

              <div>
                <h1 className="text-2xl lg:text-3xl font-bold mb-2 tracking-tight">{event.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-slate-300">
                  <span className="bg-white/10 px-3 py-1 rounded-full text-sm">
                    {getGenderText(event.gender)}
                  </span>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-sm">
                    {event.age_group}
                  </span>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-sm">
                    {getRoundText(event.round)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3">
              {getStatusBadge(event.status)}

              {/* Wind reading for track events */}
              {isTrackEvent && event.wind_reading !== null && event.wind_reading !== undefined && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm text-slate-300">
                  <Wind className="w-4 h-4" />
                  Vind: {event.wind_reading > 0 ? '+' : ''}{event.wind_reading} m/s
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Info Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4" />
              <span>{entries.length} deltager{entries.length !== 1 ? 'e' : ''}</span>
            </div>
            {event.status === 'in_progress' && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Oppdateres automatisk
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <LiveResultsTable
            eventId={eventId}
            eventType={event.event_type}
            eventStatus={event.status}
            initialEntries={entries}
            initialHeights={heights}
          />
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Forklaring</h3>
          <div className="text-sm text-slate-600">
            {isTrackEvent && (
              <p>
                <span className="font-medium">DNS</span> = Ikke startet &bull;{' '}
                <span className="font-medium">DNF</span> = Ikke fullført &bull;{' '}
                <span className="font-medium">DQ</span> = Diskvalifisert
              </p>
            )}
            {isVerticalEvent && (
              <p>
                <span className="font-medium">O</span> = Godkjent &bull;{' '}
                <span className="font-medium">X</span> = Riv &bull;{' '}
                <span className="font-medium">-</span> = Stått over &bull;{' '}
                <span className="font-medium text-orange-600">r</span> = Gitt seg &bull;{' '}
                <span className="font-medium">NH</span> = Ingen høyde
              </p>
            )}
            {!isTrackEvent && !isVerticalEvent && (
              <p>
                <span className="font-medium">X</span> = Ugyldig &bull;{' '}
                <span className="font-medium">-</span> = Stått over &bull;{' '}
                <span className="font-medium">NM</span> = Ingen resultat
              </p>
            )}
          </div>
        </div>
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
