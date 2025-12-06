'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Building2, Clock } from 'lucide-react';

interface Athlete {
  athlete_id: string;
  first_name: string;
  last_name: string;
  club_name: string;
  bib_number: string | null;
  events: Array<{
    event_id: string;
    event_name: string;
    event_code: string;
    age_group: string;
    scheduled_time: string | null;
  }>;
}

interface Competition {
  id: string;
  name: string;
  date: string;
  venue: string;
}

interface ListsData {
  competition: Competition;
  athletes: Athlete[];
  byClub: Record<string, Athlete[]>;
}

function extractTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return '–';
  const timeMatch = dateTimeStr.match(/(\d{2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
  return '–';
}

export default function ClubScheduleListPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<ListsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

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

  const clubNames = Object.keys(data.byClub).sort((a, b) => a.localeCompare(b, 'nb'));
  const clubsToShow = selectedClub ? [selectedClub] : clubNames;

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
            <h1 className="text-2xl font-bold text-gray-900">Klubblister med tidsskjema</h1>
            <p className="text-gray-600 mt-1">
              Hver utøvers øvelser med klokkeslett
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedClub || ''}
              onChange={(e) => setSelectedClub(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle klubber</option>
              {clubNames.map((club) => (
                <option key={club} value={club}>
                  {club} ({data.byClub[club]?.length || 0})
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
          {selectedClub ? `Tidsskjema for ${selectedClub}` : 'Klubblister med tidsskjema'}
        </h2>
      </div>

      {/* Club Schedules */}
      <div className="space-y-8 print:space-y-6">
        {clubsToShow.map((clubName) => {
          const clubAthletes = data.byClub[clubName];
          if (!clubAthletes) return null;

          return (
            <div
              key={clubName}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-300 print:break-inside-avoid-page"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-500 print:hidden" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{clubName}</h3>
                    <p className="text-sm text-gray-500">
                      {clubAthletes.length} utøver{clubAthletes.length !== 1 ? 'e' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {clubAthletes.map((athlete) => (
                  <div
                    key={athlete.athlete_id}
                    className="border border-gray-200 rounded-lg overflow-hidden print:break-inside-avoid"
                  >
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="font-medium text-gray-900">
                        {athlete.bib_number && (
                          <span className="font-mono mr-2 text-blue-600">#{athlete.bib_number}</span>
                        )}
                        {athlete.last_name}, {athlete.first_name}
                      </div>
                      <span className="text-sm text-gray-500">
                        {athlete.events.length} øvelse{athlete.events.length !== 1 ? 'r' : ''}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {athlete.events.map((event, idx) => (
                        <div
                          key={`${event.event_id}-${idx}`}
                          className="px-3 py-2 flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-mono font-semibold text-gray-900 w-14">
                              {extractTime(event.scheduled_time)}
                            </span>
                            <span className="text-gray-700">
                              {event.event_code || event.event_name}
                            </span>
                          </div>
                          <span className="text-gray-500 text-xs">
                            {event.age_group}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
