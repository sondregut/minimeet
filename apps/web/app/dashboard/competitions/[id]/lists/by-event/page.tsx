'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Users } from 'lucide-react';

interface EventEntry {
  athlete_id: string;
  first_name: string;
  last_name: string;
  club_name: string;
  bib_number: string | null;
  age_group: string;
}

interface Event {
  id: string;
  name: string;
  event_code: string;
  event_type: string;
  gender: string;
  age_group: string;
  scheduled_time: string | null;
  sort_order: number;
}

interface Competition {
  id: string;
  name: string;
  date: string;
  venue: string;
}

interface ListsData {
  competition: Competition;
  events: Event[];
  byEvent: Record<string, EventEntry[]>;
}

function extractTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return '';
  const timeMatch = dateTimeStr.match(/(\d{2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
  return '';
}

export default function ByEventListPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<ListsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/competitions/${competitionId}/lists-data`);
        if (!res.ok) throw new Error('Kunne ikke laste data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Kunne ikke laste data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [competitionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-600">
        {error || 'En feil oppstod'}
      </div>
    );
  }

  // Filter events with participants
  const eventsWithParticipants = data.events.filter(
    (e) => data.byEvent[e.id]?.length > 0
  );

  // Group events to display
  const eventsToShow = selectedEvent
    ? data.events.filter((e) => e.id === selectedEvent)
    : eventsWithParticipants;

  const totalEntries = eventsWithParticipants.reduce(
    (sum, e) => sum + (data.byEvent[e.id]?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header - Hidden when printing */}
      <div className="print:hidden">
        <Link
          href={`/dashboard/competitions/${competitionId}/lists`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til lister
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Øvelseslister</h1>
            <p className="text-gray-600 mt-1">
              {totalEntries} påmeldinger i {eventsWithParticipants.length} øvelser
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedEvent || ''}
              onChange={(e) => setSelectedEvent(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle øvelser</option>
              {eventsWithParticipants.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({data.byEvent[event.id]?.length || 0})
                </option>
              ))}
            </select>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Skriv ut
            </button>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">{data.competition.name}</h1>
        <p className="text-sm text-gray-600">
          {new Date(data.competition.date).toLocaleDateString('nb-NO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {data.competition.venue && ` • ${data.competition.venue}`}
        </p>
        <h2 className="text-lg font-semibold mt-2">Startlister</h2>
      </div>

      {/* Event Lists */}
      <div className="space-y-6 print:space-y-4">
        {eventsToShow.map((event) => {
          const entries = data.byEvent[event.id] || [];
          if (entries.length === 0) return null;

          const time = extractTime(event.scheduled_time);

          return (
            <div
              key={event.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-300 print:break-inside-avoid"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500 print:hidden" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-500">
                        {event.age_group} • {entries.length} deltaker{entries.length !== 1 ? 'e' : ''}
                      </p>
                    </div>
                  </div>
                  {time && (
                    <span className="text-lg font-mono font-semibold text-gray-900">
                      {time}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 print:bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700 w-20">
                        Startnr
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">
                        Navn
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">
                        Klubb
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((entry, idx) => (
                      <tr key={`${entry.athlete_id}-${idx}`} className="hover:bg-gray-50 print:hover:bg-transparent">
                        <td className="px-4 py-2 font-mono font-semibold text-gray-900">
                          {entry.bib_number || '–'}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {entry.last_name}, {entry.first_name}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {entry.club_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
