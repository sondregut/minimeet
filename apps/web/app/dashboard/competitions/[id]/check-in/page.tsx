'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Clock,
  UserX,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Check
} from 'lucide-react';

interface EventEntry {
  entry_id: string;
  athlete_id: string;
  first_name: string;
  last_name: string;
  club_name: string;
  bib_number: string | null;
  age_group: string;
  status: string;
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'DNS':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Ikke møtt
        </span>
      );
    case 'checked_in':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Innsjekket
        </span>
      );
    case 'scratched':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <XCircle className="w-3 h-3" />
          Strøket
        </span>
      );
    default:
      return null; // registered/confirmed - no badge needed (assumed present)
  }
}

export default function CheckInManagementPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<ListsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(new Set());

  // Load processed events from localStorage
  useEffect(() => {
    const storageKey = `checkin-processed-${competitionId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setProcessedEvents(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Error loading processed events:', e);
      }
    }
  }, [competitionId]);

  // Save processed events to localStorage
  const saveProcessedEvents = (events: Set<string>) => {
    const storageKey = `checkin-processed-${competitionId}`;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(events)));
    setProcessedEvents(events);
  };

  const markEventAsProcessed = (eventId: string) => {
    const newProcessed = new Set(processedEvents);
    newProcessed.add(eventId);
    saveProcessedEvents(newProcessed);
  };

  const unmarkEventAsProcessed = (eventId: string) => {
    const newProcessed = new Set(processedEvents);
    newProcessed.delete(eventId);
    saveProcessedEvents(newProcessed);
  };

  const loadData = async () => {
    try {
      setLoading(true);
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
  };

  useEffect(() => {
    loadData();
  }, [competitionId]);

  const updateEntryStatus = async (entryId: string, newStatus: string) => {
    setUpdating(entryId);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/entries/${entryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Kunne ikke oppdatere status');
      }

      // Update local state
      if (data) {
        const newByEvent = { ...data.byEvent };
        for (const eventId of Object.keys(newByEvent)) {
          newByEvent[eventId] = newByEvent[eventId].map(entry =>
            entry.entry_id === entryId ? { ...entry, status: newStatus } : entry
          );
        }
        setData({ ...data, byEvent: newByEvent });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Kunne ikke oppdatere status. Prøv igjen.');
    } finally {
      setUpdating(null);
    }
  };

  const toggleDNS = (entry: EventEntry) => {
    if (entry.status === 'DNS') {
      // Restore to registered
      updateEntryStatus(entry.entry_id, 'registered');
    } else {
      // Mark as DNS
      updateEntryStatus(entry.entry_id, 'DNS');
    }
  };

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

  // Calculate stats
  const totalEntries = eventsWithParticipants.reduce(
    (sum, e) => sum + (data.byEvent[e.id]?.length || 0),
    0
  );
  const dnsCount = eventsWithParticipants.reduce(
    (sum, e) => sum + (data.byEvent[e.id]?.filter(a => a.status === 'DNS').length || 0),
    0
  );

  const currentEvent = selectedEvent
    ? data.events.find(e => e.id === selectedEvent)
    : null;
  const currentEntries = selectedEvent
    ? data.byEvent[selectedEvent] || []
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til stevnet
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Avkrysningskontroll</h1>
            <p className="text-gray-600 mt-1">
              Kryss ut utøvere som ikke har møtt opp (DNS)
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Oppdater
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEntries}</p>
              <p className="text-sm text-gray-500">Påmeldinger</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEntries - dnsCount}</p>
              <p className="text-sm text-gray-500">Møtt opp</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dnsCount}</p>
              <p className="text-sm text-gray-500">Ikke møtt (DNS)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{eventsWithParticipants.length}</p>
              <p className="text-sm text-gray-500">Øvelser</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {processedEvents.size}/{eventsWithParticipants.length}
              </p>
              <p className="text-sm text-gray-500">Gjennomgått</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event list */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Øvelser</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {eventsWithParticipants.map((event) => {
              const entries = data.byEvent[event.id] || [];
              const eventDNS = entries.filter(e => e.status === 'DNS').length;
              const time = extractTime(event.scheduled_time);
              const isSelected = selectedEvent === event.id;
              const isProcessed = processedEvents.has(event.id);

              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  } ${isProcessed && !isSelected ? 'bg-green-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      {isProcessed && (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-medium ${isProcessed ? 'text-green-800' : 'text-gray-900'}`}>
                          {event.event_code || event.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {normalizeAgeGroup(event.age_group, event.gender)}
                          {time && ` · ${time}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{entries.length}</p>
                      {eventDNS > 0 && (
                        <p className="text-xs text-red-600">{eventDNS} DNS</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Entry list */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {currentEvent ? (
            <>
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {currentEvent.event_code || currentEvent.name} - {normalizeAgeGroup(currentEvent.age_group, currentEvent.gender)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {currentEntries.length} påmeldt · {currentEntries.filter(e => e.status === 'DNS').length} DNS
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {extractTime(currentEvent.scheduled_time) && (
                      <span className="text-lg font-mono font-semibold text-gray-900">
                        {extractTime(currentEvent.scheduled_time)}
                      </span>
                    )}
                    {processedEvents.has(currentEvent.id) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Gjennomgått
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {currentEntries.map((entry) => {
                  const isDNS = entry.status === 'DNS';
                  const isUpdating = updating === entry.entry_id;

                  return (
                    <div
                      key={entry.entry_id}
                      className={`px-4 py-3 flex items-center justify-between ${
                        isDNS ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`font-mono font-bold text-lg w-12 ${
                          isDNS ? 'text-red-400 line-through' : 'text-gray-900'
                        }`}>
                          {entry.bib_number || '–'}
                        </span>
                        <div>
                          <p className={`font-medium ${
                            isDNS ? 'text-red-400 line-through' : 'text-gray-900'
                          }`}>
                            {entry.last_name}, {entry.first_name}
                          </p>
                          <p className={`text-sm ${
                            isDNS ? 'text-red-300' : 'text-gray-500'
                          }`}>
                            {entry.club_name}
                          </p>
                        </div>
                        {getStatusBadge(entry.status)}
                      </div>

                      <button
                        onClick={() => toggleDNS(entry)}
                        disabled={isUpdating}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          isDNS
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : isDNS ? (
                          <span className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4" />
                            Angre
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <UserX className="w-4 h-4" />
                            Ikke møtt
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer with "Ferdig" button */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {currentEntries.filter(e => e.status !== 'DNS').length} av {currentEntries.length} deltar
                  </p>
                  {processedEvents.has(currentEvent.id) ? (
                    <button
                      onClick={() => unmarkEventAsProcessed(currentEvent.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Angre gjennomgang
                    </button>
                  ) : (
                    <button
                      onClick={() => markEventAsProcessed(currentEvent.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Ferdig med avkrysning
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Users className="w-12 h-12 mb-4 text-gray-300" />
              <p className="font-medium">Velg en øvelse</p>
              <p className="text-sm">Klikk på en øvelse til venstre for å se deltakere</p>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 mb-1">Om avkrysningskontroll</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Utøvere må normalt krysse av minst 1 time før øvelsesstart</li>
              <li>• Klikk "Ikke møtt" for å markere de som ikke har krysset av (DNS)</li>
              <li>• DNS-markerte utøvere vil ikke bli inkludert i startlister og heat</li>
              <li>• Klikk "Ferdig med avkrysning" når du har gått gjennom en øvelse</li>
              <li>• Øvelser markert som gjennomgått vises med grønt i listen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
