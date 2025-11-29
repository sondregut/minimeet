import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntryCountsByEvent } from '@/lib/actions/entries';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Trophy,
  Clock,
  Users,
  Play,
  Settings,
  MoreVertical,
  Hash,
  LayoutDashboard,
  Zap,
  FileText,
} from 'lucide-react';

// Helper to format event type display
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

// Helper to get status badge styles
function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-purple-100 text-purple-700',
    archived: 'bg-gray-100 text-gray-500',
    scheduled: 'bg-gray-100 text-gray-700',
    checkin: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-red-100 text-red-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competition = await getCompetition(id);

  if (!competition) {
    notFound();
  }

  const [events, entryCounts] = await Promise.all([
    getEventsByCompetition(id),
    getEntryCountsByEvent(id),
  ]);

  // Calculate total entries
  const totalEntries = Object.values(entryCounts).reduce((sum, count) => sum + count, 0);

  // Define event type for grouping
  type Event = (typeof events)[number];

  // Group events by type
  const eventsByType = events.reduce<Record<string, Event[]>>((acc, event) => {
    const type = event.event_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/competitions"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competitions
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{competition.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(competition.status)}`}>
                {competition.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(competition.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {competition.location}
                {competition.venue && ` · ${competition.venue}`}
              </span>
            </div>
            {competition.description && (
              <p className="mt-3 text-gray-600">{competition.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/competitions/${id}/control`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Control
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/entries`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              All Entries
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/bibs`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
            >
              <Hash className="w-4 h-4" />
              Assign Bibs
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/reports`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Reports
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/events/quick-add`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-semibold rounded-md hover:bg-amber-600 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Quick Add
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/events/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </Link>
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
              <Trophy className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              <p className="text-sm text-gray-500">Events</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEntries}</p>
              <p className="text-sm text-gray-500">Entries</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.status === 'in_progress').length}
              </p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Events</h2>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="py-12">
              <div className="text-center">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No events yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Add events to this competition to get started
                </p>
                <Link
                  href={`/dashboard/competitions/${id}/events/new`}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(eventsByType).map(([type, typeEvents]) => (
              <div key={type}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {getEventTypeLabel(type)}
                </h3>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Event
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Gender
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Age Group
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Round
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Status
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Entries
                        </th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {typeEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <Link
                              href={`/dashboard/competitions/${id}/events/${event.id}`}
                              className="font-medium text-gray-900 hover:text-blue-900"
                            >
                              {event.name}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'}
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {event.age_group}
                          </td>
                          <td className="px-4 py-4 text-gray-600 capitalize">
                            {event.round}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(event.status)}`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {entryCounts[event.id] || 0}
                          </td>
                          <td className="px-4 py-4">
                            <button className="p-1 hover:bg-gray-100 rounded">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
