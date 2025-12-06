'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  LayoutDashboard,
} from 'lucide-react';
import { updateCompetitionStatus } from '@/lib/actions/competitions';
import { getControlDashboardData } from '@/lib/actions/entries';
import {
  updateEventStatus,
  updateEventVisibility,
  bulkUpdateEventStatus,
  bulkUpdateEventVisibility,
} from '@/lib/actions/events';
import { type EventStatus } from '@/lib/constants/event-status';

// Helper to format time as local time (display as entered, no timezone conversion)
// The time is stored in ISO format but we want to display the time portion as-is
function formatLocalTime(isoString: string | null): string {
  if (!isoString) return '-';

  // Extract just the time portion from the ISO string (HH:MM)
  // The time was stored in local timezone context, so we display it as-is
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return '-';
}

// Helper to get hour for timeline grouping (no timezone conversion)
function getLocalHour(isoString: string): string {
  const match = isoString.match(/T(\d{2}):/);
  if (match) {
    const hour = parseInt(match[1], 10);
    return `${hour.toString().padStart(2, '0')}:00`;
  }
  return '00:00';
}

interface Event {
  id: string;
  name: string;
  event_type: string;
  status: EventStatus;
  scheduled_time: string | null;
  round: string;
  gender: string;
  age_group: string | null;
  is_public: boolean;
}

interface Competition {
  id: string;
  name: string;
  date: string;
  status: string;
  settings?: {
    venue_type?: string;
    timing_system?: string;
  } | null;
}

// Helper to get status badge styles - Norwegian labels
function getStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Kladd', icon: FileEdit },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planlagt', icon: Clock },
    checkin: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Avkrysning', icon: Users },
    in_progress: { bg: 'bg-red-100', text: 'text-red-700', label: 'Pågår', icon: Play },
    official: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Offisiell', icon: Award },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ferdig', icon: CheckCircle },
    cancelled: { bg: 'bg-gray-200', text: 'text-gray-500', label: 'Avlyst', icon: XCircle },
  };
  return styles[status] || styles.scheduled;
}

export default function ControlDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
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
      // OPTIMIZED: Single combined call instead of 5 separate calls
      const data = await getControlDashboardData(competitionId);

      setCompetition(data.competition as Competition);
      setEvents(data.events as Event[]);
      setEntryCounts(data.entryCounts);
      setResultsCounts(data.resultsCounts);
      setStats(data.stats);
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

  // Start competition (set to active)
  async function handleStartCompetition() {
    const result = await updateCompetitionStatus(competitionId, 'active');
    if (result.error) {
      alert(result.error);
    } else {
      await loadData(false);
    }
  }

  // End competition (set to completed)
  async function handleEndCompetition() {
    if (!confirm('Er du sikker på at du vil avslutte stevnet?')) return;
    const result = await updateCompetitionStatus(competitionId, 'completed');
    if (result.error) {
      alert(result.error);
    } else {
      router.push(`/dashboard/competitions/${competitionId}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Check if competition is active
  const isActive = competition?.status === 'active' || competition?.status === 'in_progress';

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
    return a.scheduled_time.localeCompare(b.scheduled_time);
  };

  scheduledEvents.sort(sortByTime);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Title Row */}
        <div>
          <Link
            href={`/dashboard/competitions/${competitionId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til stevnet
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kontrollsenter</h1>
              <p className="text-gray-600">{competition?.name}</p>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500">
            Oppdatert: {lastRefresh.toLocaleTimeString('no-NO')}
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
            Tidslinje
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
            Speaker
          </button>
          <Link
            href={`/dashboard/competitions/${competitionId}/field-official`}
            className="inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Target className="w-4 h-4" />
            Teknisk
          </Link>
          <Link
            href={`/dashboard/competitions/${competitionId}/track-official`}
            className="inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Timer className="w-4 h-4" />
            Løp
          </Link>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Oppdater
          </button>

          {!isActive ? (
            <button
              onClick={handleStartCompetition}
              className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start stevne
            </button>
          ) : (
            <button
              onClick={handleEndCompetition}
              className="inline-flex items-center gap-2 px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Avslutt stevne
            </button>
          )}
        </div>
      </div>

      {/* Live Status Bar */}
      {isActive && (
        <div className="bg-red-600 text-white rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="font-semibold">Stevnet pågår</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="font-bold text-lg">{liveEvents.length}</span>
              <span className="ml-1 opacity-90">pågår</span>
            </div>
            <div>
              <span className="font-bold text-lg">{completedEvents.length}</span>
              <span className="ml-1 opacity-90">fullført</span>
            </div>
            <div>
              <span className="font-bold text-lg">{events.length}</span>
              <span className="ml-1 opacity-90">totalt</span>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-sm text-red-600">Pågår nå</p>
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
              <p className="text-sm text-yellow-600">Avkrysning</p>
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
              <p className="text-sm text-gray-600">Kommende</p>
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
              <p className="text-sm text-green-600">Fullført</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Stats Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-600">Resultater:</span>
            <span className="font-semibold text-gray-900">{stats.totalResults}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-600">Påmeldinger:</span>
            <span className="font-semibold text-gray-900">{stats.totalEntries}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Progresjon:</span>
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
          Se offentlige resultater
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Live Events - Prominent Display */}
      {liveEvents.length > 0 && (
        <div className="bg-red-50 rounded-lg border-2 border-red-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold text-red-900">Pågår nå</h2>
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
            <h2 className="text-lg font-semibold text-yellow-900">Avkrysning pågår</h2>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kommende øvelser</h2>
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
              +{scheduledEvents.length - 9} flere planlagte øvelser
            </p>
          )}
        </div>
      )}

      {/* Completed Events */}
      {completedEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fullførte øvelser</h2>
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
                      {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mixed'}{event.age_group && ` ${event.age_group}`} • {event.round}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen øvelser lagt til</h3>
          <p className="text-gray-500 mb-4">
            Legg til øvelser i stevnet for å styre dem fra kontrollsenteret.
          </p>
          <Link
            href={`/dashboard/competitions/${competitionId}/events/quick-add`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
          >
            Legg til øvelser
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
      // Use local hour extraction without timezone conversion
      const hour = getLocalHour(event.scheduled_time);
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
          <h2 className="text-lg font-semibold text-blue-900">Tidslinje</h2>
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
                                  {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mixed'}{event.age_group && ` ${event.age_group}`}
                                  {event.scheduled_time && (
                                    <> - {formatLocalTime(event.scheduled_time)}</>
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
            Ingen øvelser med planlagte tider
          </p>
        )}

        {/* Unscheduled events */}
        {unscheduled.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Øvelser uten tidspunkt</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {unscheduled.map(event => (
                <Link
                  key={event.id}
                  href={`/dashboard/competitions/${competitionId}/events/${event.id}`}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-xs text-gray-500">
                    {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mixed'}{event.age_group && ` ${event.age_group}`} - {event.round}
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
                    {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mixed'}{event.age_group && ` ${event.age_group}`} - {event.round}
                    {entryCounts[event.id] ? ` - ${entryCounts[event.id]} utøvere` : ''}
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
                    <span className="text-xs font-medium text-yellow-300 uppercase">Innsjekk åpen</span>
                  </div>
                  <p className="text-xl font-bold">{event.name}</p>
                  <p className="text-purple-200 text-sm">
                    {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mixed'}{event.age_group && ` ${event.age_group}`} - {event.round}
                    {entryCounts[event.id] ? ` - ${entryCounts[event.id]} utøvere` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-purple-200">Ingen øvelser pågår</p>
            </div>
          )}
        </div>

        {/* Up Next */}
        <div>
          <h3 className="text-sm font-medium text-purple-200 uppercase tracking-wide mb-3">
            Neste øvelser
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
                        {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mixed'}{event.age_group && ` ${event.age_group}`} - {event.round}
                      </p>
                    </div>
                    {event.scheduled_time && (
                      <div className="text-right">
                        <p className={`font-bold ${index === 0 ? 'text-xl' : 'text-base'}`}>
                          {formatLocalTime(event.scheduled_time)}
                        </p>
                        {index === 0 && (
                          <p className="text-xs text-purple-200">Neste</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-purple-200">Ingen planlagte øvelser</p>
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
        return [{ status: 'scheduled', label: 'Planlegg', className: 'bg-blue-100 text-blue-700 hover:bg-blue-200' }];
      case 'scheduled':
        return [
          { status: 'checkin', label: 'Åpne avkrysning', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
          { status: 'in_progress', label: 'Start', className: 'bg-red-100 text-red-700 hover:bg-red-200' },
        ];
      case 'checkin':
        return [{ status: 'in_progress', label: 'Start øvelse', className: 'bg-red-100 text-red-700 hover:bg-red-200' }];
      case 'in_progress':
        return [
          { status: 'official', label: 'Offisiell', className: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
          { status: 'completed', label: 'Fullfør', className: 'bg-green-100 text-green-700 hover:bg-green-200' },
        ];
      case 'official':
        return [{ status: 'completed', label: 'Fullfør', className: 'bg-green-100 text-green-700 hover:bg-green-200' }];
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
              {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mixed'}{event.age_group && ` ${event.age_group}`} • {event.round}
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
              title={event.is_public ? 'Offentlig - Klikk for å skjule' : 'Skjult - Klikk for å vise'}
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
            {entryCount} påmeldt
          </span>
          {resultsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Trophy className="w-4 h-4" />
              {resultsCount} resultater
            </span>
          )}
        </div>
        {event.scheduled_time && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatLocalTime(event.scheduled_time)}
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
          Detaljer
        </Link>
      </div>
    </div>
  );
}
