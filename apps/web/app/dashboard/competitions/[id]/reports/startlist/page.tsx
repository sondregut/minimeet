import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntriesByCompetition } from '@/lib/actions/entries';
import { ArrowLeft } from 'lucide-react';
import PrintButton from '@/components/PrintButton';

type Entry = {
  id: string;
  bib_number: string | null;
  heat_number: number | null;
  lane_or_position: number | null;
  seed_mark: string | null;
  status: string;
  event_id: string;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
    nationality: string | null;
  } | null;
};

type Event = {
  id: string;
  name: string;
  event_code: string;
  event_type: string;
  gender: string;
  age_group: string;
  round: string;
  scheduled_time: string | null;
  status: string;
};

export default async function CombinedStartListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: competitionId } = await params;

  const [competition, events, allEntries] = await Promise.all([
    getCompetition(competitionId),
    getEventsByCompetition(competitionId),
    getEntriesByCompetition(competitionId),
  ]);

  if (!competition) {
    notFound();
  }

  // Sort events by scheduled time
  const sortedEvents = [...(events as Event[])].sort((a, b) => {
    if (!a.scheduled_time && !b.scheduled_time) return 0;
    if (!a.scheduled_time) return 1;
    if (!b.scheduled_time) return -1;
    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
  });

  // Group entries by event
  const entriesByEvent: Record<string, Entry[]> = {};
  (allEntries as Entry[]).forEach(entry => {
    if (entry.event_id) {
      if (!entriesByEvent[entry.event_id]) {
        entriesByEvent[entry.event_id] = [];
      }
      entriesByEvent[entry.event_id].push(entry);
    }
  });

  return (
    <div className="space-y-6">
      {/* Screen Header - Hidden in Print */}
      <div className="print:hidden">
        <Link
          href={`/dashboard/competitions/${competitionId}/reports`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Combined Start Lists</h1>
            <p className="text-gray-600 mt-1">{competition.name}</p>
          </div>

          <PrintButton />
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Print tip:</strong> Use landscape orientation for best results. Each event will start on a new page.
        </div>
      </div>

      {/* Printable Content */}
      <div className="print:pt-0">
        {/* Cover Page - Print Only */}
        <div className="hidden print:block text-center py-16 break-after-page">
          <h1 className="text-4xl font-bold mb-4">{competition.name}</h1>
          <p className="text-xl text-gray-600 mb-2">Start Lists</p>
          {competition.date && (
            <p className="text-lg text-gray-500">
              {new Date(competition.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {competition.venue && (
            <p className="text-lg text-gray-500 mt-2">{competition.venue}</p>
          )}
          <p className="text-gray-500 mt-8">
            {sortedEvents.length} events &bull; {allEntries.length} entries
          </p>
        </div>

        {sortedEvents.map((event, eventIndex) => {
          const eventEntries = entriesByEvent[event.id] || [];
          if (eventEntries.length === 0) return null;

          // Group entries by heat
          const entriesByHeat: Record<number, Entry[]> = {};
          const unassigned: Entry[] = [];

          eventEntries.forEach(entry => {
            if (entry.heat_number) {
              if (!entriesByHeat[entry.heat_number]) {
                entriesByHeat[entry.heat_number] = [];
              }
              entriesByHeat[entry.heat_number].push(entry);
            } else {
              unassigned.push(entry);
            }
          });

          // Sort entries within each heat by lane
          Object.values(entriesByHeat).forEach(heatEntries => {
            heatEntries.sort((a, b) => (a.lane_or_position || 99) - (b.lane_or_position || 99));
          });

          const heatNumbers = Object.keys(entriesByHeat).map(Number).sort((a, b) => a - b);
          const isTrackEvent = event.event_type === 'track' || event.event_type === 'relay';
          const termHeat = isTrackEvent ? 'Heat' : 'Flight';
          const termLane = isTrackEvent ? 'Lane' : 'Pos';

          return (
            <div key={event.id} className={eventIndex > 0 ? 'break-before-page' : ''}>
              {/* Event Header */}
              <div className="mb-6 pb-4 border-b-2 border-gray-900">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
                    <p className="text-gray-600">
                      {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} &bull; {event.age_group}
                      {event.round && event.round !== 'final' && ` &bull; ${event.round}`}
                    </p>
                  </div>
                  <div className="text-right text-gray-600">
                    {event.scheduled_time && (
                      <p className="font-medium">
                        {new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    <p className="text-sm">{eventEntries.length} entries</p>
                  </div>
                </div>
              </div>

              {/* Heats/Flights */}
              {heatNumbers.map(heatNum => (
                <div key={heatNum} className="mb-6 break-inside-avoid">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
                    {termHeat} {heatNum}
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left font-semibold text-gray-700 py-1 w-12">{termLane}</th>
                        <th className="text-left font-semibold text-gray-700 py-1 w-16">Bib</th>
                        <th className="text-left font-semibold text-gray-700 py-1">Name</th>
                        <th className="text-left font-semibold text-gray-700 py-1">Club</th>
                        <th className="text-left font-semibold text-gray-700 py-1 w-20">Seed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entriesByHeat[heatNum].map(entry => (
                        <tr key={entry.id} className="border-b border-gray-100">
                          <td className="py-1 text-gray-700 font-mono">{entry.lane_or_position || '-'}</td>
                          <td className="py-1 font-bold text-gray-900 font-mono">{entry.bib_number || '-'}</td>
                          <td className="py-1 font-medium text-gray-900">
                            {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                          </td>
                          <td className="py-1 text-gray-700">
                            {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                          </td>
                          <td className="py-1 text-gray-600 font-mono">{entry.seed_mark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Unassigned (no heat) */}
              {unassigned.length > 0 && (
                <div className="mb-6 break-inside-avoid">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
                    {heatNumbers.length > 0 ? 'Unassigned' : 'All Entries'}
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left font-semibold text-gray-700 py-1 w-16">Bib</th>
                        <th className="text-left font-semibold text-gray-700 py-1">Name</th>
                        <th className="text-left font-semibold text-gray-700 py-1">Club</th>
                        <th className="text-left font-semibold text-gray-700 py-1 w-20">Seed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassigned.map(entry => (
                        <tr key={entry.id} className="border-b border-gray-100">
                          <td className="py-1 font-bold text-gray-900 font-mono">{entry.bib_number || '-'}</td>
                          <td className="py-1 font-medium text-gray-900">
                            {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                          </td>
                          <td className="py-1 text-gray-700">
                            {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                          </td>
                          <td className="py-1 text-gray-600 font-mono">{entry.seed_mark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-200">
          Generated by MiniMeet &bull; {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}
