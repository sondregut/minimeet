import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntriesByCompetition } from '@/lib/actions/entries';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';
import PrintButton from '@/components/PrintButton';

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
  location: string | null;
};

type Entry = {
  id: string;
  event_id: string;
};

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    track: 'Track',
    relay: 'Relay',
    road: 'Road',
    field_horizontal: 'Field',
    field_vertical: 'Field',
    throw: 'Throws',
    combined: 'Combined',
  };
  return labels[type] || type;
}

function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
    checkin_open: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Check-in' },
    in_progress: { bg: 'bg-green-100', text: 'text-green-700', label: 'In Progress' },
    official: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Official' },
    finished: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Finished' },
  };
  return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
}

export default async function SchedulePage({
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

  const typedEvents = events as Event[];
  const typedEntries = allEntries as Entry[];

  // Count entries per event
  const entryCounts: Record<string, number> = {};
  typedEntries.forEach(entry => {
    if (entry.event_id) {
      entryCounts[entry.event_id] = (entryCounts[entry.event_id] || 0) + 1;
    }
  });

  // Sort events by scheduled time
  const sortedEvents = [...typedEvents].sort((a, b) => {
    if (!a.scheduled_time && !b.scheduled_time) return 0;
    if (!a.scheduled_time) return 1;
    if (!b.scheduled_time) return -1;
    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
  });

  // Group events by time slot (hour)
  const eventsByHour: Record<string, Event[]> = {};
  const unscheduled: Event[] = [];

  sortedEvents.forEach(event => {
    if (event.scheduled_time) {
      const date = new Date(event.scheduled_time);
      const hours = date.getHours().toString().padStart(2, '0');
      const hourKey = `${hours}:00`;
      if (!eventsByHour[hourKey]) {
        eventsByHour[hourKey] = [];
      }
      eventsByHour[hourKey].push(event);
    } else {
      unscheduled.push(event);
    }
  });

  const timeSlots = Object.keys(eventsByHour).sort();

  // Get competition date
  const competitionDate = competition.date
    ? new Date(competition.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

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
            <h1 className="text-2xl font-bold text-gray-900">Competition Schedule</h1>
            <p className="text-gray-600 mt-1">{competition.name}</p>
          </div>

          <PrintButton />
        </div>
      </div>

      {/* Printable Content */}
      <div className="print:pt-0">
        {/* Header - Print Only */}
        <div className="hidden print:block text-center mb-8 pb-4 border-b-2 border-gray-900">
          <h1 className="text-3xl font-bold mb-2">{competition.name}</h1>
          <p className="text-lg text-gray-600">Competition Schedule</p>
          {competitionDate && (
            <p className="text-gray-600 mt-1">{competitionDate}</p>
          )}
          {competition.venue && (
            <p className="text-gray-500 mt-1 flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" />
              {competition.venue}
            </p>
          )}
        </div>

        {/* Screen Header */}
        <div className="print:hidden bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              {competitionDate && <span className="font-medium">{competitionDate}</span>}
              {competition.venue && (
                <>
                  <span className="mx-2">·</span>
                  <span className="text-gray-600">{competition.venue}</span>
                </>
              )}
            </div>
            <div className="text-gray-600">
              {sortedEvents.length} events
            </div>
          </div>
        </div>

        {/* Schedule by Time Slot */}
        {timeSlots.map((timeSlot, index) => (
          <div key={timeSlot} className={`mb-6 ${index > 0 ? 'pt-4' : ''}`}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-300">
              <Clock className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-bold text-gray-900">{timeSlot}</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-20">Time</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2">Event</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-24">Category</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-20">Type</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-16 print:hidden">Entries</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-24 print:hidden">Status</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {eventsByHour[timeSlot].map(event => {
                  const statusBadge = getStatusBadge(event.status);
                  return (
                    <tr key={event.id} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-gray-700">
                        {event.scheduled_time
                          ? new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })
                          : '-'}
                      </td>
                      <td className="py-2">
                        <span className="font-medium text-gray-900">{event.name}</span>
                        {event.round && event.round !== 'final' && (
                          <span className="ml-2 text-sm text-gray-500">({event.round})</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-700">
                        {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'}
                        {event.age_group && ` ${event.age_group}`}
                      </td>
                      <td className="py-2 text-gray-600 text-sm">
                        {getEventTypeLabel(event.event_type)}
                      </td>
                      <td className="py-2 text-gray-600 print:hidden">
                        {entryCounts[event.id] || 0}
                      </td>
                      <td className="py-2 print:hidden">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600 text-sm">
                        {event.location || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Unscheduled Events */}
        {unscheduled.length > 0 && (
          <div className="mb-6 pt-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-300">
              <h2 className="text-lg font-bold text-gray-500">Unscheduled</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-semibold text-gray-700 py-2">Event</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-24">Category</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-20">Type</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-16 print:hidden">Entries</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-2 w-24 print:hidden">Status</th>
                </tr>
              </thead>
              <tbody>
                {unscheduled.map(event => {
                  const statusBadge = getStatusBadge(event.status);
                  return (
                    <tr key={event.id} className="border-b border-gray-100">
                      <td className="py-2">
                        <span className="font-medium text-gray-900">{event.name}</span>
                        {event.round && event.round !== 'final' && (
                          <span className="ml-2 text-sm text-gray-500">({event.round})</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-700">
                        {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'}
                        {event.age_group && ` ${event.age_group}`}
                      </td>
                      <td className="py-2 text-gray-600 text-sm">
                        {getEventTypeLabel(event.event_type)}
                      </td>
                      <td className="py-2 text-gray-600 print:hidden">
                        {entryCounts[event.id] || 0}
                      </td>
                      <td className="py-2 print:hidden">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sortedEvents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No events have been created yet.
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
