import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEvent } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';
import { getEntriesByEvent } from '@/lib/actions/entries';
import { ArrowLeft, Settings } from 'lucide-react';
import PrintButton from '@/components/PrintButton';

export default async function StartListPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id: competitionId, eventId } = await params;

  const [competition, event, entries] = await Promise.all([
    getCompetition(competitionId),
    getEvent(eventId),
    getEntriesByEvent(eventId),
  ]);

  if (!competition || !event) {
    notFound();
  }

  // Group entries by heat
  const entriesByHeat: Record<number, typeof entries> = {};
  const unassigned: typeof entries = [];

  entries.forEach(entry => {
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
  const termLane = isTrackEvent ? 'Lane' : 'Position';

  return (
    <div className="space-y-6">
      {/* Screen Header - Hidden in Print */}
      <div className="print:hidden">
        <Link
          href={`/dashboard/competitions/${competitionId}/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {event.name}
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Start List</h1>
            <p className="text-gray-600 mt-1">
              {event.name} - {competition.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/competitions/${competitionId}/events/${eventId}/startlist/manage`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage
            </Link>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div className="print:pt-0">
        {/* Header - Visible in Print */}
        <div className="text-center mb-6 hidden print:block">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-lg">{competition.name}</p>
          <p className="text-gray-600 mt-1">
            {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} &bull; {event.age_group} &bull; {event.round}
          </p>
          {event.scheduled_time && (
            <p className="text-gray-600">
              {new Date(event.scheduled_time).toLocaleString()}
            </p>
          )}
        </div>

        {/* Print Header for Screen */}
        <div className="print:hidden bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'}
              </span>
              <span className="mx-2">·</span>
              <span>{event.age_group}</span>
              <span className="mx-2">·</span>
              <span className="capitalize">{event.round}</span>
            </div>
            <div className="text-gray-600">
              {entries.length} entries
              {heatNumbers.length > 0 && ` · ${heatNumbers.length} ${termHeat.toLowerCase()}${heatNumbers.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* No entries */}
        {entries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No entries registered for this event.
          </div>
        )}

        {/* Heats/Flights */}
        {heatNumbers.map(heatNum => (
          <div key={heatNum} className="mb-8 break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-gray-900">
              {termHeat} {heatNum}
            </h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-16">
                    {termLane}
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-20">
                    Bib
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2">
                    Name
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2">
                    Club/Country
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-24">
                    Seed
                  </th>
                </tr>
              </thead>
              <tbody>
                {entriesByHeat[heatNum].map(entry => (
                  <tr key={entry.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700 font-mono">
                      {entry.lane_or_position || '-'}
                    </td>
                    <td className="py-2 font-bold text-gray-900 font-mono">
                      {entry.bib_number || '-'}
                    </td>
                    <td className="py-2 font-medium text-gray-900">
                      {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                    </td>
                    <td className="py-2 text-gray-700">
                      {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                    </td>
                    <td className="py-2 text-gray-600 font-mono">
                      {entry.seed_mark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Unassigned (no heat) */}
        {unassigned.length > 0 && (
          <div className="mb-8 break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-gray-400">
              {heatNumbers.length > 0 ? 'Unassigned' : 'All Entries'}
            </h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-20">
                    Bib
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2">
                    Name
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2">
                    Club/Country
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-24">
                    Seed
                  </th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-100">
                    <td className="py-2 font-bold text-gray-900 font-mono">
                      {entry.bib_number || '-'}
                    </td>
                    <td className="py-2 font-medium text-gray-900">
                      {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                    </td>
                    <td className="py-2 text-gray-700">
                      {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                    </td>
                    <td className="py-2 text-gray-600 font-mono">
                      {entry.seed_mark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-200">
          Generated by MiniMeet &bull; {new Date().toLocaleString()}
        </div>
      </div>

    </div>
  );
}
