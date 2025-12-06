'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Users, Clock } from 'lucide-react';

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

export default function ScheduleByAgePage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<ListsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);

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

  // Group events by age group
  const eventsByAge = useMemo(() => {
    if (!data) return {};

    const grouped: Record<string, Event[]> = {};

    for (const event of data.events) {
      const normalizedAge = normalizeAgeGroup(event.age_group, event.gender);
      if (!grouped[normalizedAge]) {
        grouped[normalizedAge] = [];
      }
      grouped[normalizedAge].push(event);
    }

    // Sort events within each group by time
    for (const age of Object.keys(grouped)) {
      grouped[age].sort((a, b) => {
        if (!a.scheduled_time && !b.scheduled_time) return a.sort_order - b.sort_order;
        if (!a.scheduled_time) return 1;
        if (!b.scheduled_time) return -1;
        return a.scheduled_time.localeCompare(b.scheduled_time);
      });
    }

    return grouped;
  }, [data]);

  // Sort age groups
  const sortedAgeGroups = useMemo(() => {
    return Object.keys(eventsByAge).sort((a, b) => {
      const aIsBoy = a.startsWith('G') || a.startsWith('M');
      const bIsBoy = b.startsWith('G') || b.startsWith('M');
      if (aIsBoy && !bIsBoy) return -1;
      if (!aIsBoy && bIsBoy) return 1;

      const aNum = parseInt(a.replace(/\D/g, '')) || (a.includes('J') || a.includes('M') ? 18 : 99);
      const bNum = parseInt(b.replace(/\D/g, '')) || (b.includes('J') || b.includes('M') ? 18 : 99);
      return aNum - bNum;
    });
  }, [eventsByAge]);

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

  const ageGroupsToShow = selectedAgeGroup ? [selectedAgeGroup] : sortedAgeGroups;

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
            <h1 className="text-2xl font-bold text-gray-900">Tidsskjema etter aldersgruppe</h1>
            <p className="text-gray-600 mt-1">
              Alle øvelser gruppert på aldersklasse
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedAgeGroup || ''}
              onChange={(e) => setSelectedAgeGroup(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle aldersgrupper</option>
              {sortedAgeGroups.map((age) => (
                <option key={age} value={age}>
                  {age} ({eventsByAge[age]?.length || 0} øvelser)
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
        <h2 className="text-lg font-semibold mt-2">
          {selectedAgeGroup ? `Tidsskjema ${selectedAgeGroup}` : 'Tidsskjema etter aldersgruppe'}
        </h2>
      </div>

      {/* Age Group Schedules */}
      <div className="space-y-6 print:space-y-4">
        {ageGroupsToShow.map((ageGroup) => {
          const events = eventsByAge[ageGroup] || [];
          const eventsWithParticipants = events.filter(e => (data.byEvent[e.id]?.length || 0) > 0);

          if (eventsWithParticipants.length === 0) return null;

          return (
            <div
              key={ageGroup}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-300 print:break-inside-avoid"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-500 print:hidden" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{ageGroup}</h3>
                    <p className="text-sm text-gray-500">
                      {eventsWithParticipants.length} øvelse{eventsWithParticipants.length !== 1 ? 'r' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 print:bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700 w-20">
                        Tid
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">
                        Øvelse
                      </th>
                      <th className="text-center px-4 py-2 font-semibold text-gray-700 w-24">
                        Deltakere
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eventsWithParticipants.map((event) => {
                      const time = extractTime(event.scheduled_time);
                      const entryCount = data.byEvent[event.id]?.length || 0;

                      return (
                        <tr key={event.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                          <td className="px-4 py-2 font-mono font-semibold text-gray-900">
                            {time || '–'}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-900">
                            {event.event_code || event.name}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {entryCount}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
