import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntriesByCompetition } from '@/lib/actions/entries';
import {
  getTrackResultsByEvent,
  getFieldResultsByEvent,
  getVerticalResultsByEvent,
} from '@/lib/actions/results';
import { ArrowLeft } from 'lucide-react';
import PrintButton from '@/components/PrintButton';

type Entry = {
  id: string;
  bib_number: string | null;
  heat_number: number | null;
  lane_or_position: number | null;
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
  wind_reading: number | null;
};

type TrackResult = {
  id: string;
  entry_id: string;
  time_ms: number | null;
  time_display: string | null;
  place: number | null;
  status: string;
  wind: number | null;
  reaction_time_ms: number | null;
  is_pb: boolean;
  is_sb: boolean;
  entry: Entry;
};

type FieldResult = {
  id: string;
  entry_id: string;
  best_mark: number | null;
  best_mark_wind: number | null;
  place: number | null;
  status: string;
  is_pb: boolean;
  is_sb: boolean;
  entry: Entry;
};

type VerticalResult = {
  id: string;
  entry_id: string;
  best_height: number | null;
  place: number | null;
  status: string;
  total_misses: number | null;
  is_pb: boolean;
  is_sb: boolean;
  entry: Entry;
};

function formatTime(ms: number | null): string {
  if (!ms) return '-';
  const totalSeconds = ms / 1000;
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  }
  return totalSeconds.toFixed(2);
}

function formatMark(mark: number | null): string {
  if (!mark) return '-';
  return mark.toFixed(2);
}

function formatHeight(height: number | null): string {
  if (!height) return '-';
  return height.toFixed(2);
}

function getMedalClass(place: number | null): string {
  if (place === 1) return 'text-amber-600 font-bold';
  if (place === 2) return 'text-gray-500 font-bold';
  if (place === 3) return 'text-amber-700 font-bold';
  return '';
}

export default async function CombinedResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: competitionId } = await params;

  const [competition, events] = await Promise.all([
    getCompetition(competitionId),
    getEventsByCompetition(competitionId),
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

  // Fetch results for all events
  const resultsMap: Record<string, {
    track?: TrackResult[];
    field?: FieldResult[];
    vertical?: VerticalResult[];
  }> = {};

  for (const event of sortedEvents) {
    const eventType = (event as Event).event_type;
    if (eventType === 'track' || eventType === 'relay' || eventType === 'road') {
      const results = await getTrackResultsByEvent(event.id);
      resultsMap[event.id] = { track: results as unknown as TrackResult[] };
    } else if (eventType === 'field_vertical') {
      const results = await getVerticalResultsByEvent(event.id);
      resultsMap[event.id] = { vertical: results as unknown as VerticalResult[] };
    } else if (eventType === 'field_horizontal' || eventType === 'throw') {
      const results = await getFieldResultsByEvent(event.id);
      resultsMap[event.id] = { field: results as unknown as FieldResult[] };
    }
  }

  // Count events with results
  const eventsWithResults = sortedEvents.filter(event => {
    const results = resultsMap[event.id];
    if (!results) return false;
    return (results.track?.length || 0) > 0 ||
           (results.field?.length || 0) > 0 ||
           (results.vertical?.length || 0) > 0;
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
            <h1 className="text-2xl font-bold text-gray-900">Combined Results</h1>
            <p className="text-gray-600 mt-1">{competition.name}</p>
          </div>

          <PrintButton />
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Note:</strong> This page shows {eventsWithResults.length} events with recorded results.
          Events without results are not included.
        </div>
      </div>

      {/* Printable Content */}
      <div className="print:pt-0">
        {/* Cover Page - Print Only */}
        <div className="hidden print:block text-center py-16 break-after-page">
          <h1 className="text-4xl font-bold mb-4">{competition.name}</h1>
          <p className="text-xl text-gray-600 mb-2">Official Results</p>
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
            {eventsWithResults.length} events with results
          </p>
        </div>

        {eventsWithResults.map((event, eventIndex) => {
          const eventData = event as Event;
          const results = resultsMap[event.id];

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
                    {eventData.scheduled_time && (
                      <p className="font-medium">
                        {new Date(eventData.scheduled_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {(eventData.event_type === 'track' || eventData.event_type === 'relay') && eventData.wind_reading !== null && (
                      <p className="text-sm">Wind: {eventData.wind_reading > 0 ? '+' : ''}{eventData.wind_reading.toFixed(1)} m/s</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Track Results */}
              {results?.track && results.track.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left font-semibold text-gray-700 py-2 w-12">Pl</th>
                      <th className="text-left font-semibold text-gray-700 py-2 w-16">Bib</th>
                      <th className="text-left font-semibold text-gray-700 py-2">Name</th>
                      <th className="text-left font-semibold text-gray-700 py-2">Club</th>
                      <th className="text-right font-semibold text-gray-700 py-2 w-24">Time</th>
                      <th className="text-center font-semibold text-gray-700 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...results.track]
                      .sort((a, b) => {
                        if (a.status !== 'finished' && b.status === 'finished') return 1;
                        if (a.status === 'finished' && b.status !== 'finished') return -1;
                        return (a.place || 999) - (b.place || 999);
                      })
                      .map(result => (
                        <tr key={result.id} className="border-b border-gray-100">
                          <td className={`py-2 font-mono ${getMedalClass(result.place)}`}>
                            {result.status === 'finished' ? result.place : result.status}
                          </td>
                          <td className="py-2 font-bold text-gray-900 font-mono">
                            {result.entry?.bib_number || '-'}
                          </td>
                          <td className="py-2 font-medium text-gray-900">
                            {result.entry?.athlete?.last_name?.toUpperCase()}, {result.entry?.athlete?.first_name}
                          </td>
                          <td className="py-2 text-gray-700">
                            {result.entry?.athlete?.club_name || result.entry?.athlete?.nationality || '-'}
                          </td>
                          <td className="py-2 text-right font-mono font-medium">
                            {result.status === 'finished' ? (result.time_display || formatTime(result.time_ms)) : '-'}
                          </td>
                          <td className="py-2 text-center">
                            {result.is_pb && <span className="text-xs font-bold text-green-600">PB</span>}
                            {result.is_sb && !result.is_pb && <span className="text-xs font-bold text-blue-600">SB</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* Field Results */}
              {results?.field && results.field.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left font-semibold text-gray-700 py-2 w-12">Pl</th>
                      <th className="text-left font-semibold text-gray-700 py-2 w-16">Bib</th>
                      <th className="text-left font-semibold text-gray-700 py-2">Name</th>
                      <th className="text-left font-semibold text-gray-700 py-2">Club</th>
                      <th className="text-right font-semibold text-gray-700 py-2 w-24">Mark</th>
                      <th className="text-center font-semibold text-gray-700 py-2 w-16">Wind</th>
                      <th className="text-center font-semibold text-gray-700 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...results.field]
                      .sort((a, b) => {
                        if (!a.best_mark && b.best_mark) return 1;
                        if (a.best_mark && !b.best_mark) return -1;
                        return (a.place || 999) - (b.place || 999);
                      })
                      .map(result => (
                        <tr key={result.id} className="border-b border-gray-100">
                          <td className={`py-2 font-mono ${getMedalClass(result.place)}`}>
                            {result.best_mark ? result.place : result.status}
                          </td>
                          <td className="py-2 font-bold text-gray-900 font-mono">
                            {result.entry?.bib_number || '-'}
                          </td>
                          <td className="py-2 font-medium text-gray-900">
                            {result.entry?.athlete?.last_name?.toUpperCase()}, {result.entry?.athlete?.first_name}
                          </td>
                          <td className="py-2 text-gray-700">
                            {result.entry?.athlete?.club_name || result.entry?.athlete?.nationality || '-'}
                          </td>
                          <td className="py-2 text-right font-mono font-medium">
                            {formatMark(result.best_mark)}
                          </td>
                          <td className="py-2 text-center font-mono text-gray-500 text-xs">
                            {result.best_mark_wind !== null ?
                              `${result.best_mark_wind > 0 ? '+' : ''}${result.best_mark_wind.toFixed(1)}` : '-'}
                          </td>
                          <td className="py-2 text-center">
                            {result.is_pb && <span className="text-xs font-bold text-green-600">PB</span>}
                            {result.is_sb && !result.is_pb && <span className="text-xs font-bold text-blue-600">SB</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* Vertical Results */}
              {results?.vertical && results.vertical.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left font-semibold text-gray-700 py-2 w-12">Pl</th>
                      <th className="text-left font-semibold text-gray-700 py-2 w-16">Bib</th>
                      <th className="text-left font-semibold text-gray-700 py-2">Name</th>
                      <th className="text-left font-semibold text-gray-700 py-2">Club</th>
                      <th className="text-right font-semibold text-gray-700 py-2 w-24">Height</th>
                      <th className="text-center font-semibold text-gray-700 py-2 w-16">Misses</th>
                      <th className="text-center font-semibold text-gray-700 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...results.vertical]
                      .sort((a, b) => {
                        if (!a.best_height && b.best_height) return 1;
                        if (a.best_height && !b.best_height) return -1;
                        return (a.place || 999) - (b.place || 999);
                      })
                      .map(result => (
                        <tr key={result.id} className="border-b border-gray-100">
                          <td className={`py-2 font-mono ${getMedalClass(result.place)}`}>
                            {result.best_height ? result.place : result.status}
                          </td>
                          <td className="py-2 font-bold text-gray-900 font-mono">
                            {result.entry?.bib_number || '-'}
                          </td>
                          <td className="py-2 font-medium text-gray-900">
                            {result.entry?.athlete?.last_name?.toUpperCase()}, {result.entry?.athlete?.first_name}
                          </td>
                          <td className="py-2 text-gray-700">
                            {result.entry?.athlete?.club_name || result.entry?.athlete?.nationality || '-'}
                          </td>
                          <td className="py-2 text-right font-mono font-medium">
                            {formatHeight(result.best_height)}
                          </td>
                          <td className="py-2 text-center font-mono text-gray-500">
                            {result.total_misses ?? '-'}
                          </td>
                          <td className="py-2 text-center">
                            {result.is_pb && <span className="text-xs font-bold text-green-600">PB</span>}
                            {result.is_sb && !result.is_pb && <span className="text-xs font-bold text-blue-600">SB</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {eventsWithResults.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No results have been recorded yet.
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
