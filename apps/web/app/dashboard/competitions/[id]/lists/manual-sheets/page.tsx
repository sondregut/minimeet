'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, FileText, Check } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  event_code: string;
  event_type: string;
  gender: string;
  age_group: string;
  scheduled_time: string | null;
}

interface Athlete {
  athlete_id: string;
  first_name: string;
  last_name: string;
  club_name: string;
  bib_number: string | null;
  age_group: string;
}

interface Competition {
  id: string;
  name: string;
  date: string;
  venue: string;
  settings?: {
    venue_type?: 'indoor' | 'outdoor';
    [key: string]: any;
  };
}

interface ListsData {
  competition: Competition;
  events: Event[];
  byEvent: Record<string, Athlete[]>;
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

// Horizontal jump sheet (long jump, triple jump)
function HorizontalJumpSheet({ event, athletes, competition, isIndoor }: { event: Event; athletes: Athlete[]; competition: Competition; isIndoor: boolean }) {
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
            {event.scheduled_time && <p>Kl. {extractTime(event.scheduled_time)}</p>}
          </div>
        </div>
      </div>

      {/* Athletes */}
      {athletes.map((athlete, idx) => (
        <div key={athlete.athlete_id} className="mb-6 print:break-inside-avoid border border-gray-300 p-3">
          {/* Athlete info row */}
          <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-2">
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-lg w-10">{athlete.bib_number || '–'}</span>
              <span className="font-semibold">{athlete.last_name}, {athlete.first_name}</span>
              <span className="text-gray-600">{athlete.club_name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Plass:</span>
              <div className="w-12 h-8 border border-gray-400"></div>
            </div>
          </div>

          {/* Attempts table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 w-16">Forsøk</th>
                <th className="text-center py-1">1</th>
                <th className="text-center py-1">2</th>
                <th className="text-center py-1">3</th>
                <th className="text-center py-1">4</th>
                <th className="text-center py-1">5</th>
                <th className="text-center py-1">6</th>
                <th className="text-center py-1 w-20">Beste</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 text-gray-600">Lengde</td>
                <td className="text-center"><div className={`${isIndoor ? 'h-10' : 'h-8'} border border-gray-300 mx-1`}></div></td>
                <td className="text-center"><div className={`${isIndoor ? 'h-10' : 'h-8'} border border-gray-300 mx-1`}></div></td>
                <td className="text-center"><div className={`${isIndoor ? 'h-10' : 'h-8'} border border-gray-300 mx-1`}></div></td>
                <td className="text-center"><div className={`${isIndoor ? 'h-10' : 'h-8'} border border-gray-300 mx-1`}></div></td>
                <td className="text-center"><div className={`${isIndoor ? 'h-10' : 'h-8'} border border-gray-300 mx-1`}></div></td>
                <td className="text-center"><div className={`${isIndoor ? 'h-10' : 'h-8'} border border-gray-300 mx-1`}></div></td>
                <td className="text-center" rowSpan={isIndoor ? 1 : 2}><div className={`${isIndoor ? 'h-10' : 'h-16'} border-2 border-gray-400 mx-1`}></div></td>
              </tr>
              {!isIndoor && (
                <tr>
                  <td className="py-1 text-gray-600">Vind</td>
                  <td className="text-center"><div className="h-6 border border-gray-200 mx-1 bg-gray-50"></div></td>
                  <td className="text-center"><div className="h-6 border border-gray-200 mx-1 bg-gray-50"></div></td>
                  <td className="text-center"><div className="h-6 border border-gray-200 mx-1 bg-gray-50"></div></td>
                  <td className="text-center"><div className="h-6 border border-gray-200 mx-1 bg-gray-50"></div></td>
                  <td className="text-center"><div className="h-6 border border-gray-200 mx-1 bg-gray-50"></div></td>
                  <td className="text-center"><div className="h-6 border border-gray-200 mx-1 bg-gray-50"></div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// Throw sheet (shot put, discus, javelin, hammer)
function ThrowSheet({ event, athletes, competition }: { event: Event; athletes: Athlete[]; competition: Competition }) {
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
            {event.scheduled_time && <p>Kl. {extractTime(event.scheduled_time)}</p>}
          </div>
        </div>
      </div>

      {/* Athletes */}
      {athletes.map((athlete, idx) => (
        <div key={athlete.athlete_id} className="mb-5 print:break-inside-avoid border border-gray-300 p-3">
          {/* Athlete info row */}
          <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-2">
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-lg w-10">{athlete.bib_number || '–'}</span>
              <span className="font-semibold">{athlete.last_name}, {athlete.first_name}</span>
              <span className="text-gray-600">{athlete.club_name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Plass:</span>
              <div className="w-12 h-8 border border-gray-400"></div>
            </div>
          </div>

          {/* Attempts table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 w-16">Forsøk</th>
                <th className="text-center py-1">1</th>
                <th className="text-center py-1">2</th>
                <th className="text-center py-1">3</th>
                <th className="text-center py-1">4</th>
                <th className="text-center py-1">5</th>
                <th className="text-center py-1">6</th>
                <th className="text-center py-1 w-20">Beste</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 text-gray-600">Lengde</td>
                <td className="text-center"><div className="h-10 border border-gray-300 mx-1"></div></td>
                <td className="text-center"><div className="h-10 border border-gray-300 mx-1"></div></td>
                <td className="text-center"><div className="h-10 border border-gray-300 mx-1"></div></td>
                <td className="text-center"><div className="h-10 border border-gray-300 mx-1"></div></td>
                <td className="text-center"><div className="h-10 border border-gray-300 mx-1"></div></td>
                <td className="text-center"><div className="h-10 border border-gray-300 mx-1"></div></td>
                <td className="text-center"><div className="h-10 border-2 border-gray-400 mx-1"></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// Vertical jump sheet (high jump, pole vault)
function VerticalJumpSheet({ event, athletes, competition }: { event: Event; athletes: Athlete[]; competition: Competition }) {
  // Generate height columns (empty, to be filled in)
  const heightColumns = 12;

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
            {event.scheduled_time && <p>Kl. {extractTime(event.scheduled_time)}</p>}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-600 mb-3 flex gap-4">
        <span><strong>O</strong> = klart</span>
        <span><strong>X</strong> = riv</span>
        <span><strong>-</strong> = står over</span>
        <span><strong>R</strong> = gir seg</span>
      </div>

      {/* Results table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-400 p-1 text-left w-10">Nr</th>
            <th className="border border-gray-400 p-1 text-left w-40">Navn</th>
            <th className="border border-gray-400 p-1 text-left w-32">Klubb</th>
            {Array.from({ length: heightColumns }).map((_, i) => (
              <th key={i} className="border border-gray-400 p-1 text-center w-10">
                <div className="h-6 border-b border-gray-300"></div>
              </th>
            ))}
            <th className="border border-gray-400 p-1 text-center w-14">Res.</th>
            <th className="border border-gray-400 p-1 text-center w-10">Pl.</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((athlete) => (
            <tr key={athlete.athlete_id}>
              <td className="border border-gray-400 p-1 font-mono font-bold">{athlete.bib_number || '–'}</td>
              <td className="border border-gray-400 p-1 text-xs">{athlete.last_name}, {athlete.first_name}</td>
              <td className="border border-gray-400 p-1 text-xs">{athlete.club_name}</td>
              {Array.from({ length: heightColumns }).map((_, i) => (
                <td key={i} className="border border-gray-400 p-1">
                  <div className="h-8"></div>
                </td>
              ))}
              <td className="border border-gray-400 p-1"><div className="h-8"></div></td>
              <td className="border border-gray-400 p-1"><div className="h-8"></div></td>
            </tr>
          ))}
          {/* Extra empty rows for late entries */}
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <tr key={`empty-${rowIdx}`}>
              <td className="border border-gray-400 p-1"><div className="h-8"></div></td>
              <td className="border border-gray-400 p-1"><div className="h-8"></div></td>
              <td className="border border-gray-400 p-1"><div className="h-8"></div></td>
              {Array.from({ length: heightColumns }).map((_, i) => (
                <td key={i} className="border border-gray-400 p-1"><div className="h-8"></div></td>
              ))}
              <td className="border border-gray-400 p-1"><div className="h-8"></div></td>
              <td className="border border-gray-400 p-1"><div className="h-8"></div></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes section */}
      <div className="mt-4 border border-gray-300 p-2">
        <p className="text-xs text-gray-500 mb-1">Notater / Starthøyde:</p>
        <div className="h-16"></div>
      </div>
    </div>
  );
}

export default function ManualSheetsPage() {
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

  const selectAllFieldEvents = () => {
    if (!data) return;
    const fieldEvents = data.events.filter(e =>
      e.event_type === 'field_horizontal' ||
      e.event_type === 'field_vertical' ||
      e.event_type === 'throw'
    );
    setSelectedEvents(new Set(fieldEvents.map(e => e.id)));
  };

  const getEventType = (event: Event): 'horizontal' | 'throw' | 'vertical' => {
    if (event.event_type === 'field_vertical') return 'vertical';
    if (event.event_type === 'throw') return 'throw';
    return 'horizontal'; // field_horizontal
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

  // Filter to only show field events
  const fieldEvents = data.events.filter(e =>
    e.event_type === 'field_horizontal' ||
    e.event_type === 'field_vertical' ||
    e.event_type === 'throw'
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
              <h1 className="text-2xl font-bold text-gray-900">Manuelle resultatskjemaer</h1>
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
            const eventType = getEventType(event);
            const isIndoor = data.competition.settings?.venue_type === 'indoor';

            if (eventType === 'vertical') {
              return <VerticalJumpSheet key={event.id} event={event} athletes={athletes} competition={data.competition} />;
            } else if (eventType === 'throw') {
              return <ThrowSheet key={event.id} event={event} athletes={athletes} competition={data.competition} />;
            } else {
              return <HorizontalJumpSheet key={event.id} event={event} athletes={athletes} competition={data.competition} isIndoor={isIndoor} />;
            }
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
            <h1 className="text-2xl font-bold text-gray-900">Manuelle resultatskjemaer</h1>
            <p className="text-gray-600 mt-1">
              Velg øvelser for å lage utskriftsvennlige resultatskjemaer for manuell føring
            </p>
          </div>
        </div>
      </div>

      {/* Event selection */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Velg øvelser</h3>
            {data.competition.settings?.venue_type === 'indoor' && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                Innendørs (uten vind)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAllFieldEvents}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Velg alle tekniske
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
          {fieldEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Ingen tekniske øvelser funnet i denne konkurransen
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {fieldEvents.map((event) => {
                const isSelected = selectedEvents.has(event.id);
                const athleteCount = data.byEvent[event.id]?.length || 0;
                const eventType = getEventType(event);
                const typeLabel = eventType === 'vertical' ? 'Høyde' : eventType === 'throw' ? 'Kast' : 'Lengde';

                return (
                  <button
                    key={event.id}
                    onClick={() => toggleEvent(event.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
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
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                        eventType === 'vertical' ? 'bg-purple-100 text-purple-700' :
                        eventType === 'throw' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {typeLabel}
                      </span>
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Generer skjemaer ({selectedEvents.size} øvelse{selectedEvents.size !== 1 ? 'r' : ''})
          </button>
        </div>
      )}
    </div>
  );
}
