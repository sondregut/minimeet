'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Clock } from 'lucide-react';

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

function normalizeAgeGroup(ageGroup: string, gender: string): string {
  const lower = ageGroup.toLowerCase();
  if (lower.includes('senior')) {
    return gender === 'M' ? 'MS' : gender === 'F' ? 'KS' : 'Senior';
  }
  if (lower.includes('junior') || lower.includes('u20') || lower.includes('u23')) {
    return gender === 'M' ? 'MJ' : gender === 'F' ? 'KJ' : 'Junior';
  }
  const match = lower.match(/(\d+)\s*år/);
  if (match) {
    const prefix = gender === 'M' ? 'G' : gender === 'F' ? 'J' : '';
    return `${prefix}${match[1]}`;
  }
  return ageGroup;
}

export default function ScheduleByEventPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<ListsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Sort events chronologically
  const sortedEvents = useMemo(() => {
    if (!data) return [];

    return [...data.events]
      .filter(e => (data.byEvent[e.id]?.length || 0) > 0)
      .sort((a, b) => {
        // Events with time first
        if (a.scheduled_time && !b.scheduled_time) return -1;
        if (!a.scheduled_time && b.scheduled_time) return 1;
        if (a.scheduled_time && b.scheduled_time) {
          return a.scheduled_time.localeCompare(b.scheduled_time);
        }
        return a.sort_order - b.sort_order;
      });
  }, [data]);

  // Group events by time slot (hour)
  const eventsByTimeSlot = useMemo(() => {
    const grouped: Record<string, Event[]> = { 'Ikke satt': [] };

    for (const event of sortedEvents) {
      const time = extractTime(event.scheduled_time);
      if (!time) {
        grouped['Ikke satt'].push(event);
      } else {
        const hour = time.substring(0, 2) + ':00';
        if (!grouped[hour]) {
          grouped[hour] = [];
        }
        grouped[hour].push(event);
      }
    }

    // Remove empty 'Ikke satt' if no events
    if (grouped['Ikke satt'].length === 0) {
      delete grouped['Ikke satt'];
    }

    return grouped;
  }, [sortedEvents]);

  const timeSlots = Object.keys(eventsByTimeSlot).sort((a, b) => {
    if (a === 'Ikke satt') return 1;
    if (b === 'Ikke satt') return -1;
    return a.localeCompare(b);
  });

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
            <h1 className="text-2xl font-bold text-gray-900">Tidsskjema etter øvelse</h1>
            <p className="text-gray-600 mt-1">
              Kronologisk oversikt over alle øvelser
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Skriv ut
          </button>
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
        <h2 className="text-lg font-semibold mt-2">Tidsskjema</h2>
      </div>

      {/* Timeline View */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 print:bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-20">
                  Tid
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Øvelse
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-24">
                  Klasse
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 w-24">
                  Deltakere
                </th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((timeSlot, slotIdx) => {
                const events = eventsByTimeSlot[timeSlot];

                return events.map((event, eventIdx) => {
                  const time = extractTime(event.scheduled_time);
                  const entryCount = data.byEvent[event.id]?.length || 0;
                  const normalizedAge = normalizeAgeGroup(event.age_group, event.gender);
                  const isFirstInSlot = eventIdx === 0;

                  return (
                    <tr
                      key={event.id}
                      className={`hover:bg-gray-50 print:hover:bg-transparent ${
                        isFirstInSlot && slotIdx > 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                        {time || '–'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {event.event_code || event.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {normalizedAge}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {entryCount}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 print:mt-4">
        <h3 className="font-semibold text-gray-900 mb-2">Sammendrag</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Antall øvelser:</span>
            <span className="ml-2 font-semibold">{sortedEvents.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Totalt påmeldinger:</span>
            <span className="ml-2 font-semibold">
              {sortedEvents.reduce((sum, e) => sum + (data.byEvent[e.id]?.length || 0), 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
