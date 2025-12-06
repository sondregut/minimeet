'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Users, Check, Clock } from 'lucide-react';

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

function extractTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return '';
  const timeMatch = dateTimeStr.match(/(\d{2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
  return '';
}

// Check-in sheet component
function CheckInSheet({ event, athletes, competition }: { event: Event; athletes: EventEntry[]; competition: Competition }) {
  const time = extractTime(event.scheduled_time);

  return (
    <div className="print:break-before-page mb-8">
      {/* Header - always visible on print */}
      <div className="border-b-2 border-black pb-3 mb-4 print:pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold print:text-lg">
              {event.event_code || event.name} - {normalizeAgeGroup(event.age_group, event.gender)}
            </h2>
            <p className="text-sm text-gray-600">{event.name}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{competition.name}</p>
            <p>{new Date(competition.date).toLocaleDateString('nb-NO')}</p>
            {time && <p className="font-mono font-semibold">Kl. {time}</p>}
          </div>
        </div>
      </div>

      {/* Check-in table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 print:bg-gray-200">
            <th className="border border-gray-400 p-2 text-left w-16">Nr</th>
            <th className="border border-gray-400 p-2 text-left">Navn</th>
            <th className="border border-gray-400 p-2 text-left w-40">Klubb</th>
            <th className="border border-gray-400 p-2 text-center w-24">Årsbeste</th>
            <th className="border border-gray-400 p-2 text-center w-16">Sign.</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((athlete, idx) => (
            <tr key={athlete.athlete_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-400 p-2 font-mono font-bold">
                {athlete.bib_number || '–'}
              </td>
              <td className="border border-gray-400 p-2 font-medium">
                {athlete.last_name}, {athlete.first_name}
              </td>
              <td className="border border-gray-400 p-2 text-gray-600">
                {athlete.club_name}
              </td>
              <td className="border border-gray-400 p-2">
                {/* Empty cell for PB - to be filled in manually or later auto-populated */}
                <div className="h-6 border-b border-dashed border-gray-300"></div>
              </td>
              <td className="border border-gray-400 p-2">
                {/* Empty cell for signature/initials */}
                <div className="h-6 w-full"></div>
              </td>
            </tr>
          ))}
          {/* Extra empty rows for late entries */}
          {[1, 2, 3].map((i) => (
            <tr key={`empty-${i}`} className={athletes.length % 2 === i % 2 ? 'bg-gray-50' : 'bg-white'}>
              <td className="border border-gray-400 p-2"><div className="h-6"></div></td>
              <td className="border border-gray-400 p-2"><div className="h-6"></div></td>
              <td className="border border-gray-400 p-2"><div className="h-6"></div></td>
              <td className="border border-gray-400 p-2"><div className="h-6 border-b border-dashed border-gray-300"></div></td>
              <td className="border border-gray-400 p-2"><div className="h-6"></div></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer info */}
      <div className="mt-3 text-xs text-gray-500 print:text-gray-600">
        <p>Kryss av med initialer når du møter opp. Skriv inn årsbeste (SB) om du har.</p>
      </div>
    </div>
  );
}

export default function CheckInListsPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<ListsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

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

  const toggleEvent = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const selectAllEvents = () => {
    if (!data) return;
    const eventsWithParticipants = data.events.filter(e => (data.byEvent[e.id]?.length || 0) > 0);
    setSelectedEvents(new Set(eventsWithParticipants.map(e => e.id)));
  };

  const selectedEventsList = data?.events.filter(e => selectedEvents.has(e.id)) || [];

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
    (e) => (data.byEvent[e.id]?.length || 0) > 0
  );

  if (showPreview) {
    return (
      <div className="space-y-6">
        {/* Header - Hidden when printing */}
        <div className="print:hidden">
          <button
            onClick={() => setShowPreview(false)}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til valg
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Avkrysningslister</h1>
              <p className="text-gray-600 mt-1">
                {selectedEventsList.length} øvelse{selectedEventsList.length !== 1 ? 'r' : ''} valgt
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

        {/* Print sheets */}
        <div className="bg-white p-6 print:p-0">
          {selectedEventsList.map((event) => {
            const athletes = data.byEvent[event.id] || [];
            return <CheckInSheet key={event.id} event={event} athletes={athletes} competition={data.competition} />;
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-bold text-gray-900">Avkrysningslister</h1>
            <p className="text-gray-600 mt-1">
              Velg øvelser for å lage avkrysningslister til oppheng
            </p>
          </div>
        </div>
      </div>

      {/* Event selection */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Velg øvelser</h3>
          <div className="flex gap-2">
            <button
              onClick={selectAllEvents}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Velg alle
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setSelectedEvents(new Set())}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Fjern alle
            </button>
          </div>
        </div>

        <div className="p-4">
          {eventsWithParticipants.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Ingen øvelser med påmeldte utøvere funnet
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {eventsWithParticipants.map((event) => {
                const isSelected = selectedEvents.has(event.id);
                const athleteCount = data.byEvent[event.id]?.length || 0;
                const time = extractTime(event.scheduled_time);

                return (
                  <button
                    key={event.id}
                    onClick={() => toggleEvent(event.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {event.event_code || event.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {normalizeAgeGroup(event.age_group, event.gender)} · {athleteCount} deltaker{athleteCount !== 1 ? 'e' : ''}
                      </p>
                      {time && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action button */}
      {selectedEvents.size > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Users className="w-5 h-5" />
            Generer avkrysningslister ({selectedEvents.size} øvelse{selectedEvents.size !== 1 ? 'r' : ''})
          </button>
        </div>
      )}

      {/* Info section */}
      <div className="bg-teal-50 rounded-lg border border-teal-200 p-4">
        <h4 className="font-semibold text-teal-900 mb-2">Om avkrysningslister</h4>
        <ul className="text-sm text-teal-800 space-y-1">
          <li>• Listene henges opp slik at utøverne kan krysse av oppmøte</li>
          <li>• Utøverne skriver inn årsbeste (SB) ved siden av navnet sitt</li>
          <li>• Senere vil årsbeste kunne hentes automatisk fra påmelding og statistikk</li>
          <li>• Elektronisk avkryssing kommer i en fremtidig versjon</li>
        </ul>
      </div>
    </div>
  );
}
