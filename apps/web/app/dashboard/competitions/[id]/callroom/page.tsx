'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  RefreshCw,
  UserCheck,
  UserX,
} from 'lucide-react';
import { getCheckinEvents, scratchNoShows } from '@/lib/actions/events';
import { getEntriesByEvent, updateEntryStatus, bulkUpdateEntryStatus } from '@/lib/actions/entries';
import { getCompetition } from '@/lib/actions/competitions';

type Event = {
  id: string;
  name: string;
  event_code: string;
  event_type: string;
  gender: string;
  age_group: string;
  status: string;
  scheduled_time: string | null;
  checkin_deadline: string | null;
  checkin_opened_at: string | null;
};

type Entry = {
  id: string;
  bib_number: string | null;
  status: string;
  heat_number: number | null;
  lane_or_position: number | null;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
  } | null;
};

const STATUS_ICONS = {
  registered: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
  confirmed: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' },
  checked_in: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  DNS: { icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  scratched: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
};

export default function CallRoomPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [competition, setCompetition] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bibSearch, setBibSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load competition and check-in events
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [eventsData, compData] = await Promise.all([
        getCheckinEvents(competitionId),
        getCompetition(competitionId),
      ]);
      setEvents(eventsData as Event[]);
      setCompetition(compData);

      // Auto-select first event
      if (eventsData.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsData[0] as Event);
      }
      setLoading(false);
      setLastRefresh(new Date());
    }
    loadData();
  }, [competitionId]);

  // Load entries when event is selected
  useEffect(() => {
    async function loadEntries() {
      if (!selectedEvent) {
        setEntries([]);
        return;
      }
      const entriesData = await getEntriesByEvent(selectedEvent.id);
      setEntries(entriesData as Entry[]);
    }
    loadEntries();
  }, [selectedEvent]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (selectedEvent) {
        const entriesData = await getEntriesByEvent(selectedEvent.id);
        setEntries(entriesData as Entry[]);
        setLastRefresh(new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedEvent]);

  const handleCheckIn = async (entryId: string) => {
    await updateEntryStatus(entryId, 'checked_in', competitionId);
    // Refresh entries
    if (selectedEvent) {
      const entriesData = await getEntriesByEvent(selectedEvent.id);
      setEntries(entriesData as Entry[]);
    }
  };

  const handleScratch = async (entryId: string) => {
    await updateEntryStatus(entryId, 'scratched', competitionId);
    if (selectedEvent) {
      const entriesData = await getEntriesByEvent(selectedEvent.id);
      setEntries(entriesData as Entry[]);
    }
  };

  const handleBibCheckIn = useCallback(async () => {
    if (!bibSearch.trim() || !selectedEvent) return;

    const entry = entries.find(
      (e) => e.bib_number?.toLowerCase() === bibSearch.toLowerCase().trim()
    );

    if (entry) {
      await handleCheckIn(entry.id);
      setBibSearch('');
    } else {
      alert(`No athlete with BIB "${bibSearch}" found in this event`);
    }
  }, [bibSearch, entries, selectedEvent]);

  const handleScratchNoShows = async () => {
    if (!selectedEvent) return;

    const pendingCount = entries.filter(e => e.status === 'registered').length;
    if (pendingCount === 0) {
      alert('No pending athletes to scratch');
      return;
    }

    if (!confirm(`Scratch ${pendingCount} athletes who haven't checked in?`)) return;

    const result = await scratchNoShows(selectedEvent.id, competitionId);
    if (result.success) {
      const entriesData = await getEntriesByEvent(selectedEvent.id);
      setEntries(entriesData as Entry[]);
      alert(`Scratched ${result.scratchedCount} athletes`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleCheckInAll = async () => {
    if (!selectedEvent) return;

    const pendingIds = entries
      .filter(e => e.status === 'registered')
      .map(e => e.id);

    if (pendingIds.length === 0) {
      alert('No pending athletes to check in');
      return;
    }

    await bulkUpdateEntryStatus(pendingIds, 'checked_in', competitionId, selectedEvent.id);
    const entriesData = await getEntriesByEvent(selectedEvent.id);
    setEntries(entriesData as Entry[]);
  };

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const name = `${entry.athlete?.first_name} ${entry.athlete?.last_name}`.toLowerCase();
    return (
      name.includes(searchTerm.toLowerCase()) ||
      entry.bib_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.athlete?.club_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Count stats
  const stats = {
    total: entries.length,
    checkedIn: entries.filter((e) => e.status === 'checked_in').length,
    pending: entries.filter((e) => e.status === 'registered' || e.status === 'confirmed').length,
    scratched: entries.filter((e) => e.status === 'scratched' || e.status === 'DNS').length,
  };

  // Check deadline status
  const getDeadlineStatus = (event: Event) => {
    if (!event.checkin_deadline) return null;
    const deadline = new Date(event.checkin_deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff < 0) return { text: 'Expired', color: 'text-red-600' };
    if (diff < 5 * 60 * 1000) return { text: `${Math.ceil(diff / 60000)}m left`, color: 'text-orange-600' };
    return { text: `${Math.ceil(diff / 60000)}m left`, color: 'text-green-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}/control`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Control
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Room</h1>
            <p className="text-gray-600">{competition?.name} - Check-in Management</p>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Events in Check-in</h3>
          <p className="text-gray-500 mb-4">
            Open check-in for events from the Control dashboard to start checking in athletes.
          </p>
          <Link
            href={`/dashboard/competitions/${competitionId}/control`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800"
          >
            Go to Control
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Event Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Check-in Events</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {events.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;
                  const deadlineStatus = getDeadlineStatus(event);
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{event.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        {event.scheduled_time && (
                          <span>
                            {new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {deadlineStatus && (
                          <span className={`font-medium ${deadlineStatus.color}`}>
                            {deadlineStatus.text}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {selectedEvent && (
              <>
                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                    <div className="text-2xl font-bold text-green-700">{stats.checkedIn}</div>
                    <div className="text-sm text-green-600">Checked In</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                    <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
                    <div className="text-sm text-yellow-600">Pending</div>
                  </div>
                  <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                    <div className="text-2xl font-bold text-red-700">{stats.scratched}</div>
                    <div className="text-sm text-red-600">Scratched</div>
                  </div>
                </div>

                {/* Quick BIB Check-in */}
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-blue-900 mb-1">
                        Quick Check-in by BIB
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={bibSearch}
                          onChange={(e) => setBibSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleBibCheckIn()}
                          placeholder="Enter BIB number..."
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={handleBibCheckIn}
                          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                        >
                          Check In
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, BIB, or club..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCheckInAll}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4" />
                      Check In All
                    </button>
                    <button
                      onClick={handleScratchNoShows}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700"
                    >
                      <UserX className="w-4 h-4" />
                      Scratch No-Shows
                    </button>
                  </div>
                </div>

                {/* Entries Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Status
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          BIB
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Athlete
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Club
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Heat/Lane
                        </th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No entries found
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => {
                          const statusConfig = STATUS_ICONS[entry.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.registered;
                          const StatusIcon = statusConfig.icon;
                          return (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                  <StatusIcon className="w-3.5 h-3.5" />
                                  {entry.status === 'checked_in' ? 'Checked In' : entry.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-lg">
                                {entry.bib_number || '-'}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {entry.athlete?.first_name} {entry.athlete?.last_name}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {entry.athlete?.club_name || '-'}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {entry.heat_number && entry.lane_or_position
                                  ? `H${entry.heat_number} / L${entry.lane_or_position}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {entry.status === 'registered' || entry.status === 'confirmed' ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleCheckIn(entry.id)}
                                      className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                                    >
                                      Check In
                                    </button>
                                    <button
                                      onClick={() => handleScratch(entry.id)}
                                      className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
                                    >
                                      Scratch
                                    </button>
                                  </div>
                                ) : entry.status === 'checked_in' ? (
                                  <button
                                    onClick={() => handleScratch(entry.id)}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm font-medium rounded hover:bg-gray-50"
                                  >
                                    Undo
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
