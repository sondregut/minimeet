import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEvent } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';
import { getEntriesByEvent } from '@/lib/actions/entries';
import { getTrackResultsByEvent, getFieldResultsByEvent, getVerticalResultsByEvent } from '@/lib/actions/results';
import EventStatusControls from '@/components/EventStatusControls';
import ExportResultsButton from '@/components/ExportResultsButton';
import RecalculateButton from '@/components/RecalculateButton';
import {
  ArrowLeft,
  Clock,
  Users,
  Play,
  CheckCircle,
  Settings,
  Plus,
  Trophy,
  User,
  Timer,
  Wind,
  Layers,
  FileText,
} from 'lucide-react';

// Helper to get status badge styles
function getStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Scheduled' },
    checkin: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Check-in' },
    in_progress: { bg: 'bg-red-100', text: 'text-red-700', label: 'In Progress' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  };
  return styles[status] || styles.scheduled;
}

// Helper to get entry status badge
function getEntryStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string }> = {
    registered: { bg: 'bg-gray-100', text: 'text-gray-700' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-700' },
    checked_in: { bg: 'bg-green-100', text: 'text-green-700' },
    DNS: { bg: 'bg-orange-100', text: 'text-orange-700' },
    scratched: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return styles[status] || styles.registered;
}

// Helper to get result status badge
function getResultStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string }> = {
    finished: { bg: 'bg-green-100', text: 'text-green-700' },
    DNS: { bg: 'bg-gray-100', text: 'text-gray-700' },
    DNF: { bg: 'bg-orange-100', text: 'text-orange-700' },
    DQ: { bg: 'bg-red-100', text: 'text-red-700' },
    FS: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return styles[status] || styles.finished;
}

// Helper to format event type
function getEventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    track: 'Track',
    field_vertical: 'Vertical Jump',
    field_horizontal: 'Horizontal Jump',
    throw: 'Throw',
    relay: 'Relay',
    combined: 'Combined',
    road: 'Road',
  };
  return labels[type] || type;
}

export default async function EventDetailPage({
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

  // Fetch results based on event type
  let trackResults: Awaited<ReturnType<typeof getTrackResultsByEvent>> = [];
  let fieldResults: Awaited<ReturnType<typeof getFieldResultsByEvent>> = [];
  let verticalResults: Awaited<ReturnType<typeof getVerticalResultsByEvent>> = [];

  if (event.event_type === 'track' || event.event_type === 'relay' || event.event_type === 'road') {
    trackResults = await getTrackResultsByEvent(eventId);
  } else if (event.event_type === 'field_horizontal' || event.event_type === 'throw') {
    fieldResults = await getFieldResultsByEvent(eventId);
  } else if (event.event_type === 'field_vertical') {
    verticalResults = await getVerticalResultsByEvent(eventId);
  }

  const statusBadge = getStatusBadge(event.status);
  const checkedInCount = entries.filter(e => e.status === 'checked_in').length;
  const resultsCount = trackResults.length + fieldResults.length + verticalResults.length;

  // Find best result
  const finishedResults = trackResults.filter(r => r.status === 'finished' && r.time_ms);
  const bestResult = finishedResults.length > 0
    ? finishedResults.reduce((best, current) =>
        (current.time_ms || Infinity) < (best.time_ms || Infinity) ? current : best
      )
    : null;

  // Best mark for field events
  const bestFieldMark = fieldResults.length > 0 && fieldResults[0]?.best_mark
    ? `${fieldResults[0].best_mark.toFixed(2)}m`
    : null;

  // Best height for vertical events
  const bestVerticalHeight = verticalResults.length > 0 && verticalResults[0]?.best_height
    ? `${verticalResults[0].best_height.toFixed(2)}m`
    : null;

  // Combined best result display
  const bestResultDisplay = bestResult?.time_display || bestFieldMark || bestVerticalHeight || '-';

  // Sort results by place
  const sortedResults = [...trackResults].sort((a, b) => {
    if (a.status !== 'finished' && b.status !== 'finished') return 0;
    if (a.status !== 'finished') return 1;
    if (b.status !== 'finished') return -1;
    return (a.place || 999) - (b.place || 999);
  });

  const isTrackEvent = event.event_type === 'track' || event.event_type === 'relay' || event.event_type === 'road';
  const isFieldEvent = event.event_type === 'field_horizontal' || event.event_type === 'throw';
  const isVerticalEvent = event.event_type === 'field_vertical';
  const hasResults = resultsCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {competition.name}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="inline-flex items-center gap-1">
                {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'}
              </span>
              <span>·</span>
              <span>{event.age_group}</span>
              <span>·</span>
              <span className="capitalize">{event.round}</span>
              <span>·</span>
              <span>{getEventTypeLabel(event.event_type)}</span>
              {event.wind_reading && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-4 h-4" />
                    {event.wind_reading > 0 ? '+' : ''}{event.wind_reading} m/s
                  </span>
                </>
              )}
            </div>
            {event.scheduled_time && (
              <div className="flex items-center gap-1 mt-2 text-gray-600">
                <Clock className="w-4 h-4" />
                Scheduled: {new Date(event.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {entries.length > 0 && (
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/heats`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
              >
                <Layers className="w-4 h-4" />
                {isTrackEvent ? 'Heats' : 'Flights'}
              </Link>
            )}
            {entries.length > 0 && isTrackEvent && (
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/results`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
              >
                <Timer className="w-4 h-4" />
                Record Results
              </Link>
            )}
            {entries.length > 0 && event.event_type === 'field_vertical' && (
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/vertical-results`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
              >
                <Trophy className="w-4 h-4" />
                Record Heights
              </Link>
            )}
            {entries.length > 0 && (event.event_type === 'field_horizontal' || event.event_type === 'throw') && (
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/field-results`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
              >
                <Trophy className="w-4 h-4" />
                Record Attempts
              </Link>
            )}
            <EventStatusControls
              eventId={eventId}
              competitionId={competitionId}
              currentStatus={event.status}
            />
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
              <p className="text-sm text-gray-500">Entries</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{checkedInCount}</p>
              <p className="text-sm text-gray-500">Checked In</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{resultsCount}</p>
              <p className="text-sm text-gray-500">Results</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {bestResultDisplay}
              </p>
              <p className="text-sm text-gray-500">Best Result</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recalculate Button (shown when results exist) */}
      {hasResults && (
        <div className="flex items-center justify-end">
          <RecalculateButton
            eventId={eventId}
            competitionId={competitionId}
            eventType={event.event_type}
            eventCode={event.event_code}
          />
        </div>
      )}

      {/* Results Section (for track events with results) */}
      {isTrackEvent && trackResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <div className="flex items-center gap-3">
              <ExportResultsButton eventId={eventId} eventName={event.name} />
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/results`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit Results
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-16">
                    Place
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                    Bib
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Athlete
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Club
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                    Time
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                    React
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedResults.map((result) => {
                  const resultBadge = getResultStatusBadge(result.status);
                  return (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-bold text-gray-900">
                        {result.status === 'finished' ? result.place || '-' : '-'}
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {result.entry?.bib_number || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {result.entry?.athlete?.first_name} {result.entry?.athlete?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {result.entry?.athlete?.nationality}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {result.entry?.athlete?.club_name || '-'}
                      </td>
                      <td className="px-4 py-4 font-mono font-medium text-gray-900">
                        {result.time_display || '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600 font-mono text-sm">
                        {result.reaction_time_ms ? (result.reaction_time_ms / 1000).toFixed(3) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${resultBadge.bg} ${resultBadge.text}`}>
                          {result.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Section (for field events) */}
      {isFieldEvent && fieldResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/field-results`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit Results
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-16">
                    Place
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                    Bib
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Athlete
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Club
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                    Best Mark
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                    Wind
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                    Flags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fieldResults.map((result, index) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-gray-900">
                      {result.place || (index + 1)}
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {result.entry?.bib_number || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {result.entry?.athlete?.first_name} {result.entry?.athlete?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {result.entry?.athlete?.nationality}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {result.entry?.athlete?.club_name || '-'}
                    </td>
                    <td className="px-4 py-4 font-mono font-medium text-gray-900">
                      {result.best_mark ? `${result.best_mark.toFixed(2)}m` : '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-600 font-mono text-sm">
                      {result.best_mark_wind != null ? `${result.best_mark_wind > 0 ? '+' : ''}${result.best_mark_wind.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {result.is_pb && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700">
                            PB
                          </span>
                        )}
                        {result.is_sb && !result.is_pb && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
                            SB
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Section (for vertical events) */}
      {isVerticalEvent && verticalResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/vertical-results`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit Results
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-16">
                    Place
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                    Bib
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Athlete
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Club
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                    Best Height
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                    Misses
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                    Flags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {verticalResults.map((result, index) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-gray-900">
                      {result.place || (index + 1)}
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {result.entry?.bib_number || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {result.entry?.athlete?.first_name} {result.entry?.athlete?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {result.entry?.athlete?.nationality}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {result.entry?.athlete?.club_name || '-'}
                    </td>
                    <td className="px-4 py-4 font-mono font-medium text-gray-900">
                      {result.best_height ? `${result.best_height.toFixed(2)}m` : '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-600 font-mono text-sm">
                      {result.misses_at_best != null ? `${result.misses_at_best} / ${result.total_misses}` : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {result.is_pb && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700">
                            PB
                          </span>
                        )}
                        {result.is_sb && !result.is_pb && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
                            SB
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entries / Start List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Start List</h2>
          <div className="flex items-center gap-3">
            {entries.length > 0 && (
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/startlist/manage`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Start List
              </Link>
            )}
            <Link
              href={`/dashboard/competitions/${competitionId}/events/${eventId}/entries/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </Link>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="py-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No entries yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Add athletes to this event to create a start list
                </p>
                <Link
                  href={`/dashboard/competitions/${competitionId}/events/${eventId}/entries/new`}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-16">
                    {event.event_type === 'track' ? 'Lane' : 'Pos'}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                    Bib
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Athlete
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                    Club
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                    Seed
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-28">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => {
                  const entryBadge = getEntryStatusBadge(entry.status);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-gray-600">
                        {entry.lane_or_position || '-'}
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {entry.bib_number || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {entry.athlete?.first_name} {entry.athlete?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {entry.athlete?.nationality}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {entry.athlete?.club_name || '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {entry.seed_mark || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${entryBadge.bg} ${entryBadge.text}`}>
                          {entry.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
