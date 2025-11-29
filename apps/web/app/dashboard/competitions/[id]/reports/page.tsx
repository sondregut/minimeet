'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Download,
  Printer,
  Users,
  Trophy,
  ClipboardList,
  Timer,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntriesByCompetition } from '@/lib/actions/entries';

type Event = {
  id: string;
  name: string;
  event_code: string;
  event_type: string;
  status: string;
  scheduled_time: string | null;
};

type Entry = {
  id: string;
  bib_number: string | null;
  status: string;
  athlete: { id: string; first_name: string; last_name: string; club_name: string | null } | null;
  event: { id: string; name: string } | null;
};

export default function ReportsPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<{ name: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [compData, eventsData, entriesData] = await Promise.all([
        getCompetition(competitionId),
        getEventsByCompetition(competitionId),
        getEntriesByCompetition(competitionId),
      ]);
      setCompetition(compData);
      setEvents(eventsData as Event[]);
      setEntries(entriesData as Entry[]);
      setLoading(false);
    }
    loadData();
  }, [competitionId]);

  // Export functions
  const exportStartListCSV = () => {
    const filteredEntries = selectedEvent === 'all'
      ? entries
      : entries.filter(e => e.event?.id === selectedEvent);

    const headers = ['BIB', 'First Name', 'Last Name', 'Club', 'Event', 'Status'];
    const rows = filteredEntries.map(entry => [
      entry.bib_number || '',
      entry.athlete?.first_name || '',
      entry.athlete?.last_name || '',
      entry.athlete?.club_name || '',
      entry.event?.name || '',
      entry.status,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `startlist-${competition?.name || 'export'}.csv`, 'text/csv');
  };

  const exportAthletesCSV = () => {
    // Get unique athletes
    const athleteMap = new Map<string, Entry['athlete'] & { events: string[] }>();
    entries.forEach(entry => {
      if (entry.athlete) {
        const existing = athleteMap.get(entry.athlete.id);
        if (existing) {
          existing.events.push(entry.event?.name || '');
        } else {
          athleteMap.set(entry.athlete.id, {
            ...entry.athlete,
            events: [entry.event?.name || ''],
          });
        }
      }
    });

    const athletes = Array.from(athleteMap.values());
    const headers = ['First Name', 'Last Name', 'Club', 'Events'];
    const rows = athletes.map(a => [
      a.first_name,
      a.last_name,
      a.club_name || '',
      a.events.join('; '),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    downloadFile(csv, `athletes-${competition?.name || 'export'}.csv`, 'text/csv');
  };

  const exportEventsCSV = () => {
    const headers = ['Event', 'Code', 'Type', 'Status', 'Scheduled Time', 'Entries'];
    const rows = events.map(event => {
      const entryCount = entries.filter(e => e.event?.id === event.id).length;
      return [
        event.name,
        event.event_code,
        event.event_type,
        event.status,
        event.scheduled_time ? new Date(event.scheduled_time).toLocaleString() : '',
        entryCount.toString(),
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `events-${competition?.name || 'export'}.csv`, 'text/csv');
  };

  const exportJSON = () => {
    const data = {
      competition: competition,
      events: events.map(event => ({
        ...event,
        entries: entries.filter(e => e.event?.id === event.id).map(e => ({
          bib_number: e.bib_number,
          status: e.status,
          athlete: e.athlete,
        })),
      })),
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `competition-${competition?.name || 'export'}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/[^a-z0-9.-]/gi, '_');
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

  const uniqueAthletes = new Set(entries.map(e => e.athlete?.id).filter(Boolean)).size;

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Exports</h1>
            <p className="text-gray-600">{competition?.name}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              <p className="text-sm text-gray-500">Events</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{uniqueAthletes}</p>
              <p className="text-sm text-gray-500">Athletes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
              <p className="text-sm text-gray-500">Entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Reports */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Reports
          </h2>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Event
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start List Print */}
            <Link
              href={selectedEvent === 'all'
                ? `/dashboard/competitions/${competitionId}/reports/startlist`
                : `/dashboard/competitions/${competitionId}/events/${selectedEvent}/startlist`
              }
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Start Lists</h3>
                <p className="text-sm text-gray-500">Print start lists with athlete names, bibs, and lanes</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </Link>

            {/* Results Print */}
            <Link
              href={`/dashboard/competitions/${competitionId}/reports/results`}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Results</h3>
                <p className="text-sm text-gray-500">Print official results with places, times, and records</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </Link>

            {/* Schedule Print */}
            <Link
              href={`/dashboard/competitions/${competitionId}/reports/schedule`}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Timer className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Schedule</h3>
                <p className="text-sm text-gray-500">Print competition schedule with times and locations</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </Link>
          </div>
        </div>
      </div>

      {/* Data Exports */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data Exports
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={exportStartListCSV}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Start List CSV</h3>
                <p className="text-sm text-gray-500">Export all entries with BIB, athlete, club, event</p>
              </div>
            </button>

            <button
              onClick={exportAthletesCSV}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Athletes CSV</h3>
                <p className="text-sm text-gray-500">Export unique athletes with their events</p>
              </div>
            </button>

            <button
              onClick={exportEventsCSV}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Events CSV</h3>
                <p className="text-sm text-gray-500">Export all events with status and entry counts</p>
              </div>
            </button>

            <button
              onClick={exportJSON}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Full JSON Export</h3>
                <p className="text-sm text-gray-500">Export complete competition data as JSON</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Public Links */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Public Pages
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={`/results/${competitionId}`}
              target="_blank"
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Live Results Page</h3>
                <p className="text-sm text-gray-500">Public live results for spectators</p>
                <p className="text-xs text-blue-600 mt-1">/results/{competitionId}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </Link>

            <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-500">Embeddable Scoreboard</h3>
                <p className="text-sm text-gray-400">Coming soon - embed live results on your website</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
