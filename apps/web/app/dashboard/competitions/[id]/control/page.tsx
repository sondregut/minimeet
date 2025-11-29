'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Users,
  Play,
  CheckCircle,
  RefreshCw,
  Trophy,
  AlertCircle,
  Megaphone,
  ChevronRight,
  BarChart3,
  Timer,
  Target,
  Eye,
  EyeOff,
  FileEdit,
  Award,
  XCircle,
  CheckSquare,
  Square,
  UserCheck,
} from 'lucide-react';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntryCountsByEvent, getCompetitionDashboardStats, getResultsCountsByEvent } from '@/lib/actions/entries';
import {
  updateEventStatus,
  updateEventVisibility,
  bulkUpdateEventStatus,
  bulkUpdateEventVisibility,
} from '@/lib/actions/events';
import { type EventStatus } from '@/lib/constants/event-status';

interface Event {
  id: string;
  name: string;
  event_type: string;
  status: EventStatus;
  scheduled_time: string | null;
  round: string;
  gender: string;
  is_public: boolean;
}

// Helper to get status badge styles
function getStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft', icon: FileEdit },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled', icon: Clock },
    checkin: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Check-in', icon: Users },
    in_progress: { bg: 'bg-red-100', text: 'text-red-700', label: 'Live', icon: Play },
    official: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Official', icon: Award },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete', icon: CheckCircle },
    cancelled: { bg: 'bg-gray-200', text: 'text-gray-500', label: 'Cancelled', icon: XCircle },
  };
  return styles[status] || styles.scheduled;
}

export default function ControlDashboardPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [competition, setCompetition] = useState<{ name: string; date: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [resultsCounts, setResultsCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ totalEntries: 0, totalResults: 0, completedEvents: 0, totalEvents: 0 });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showAnnouncerView, setShowAnnouncerView] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);

    try {
      const [competitionData, eventsData, counts, results, dashboardStats] = await Promise.all([
        getCompetition(competitionId),
        getEventsByCompetition(competitionId),
        getEntryCountsByEvent(competitionId),
        getResultsCountsByEvent(competitionId),
        getCompetitionDashboardStats(competitionId),
      ]);

      setCompetition(competitionData);
      setEvents(eventsData as Event[]);
      setEntryCounts(counts);
      setResultsCounts(results);
      setStats(dashboardStats);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [competitionId]);

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleQuickStatusChange(
    eventId: string,
    newStatus: EventStatus
  ) {
    try {
      const result = await updateEventStatus(eventId, newStatus, competitionId);
      if (!result.error) {
        await loadData(false);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function handleVisibilityToggle(eventId: string, isPublic: boolean) {
    try {
      const result = await updateEventVisibility(eventId, isPublic, competitionId);
      if (!result.error) {
        await loadData(false);
      }
    } catch (err) {
      console.error('Error updating visibility:', err);
    }
  }

  function toggleEventSelection(eventId: string) {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }

  function selectAllEvents() {
    setSelectedEvents(new Set(events.map(e => e.id)));
  }

  function clearSelection() {
    setSelectedEvents(new Set());
  }

  async function handleBulkStatusChange(status: EventStatus) {
    if (selectedEvents.size === 0) return;
    try {
      const result = await bulkUpdateEventStatus(Array.from(selectedEvents), status, competitionId);
      if (!result.error) {
        await loadData(false);
        clearSelection();
        setShowBulkActions(false);
      }
    } catch (err) {
      console.error('Error bulk updating status:', err);
    }
  }

  async function handleBulkVisibilityChange(isPublic: boolean) {
    if (selectedEvents.size === 0) return;
    try {
      const result = await bulkUpdateEventVisibility(Array.from(selectedEvents), isPublic, competitionId);
      if (!result.error) {
        await loadData(false);
        clearSelection();
        setShowBulkActions(false);
      }
    } catch (err) {
      console.error('Error bulk updating visibility:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading control dashboard...</div>
      </div>
    );
  }

  // Group events by status
  const draftEvents = events.filter(e => e.status === 'draft');
  const liveEvents = events.filter(e => e.status === 'in_progress');
  const checkinEvents = events.filter(e => e.status === 'checkin');
  const scheduledEvents = events.filter(e => e.status === 'scheduled');
  const officialEvents = events.filter(e => e.status === 'official');
  const completedEvents = events.filter(e => e.status === 'completed');
  const cancelledEvents = events.filter(e => e.status === 'cancelled');

  // Sort by scheduled time
  const sortByTime = (a: Event, b: Event) => {
    if (!a.scheduled_time && !b.scheduled_time) return 0;
    if (!a.scheduled_time) return 1;
    if (!b.scheduled_time) return -1;
    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
  };

  scheduledEvents.sort(sortByTime);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {competition?.name || 'Competition'}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {competition?.name} - {competition?.date ? new Date(competition.date).toLocaleDateString() : ''}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                showTimeline
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-blue-300 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <Timer className="w-4 h-4" />
              Timeline
            </button>
            <button
              onClick={() => setShowAnnouncerView(!showAnnouncerView)}
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                showAnnouncerView
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'border border-purple-300 text-purple-700 hover:bg-purple-50'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Announcer
            </button>
            <Link
              href={`/dashboard/competitions/${competitionId}/callroom`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Call Room
            </Link>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Announcer View */}
      {showAnnouncerView && (
        <AnnouncerView
          liveEvents={liveEvents}
          checkinEvents={checkinEvents}
          scheduledEvents={scheduledEvents}
          entryCounts={entryCounts}
        />
      )}

      {/* Timeline View */}
      {showTimeline && (
        <TimelineView
          events={events}
          competitionId={competitionId}
        />
      )}

      {/* Bulk Actions Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showBulkActions
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showBulkActions ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              Bulk Edit
            </button>
            {showBulkActions && (
              <>
                <button
                  onClick={selectAllEvents}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
                <span className="text-sm text-gray-500">
                  {selectedEvents.size} selected
                </span>
              </>
            )}
          </div>

          {showBulkActions && selectedEvents.size > 0 && (
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-sm text-gray-500">Set status:</span>
              <button
                onClick={() => handleBulkStatusChange('scheduled')}
                className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Scheduled
              </button>
              <button
                onClick={() => handleBulkStatusChange('checkin')}
                className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Check-in
              </button>
              <button
                onClick={() => handleBulkStatusChange('in_progress')}
                className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                In Progress
              </button>
              <button
                onClick={() => handleBulkStatusChange('official')}
                className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                Official
              </button>
              <button
                onClick={() => handleBulkStatusChange('completed')}
                className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Complete
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => handleBulkVisibilityChange(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                <Eye className="w-3 h-3" /> Public
              </button>
              <button
                onClick={() => handleBulkVisibilityChange(false)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                <EyeOff className="w-3 h-3" /> Hide
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-900">{liveEvents.length}</p>
              <p className="text-sm text-red-600">Live Now</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-900">{checkinEvents.length}</p>
              <p className="text-sm text-yellow-600">Check-in</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{scheduledEvents.length}</p>
              <p className="text-sm text-gray-600">Upcoming</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{completedEvents.length}</p>
              <p className="text-sm text-green-600">Complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Stats Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-600">Total Results:</span>
            <span className="font-semibold text-gray-900">{stats.totalResults}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-600">Entries:</span>
            <span className="font-semibold text-gray-900">{stats.totalEntries}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Completion:</span>
            <span className="font-semibold text-gray-900">
              {stats.totalEvents > 0 ? Math.round((stats.completedEvents / stats.totalEvents) * 100) : 0}%
            </span>
          </div>
        </div>
        <Link
          href={`/results/${competitionId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 font-medium rounded-lg hover:bg-amber-200 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          View Public Results
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Live Events - Prominent Display */}
      {liveEvents.length > 0 && (
        <div className="bg-red-50 rounded-lg border-2 border-red-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold text-red-900">Live Events</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                competitionId={competitionId}
                entryCount={entryCounts[event.id] || 0}
                resultsCount={resultsCounts[event.id] || 0}
                onStatusChange={handleQuickStatusChange}
                onVisibilityToggle={handleVisibilityToggle}
                isSelected={selectedEvents.has(event.id)}
                onSelect={toggleEventSelection}
                showSelection={showBulkActions}
              />
            ))}
          </div>
        </div>
      )}

      {/* Check-in Events */}
      {checkinEvents.length > 0 && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-yellow-900">Check-in in Progress</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checkinEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                competitionId={competitionId}
                entryCount={entryCounts[event.id] || 0}
                resultsCount={resultsCounts[event.id] || 0}
                onStatusChange={handleQuickStatusChange}
                onVisibilityToggle={handleVisibilityToggle}
                isSelected={selectedEvents.has(event.id)}
                onSelect={toggleEventSelection}
                showSelection={showBulkActions}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {scheduledEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledEvents.slice(0, 9).map(event => (
              <EventCard
                key={event.id}
                event={event}
                competitionId={competitionId}
                entryCount={entryCounts[event.id] || 0}
                resultsCount={resultsCounts[event.id] || 0}
                onStatusChange={handleQuickStatusChange}
                onVisibilityToggle={handleVisibilityToggle}
                isSelected={selectedEvents.has(event.id)}
                onSelect={toggleEventSelection}
                showSelection={showBulkActions}
              />
            ))}
          </div>
          {scheduledEvents.length > 9 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              +{scheduledEvents.length - 9} more scheduled events
            </p>
          )}
        </div>
      )}

      {/* Completed Events */}
      {completedEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Completed Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {completedEvents.map(event => (
              <Link
                key={event.id}
                href={`/dashboard/competitions/${competitionId}/events/${event.id}`}
                className="bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{event.name}</p>
                    <p className="text-xs text-gray-500">
                      {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} • {event.round}
                    </p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
          <p className="text-gray-500 mb-4">
            Add events to this competition to start managing them from the control dashboard.
          </p>
          <Link
            href={`/dashboard/competitions/${competitionId}/events/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
          >
            Add Event
          </Link>
        </div>
      )}
    </div>
  );
}

// Timeline View Component - Visual schedule of events
function TimelineView({
  events,
  competitionId,
}: {
  events: Event[];
  competitionId: string;
}) {
  // Sort events by scheduled time
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.scheduled_time && !b.scheduled_time) return 0;
    if (!a.scheduled_time) return 1;
    if (!b.scheduled_time) return -1;
    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
  });

  // Group events by hour
  const eventsByHour: Record<string, Event[]> = {};
  const unscheduled: Event[] = [];

  sortedEvents.forEach(event => {
    if (!event.scheduled_time) {
      unscheduled.push(event);
    } else {
      const hour = new Date(event.scheduled_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
      });
      if (!eventsByHour[hour]) {
        eventsByHour[hour] = [];
      }
      eventsByHour[hour].push(event);
    }
  });

  const hours = Object.keys(eventsByHour);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-blue-900">Competition Timeline</h2>
        </div>
      </div>

      <div className="p-6">
        {hours.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[60px] top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {hours.map(hour => (
                <div key={hour} className="relative flex gap-6">
                  {/* Time label */}
                  <div className="w-[60px] flex-shrink-0 text-right">
                    <span className="text-sm font-semibold text-gray-700">{hour}</span>
                  </div>

                  {/* Timeline dot */}
                  <div className="absolute left-[56px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />

                  {/* Events for this hour */}
                  <div className="flex-1 pl-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {eventsByHour[hour].map(event => {
                        const statusColors: Record<string, string> = {
                          scheduled: 'bg-gray-100 border-gray-200',
                          checkin: 'bg-yellow-50 border-yellow-200',
                          in_progress: 'bg-red-50 border-red-200',
                          completed: 'bg-green-50 border-green-200',
                        };
                        const statusIcons: Record<string, React.ElementType> = {
                          scheduled: Clock,
                          checkin: Users,
                          in_progress: Play,
                          completed: CheckCircle,
                        };
                        const StatusIcon = statusIcons[event.status] || Clock;

                        return (
                          <Link
                            key={event.id}
                            href={`/dashboard/competitions/${competitionId}/events/${event.id}`}
                            className={`block rounded-lg border p-3 hover:shadow-md transition-shadow ${
                              statusColors[event.status] || statusColors.scheduled
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {event.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'}
                                  {event.scheduled_time && (
                                    <> - {new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}</>
                                  )}
                                </p>
                              </div>
                              <StatusIcon className={`w-4 h-4 flex-shrink-0 ${
                                event.status === 'in_progress' ? 'text-red-500' :
                                event.status === 'checkin' ? 'text-yellow-600' :
                                event.status === 'completed' ? 'text-green-500' :
                                'text-gray-400'
                              }`} />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No events with scheduled times
          </p>
        )}

        {/* Unscheduled events */}
        {unscheduled.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Unscheduled Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {unscheduled.map(event => (
                <Link
                  key={event.id}
                  href={`/dashboard/competitions/${competitionId}/events/${event.id}`}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-xs text-gray-500">
                    {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} - {event.round}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Announcer View Component - Optimized for PA announcements
function AnnouncerView({
  liveEvents,
  checkinEvents,
  scheduledEvents,
  entryCounts,
}: {
  liveEvents: Event[];
  checkinEvents: Event[];
  scheduledEvents: Event[];
  entryCounts: Record<string, number>;
}) {
  // Get next 3 upcoming events
  const upcomingEvents = scheduledEvents.slice(0, 3);

  return (
    <div className="bg-gradient-to-r from-purple-900 to-purple-700 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Megaphone className="w-6 h-6" />
        <h2 className="text-xl font-bold">Announcer View</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Events */}
        <div>
          <h3 className="text-sm font-medium text-purple-200 uppercase tracking-wide mb-3">
            Now Happening
          </h3>
          {liveEvents.length > 0 ? (
            <div className="space-y-3">
              {liveEvents.map(event => (
                <div key={event.id} className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-red-300 uppercase">Live</span>
                  </div>
                  <p className="text-xl font-bold">{event.name}</p>
                  <p className="text-purple-200 text-sm">
                    {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} - {event.round}
                    {entryCounts[event.id] ? ` - ${entryCounts[event.id]} athletes` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : checkinEvents.length > 0 ? (
            <div className="space-y-3">
              {checkinEvents.map(event => (
                <div key={event.id} className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-yellow-300" />
                    <span className="text-xs font-medium text-yellow-300 uppercase">Check-in Open</span>
                  </div>
                  <p className="text-xl font-bold">{event.name}</p>
                  <p className="text-purple-200 text-sm">
                    {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} - {event.round}
                    {entryCounts[event.id] ? ` - ${entryCounts[event.id]} athletes` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-purple-200">No events currently in progress</p>
            </div>
          )}
        </div>

        {/* Up Next */}
        <div>
          <h3 className="text-sm font-medium text-purple-200 uppercase tracking-wide mb-3">
            Coming Up Next
          </h3>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`rounded-lg p-3 ${
                    index === 0 ? 'bg-white/20 backdrop-blur' : 'bg-white/10 backdrop-blur'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${index === 0 ? 'text-lg' : 'text-base'}`}>
                        {event.name}
                      </p>
                      <p className="text-purple-200 text-sm">
                        {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} - {event.round}
                      </p>
                    </div>
                    {event.scheduled_time && (
                      <div className="text-right">
                        <p className={`font-bold ${index === 0 ? 'text-xl' : 'text-base'}`}>
                          {new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {index === 0 && (
                          <p className="text-xs text-purple-200">Next Event</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-purple-200">No upcoming events scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-6 pt-4 border-t border-purple-600 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <Play className="w-4 h-4 text-red-400" />
            {liveEvents.length} Live
          </span>
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-yellow-400" />
            {checkinEvents.length} Check-in
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-300" />
            {scheduledEvents.length} Upcoming
          </span>
        </div>
        <span className="text-purple-200 text-xs">
          Auto-refreshes every 30s
        </span>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({
  event,
  competitionId,
  entryCount,
  resultsCount = 0,
  onStatusChange,
  onVisibilityToggle,
  isSelected,
  onSelect,
  showSelection,
}: {
  event: Event;
  competitionId: string;
  entryCount: number;
  resultsCount?: number;
  onStatusChange: (eventId: string, status: EventStatus) => void;
  onVisibilityToggle?: (eventId: string, isPublic: boolean) => void;
  isSelected?: boolean;
  onSelect?: (eventId: string) => void;
  showSelection?: boolean;
}) {
  const status = getStatusBadge(event.status);
  const StatusIcon = status.icon;

  // Get next status options based on current status
  const getNextStatusOptions = (): { status: EventStatus; label: string; className: string }[] => {
    switch (event.status) {
      case 'draft':
        return [{ status: 'scheduled', label: 'Schedule', className: 'bg-blue-100 text-blue-700 hover:bg-blue-200' }];
      case 'scheduled':
        return [
          { status: 'checkin', label: 'Open Check-in', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
          { status: 'in_progress', label: 'Start', className: 'bg-red-100 text-red-700 hover:bg-red-200' },
        ];
      case 'checkin':
        return [{ status: 'in_progress', label: 'Start Event', className: 'bg-red-100 text-red-700 hover:bg-red-200' }];
      case 'in_progress':
        return [
          { status: 'official', label: 'Make Official', className: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
          { status: 'completed', label: 'Complete', className: 'bg-green-100 text-green-700 hover:bg-green-200' },
        ];
      case 'official':
        return [{ status: 'completed', label: 'Complete', className: 'bg-green-100 text-green-700 hover:bg-green-200' }];
      default:
        return [];
    }
  };

  const nextOptions = getNextStatusOptions();

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2">
          {showSelection && onSelect && (
            <button
              onClick={() => onSelect(event.id)}
              className="mt-0.5"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
          <div>
            <Link
              href={`/dashboard/competitions/${competitionId}/events/${event.id}`}
              className="font-medium text-gray-900 hover:text-blue-900"
            >
              {event.name}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">
              {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} • {event.round}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Visibility indicator */}
          {onVisibilityToggle && (
            <button
              onClick={() => onVisibilityToggle(event.id, !event.is_public)}
              className={`p-1 rounded transition-colors ${
                event.is_public
                  ? 'text-green-600 hover:bg-green-50'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
              title={event.is_public ? 'Public - Click to hide' : 'Hidden - Click to make public'}
            >
              {event.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Users className="w-4 h-4" />
            {entryCount} entries
          </span>
          {resultsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Trophy className="w-4 h-4" />
              {resultsCount} results
            </span>
          )}
        </div>
        {event.scheduled_time && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {new Date(event.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        {nextOptions.map(option => (
          <button
            key={option.status}
            onClick={() => onStatusChange(event.id, option.status)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${option.className}`}
          >
            {option.label}
          </button>
        ))}
        <Link
          href={`/dashboard/competitions/${competitionId}/events/${event.id}`}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}
