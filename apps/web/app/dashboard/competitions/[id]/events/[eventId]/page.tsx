import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEvent } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';
import { getEntriesByEvent } from '@/lib/actions/entries';
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

  const statusBadge = getStatusBadge(event.status);
  const checkedInCount = entries.filter(e => e.status === 'checked_in').length;

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
            </div>
            {event.scheduled_time && (
              <div className="flex items-center gap-1 mt-2 text-gray-600">
                <Clock className="w-4 h-4" />
                Scheduled: {event.scheduled_time}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {event.status === 'scheduled' && (
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600 transition-colors">
                <Users className="w-4 h-4" />
                Start Check-in
              </button>
            )}
            {event.status === 'checkin' && (
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors">
                <Play className="w-4 h-4" />
                Start Event
              </button>
            )}
            {event.status === 'in_progress' && (
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors">
                <CheckCircle className="w-4 h-4" />
                Complete Event
              </button>
            )}
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
              <p className="text-2xl font-bold text-gray-900">0</p>
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
              <p className="text-2xl font-bold text-gray-900">-</p>
              <p className="text-sm text-gray-500">Best Result</p>
            </div>
          </div>
        </div>
      </div>

      {/* Entries / Start List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Start List</h2>
          <Link
            href={`/dashboard/competitions/${competitionId}/events/${eventId}/entries/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </Link>
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

      {/* Results (shown when event has results) */}
      {event.status === 'in_progress' || event.status === 'completed' ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="py-12">
              <div className="text-center">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No results recorded
                </h3>
                <p className="text-gray-500">
                  Results will appear here as they are recorded
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
