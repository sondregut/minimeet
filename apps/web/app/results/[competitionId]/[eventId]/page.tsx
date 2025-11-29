import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCompetition, getPublicEvent, getPublicEventResults, getPublicEventHeights } from '@/lib/actions/public';
import { ArrowLeft, Wind } from 'lucide-react';
import LiveResultsTable from './LiveResultsTable';

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">Final</span>;
    case 'in_progress':
      return <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full animate-pulse">Live</span>;
    case 'checkin':
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">Check-in</span>;
    default:
      return <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">Scheduled</span>;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link
            href={`/results/${competitionId}`}
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {competition.name}
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">{event.name}</h1>
              <p className="text-blue-200">
                {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} &bull; {event.age_group} &bull; {event.round}
              </p>
            </div>
            {getStatusBadge(event.status)}
          </div>

          {/* Wind reading for track events */}
          {isTrackEvent && event.wind_reading !== null && (
            <div className="flex items-center gap-2 mt-4 text-blue-200">
              <Wind className="w-4 h-4" />
              Wind: {event.wind_reading > 0 ? '+' : ''}{event.wind_reading} m/s
            </div>
          )}
        </div>
      </header>

      {/* Results Table */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <LiveResultsTable
          eventId={eventId}
          eventType={event.event_type}
          eventStatus={event.status}
          initialEntries={entries}
          initialHeights={heights}
        />

        {/* Legend */}
        <div className="mt-6 text-sm text-gray-500">
          {isTrackEvent && (
            <p>DNS = Did Not Start &bull; DNF = Did Not Finish &bull; DQ = Disqualified</p>
          )}
          {isVerticalEvent && (
            <p>O = Cleared &bull; X = Failed &bull; - = Passed &bull; NH = No Height</p>
          )}
          {!isTrackEvent && !isVerticalEvent && (
            <p>X = Foul &bull; - = Pass &bull; NM = No Mark</p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          Powered by <span className="font-semibold">MiniMeet</span>
        </div>
      </footer>
    </div>
  );
}
