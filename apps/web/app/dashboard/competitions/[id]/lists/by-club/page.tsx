'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Building2 } from 'lucide-react';

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

export default function ByClubListPage() {
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
  const totalAthletes = data.athletes.length;

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
            <h1 className="text-2xl font-bold text-gray-900">Klubbvise lister</h1>
            <p className="text-gray-600 mt-1">
              {totalAthletes} utøvere fra {clubNames.length} klubber
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
        <h2 className="text-lg font-semibold mt-2">Klubbvise påmeldingslister</h2>
      </div>

      {/* Club Lists */}
      <div className="space-y-6 print:space-y-4">
        {clubNames.map((clubName) => {
          const clubAthletes = data.byClub[clubName];

          return (
            <div
              key={clubName}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-300 print:break-inside-avoid"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-500 print:hidden" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{clubName}</h3>
                    <p className="text-sm text-gray-500">
                      {clubAthletes.length} utøver{clubAthletes.length !== 1 ? 'e' : ''}
                    </p>
                  </div>
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
                        Øvelser
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clubAthletes.map((athlete) => (
                      <tr key={athlete.athlete_id} className="hover:bg-gray-50 print:hover:bg-transparent">
                        <td className="px-4 py-2 font-mono font-semibold text-gray-900">
                          {athlete.bib_number || '–'}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {athlete.last_name}, {athlete.first_name}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {athlete.events.map((e) => e.event_code || e.event_name).join(', ')}
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

      {/* Summary - Hidden when printing on separate page */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 print:mt-4">
        <h3 className="font-semibold text-gray-900 mb-2">Sammendrag</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Totalt utøvere:</span>
            <span className="ml-2 font-semibold">{totalAthletes}</span>
          </div>
          <div>
            <span className="text-gray-500">Antall klubber:</span>
            <span className="ml-2 font-semibold">{clubNames.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
