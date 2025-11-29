'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { getEntriesByCompetition, deleteEntry, updateEntryStatus } from '@/lib/actions/entries';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';

type Entry = {
  id: string;
  bib_number: string | null;
  seed_mark: string | null;
  status: string;
  heat_number: number | null;
  lane_or_position: number | null;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
  } | null;
  event: {
    id: string;
    name: string;
    event_code: string;
  } | null;
};

type Event = {
  id: string;
  name: string;
  event_code: string;
};

type Competition = {
  id: string;
  name: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  registered: { label: 'Registered', color: 'bg-gray-100 text-gray-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  checked_in: { label: 'Checked In', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  DNS: { label: 'DNS', color: 'bg-orange-100 text-orange-700', icon: XCircle },
  scratched: { label: 'Scratched', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function EntriesListPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [entriesData, eventsData, compData] = await Promise.all([
        getEntriesByCompetition(competitionId),
        getEventsByCompetition(competitionId),
        getCompetition(competitionId),
      ]);
      setEntries(entriesData as Entry[]);
      setEvents(eventsData as Event[]);
      setCompetition(compData as Competition);
      setLoading(false);
    }
    loadData();
  }, [competitionId]);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchTerm === '' ||
      `${entry.athlete?.first_name} ${entry.athlete?.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      entry.bib_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.athlete?.club_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEvent = selectedEvent === 'all' || entry.event?.id === selectedEvent;
    const matchesStatus = selectedStatus === 'all' || entry.status === selectedStatus;

    return matchesSearch && matchesEvent && matchesStatus;
  });

  // Group entries by athlete for summary view
  const uniqueAthletes = new Map<string, { athlete: Entry['athlete']; bib: string | null; entryCount: number }>();
  entries.forEach((entry) => {
    if (entry.athlete) {
      const existing = uniqueAthletes.get(entry.athlete.id);
      if (existing) {
        existing.entryCount++;
      } else {
        uniqueAthletes.set(entry.athlete.id, {
          athlete: entry.athlete,
          bib: entry.bib_number,
          entryCount: 1,
        });
      }
    }
  });

  const handleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
    }
  };

  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleBulkStatusChange = async (status: 'registered' | 'confirmed' | 'checked_in' | 'DNS' | 'scratched') => {
    const promises = Array.from(selectedEntries).map((entryId) =>
      updateEntryStatus(entryId, status, competitionId)
    );
    await Promise.all(promises);
    // Reload entries
    const entriesData = await getEntriesByCompetition(competitionId);
    setEntries(entriesData as Entry[]);
    setSelectedEntries(new Set());
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedEntries.size} entries? This cannot be undone.`)) return;

    const promises = Array.from(selectedEntries).map((entryId) =>
      deleteEntry(entryId, competitionId)
    );
    await Promise.all(promises);
    // Reload entries
    const entriesData = await getEntriesByCompetition(competitionId);
    setEntries(entriesData as Entry[]);
    setSelectedEntries(new Set());
  };

  const exportToCSV = () => {
    const headers = ['BIB', 'First Name', 'Last Name', 'Club', 'Event', 'Seed Mark', 'Status', 'Heat', 'Lane'];
    const rows = filteredEntries.map((entry) => [
      entry.bib_number || '',
      entry.athlete?.first_name || '',
      entry.athlete?.last_name || '',
      entry.athlete?.club_name || '',
      entry.event?.name || '',
      entry.seed_mark || '',
      entry.status,
      entry.heat_number || '',
      entry.lane_or_position || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-${competition?.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competition
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Entries</h1>
            <p className="text-gray-600">
              {competition?.name} - {entries.length} entries, {uniqueAthletes.size} athletes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <Link
              href={`/dashboard/competitions/${competitionId}/entries/import`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import Entries
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = entries.filter((e) => e.status === status).length;
          const Icon = config.icon;
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
              className={`bg-white rounded-lg border p-4 text-left transition-all ${
                selectedStatus === status ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                <span className="text-sm font-medium text-gray-600">{config.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, BIB, or club..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedEntries.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedEntries.size} entries selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('checked_in')}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
            >
              Check In
            </button>
            <button
              onClick={() => handleBulkStatusChange('DNS')}
              className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700"
            >
              Mark DNS
            </button>
            <button
              onClick={() => handleBulkStatusChange('scratched')}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
            >
              Scratch
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
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
                  Event
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                  Seed Mark
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                  Heat/Lane
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                  Status
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No entries found</p>
                    <p className="text-sm">Try adjusting your filters or add entries to events</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const statusConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.registered;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => handleSelectEntry(entry.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">
                        {entry.bib_number || '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {entry.athlete
                          ? `${entry.athlete.first_name} ${entry.athlete.last_name}`
                          : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {entry.athlete?.club_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/competitions/${competitionId}/events/${entry.event?.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {entry.event?.name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">
                        {entry.seed_mark || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.heat_number && entry.lane_or_position
                          ? `H${entry.heat_number} / L${entry.lane_or_position}`
                          : entry.heat_number
                          ? `Heat ${entry.heat_number}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/competitions/${competitionId}/entries/${entry.id}/edit`}
                          className="p-1 hover:bg-gray-100 rounded inline-flex"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredEntries.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Showing {filteredEntries.length} of {entries.length} entries
          </div>
        )}
      </div>
    </div>
  );
}
