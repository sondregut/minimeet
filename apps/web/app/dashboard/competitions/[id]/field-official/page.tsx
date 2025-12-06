'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Target,
  RefreshCw,
  Check,
  X,
  Minus,
  Save,
  ChevronDown,
  ChevronUp,
  Signal,
  Wifi,
  WifiOff,
  Wind,
  Loader2,
  User,
  Trophy,
} from 'lucide-react';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition, type VerticalSettings } from '@/lib/actions/events';
import { getEntriesByEvent } from '@/lib/actions/entries';
import { saveFieldResult, getFieldResultsByEvent, type FieldAttemptInput } from '@/lib/actions/results';
import VerticalSetup from './vertical-setup';
import VerticalCompetition from './vertical-competition';

// Helper to format time as local time (display as entered, no timezone conversion)
function formatLocalTime(isoString: string | null): string {
  if (!isoString) return '';
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return '';
}

interface Competition {
  id: string;
  name: string;
  date: string;
}

interface Event {
  id: string;
  name: string;
  event_type: string;
  status: string;
  scheduled_time: string | null;
  gender: string | null;
  age_group: string | null;
  settings?: VerticalSettings;
}

interface Entry {
  id: string;
  bib_number: string | null;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
  } | null;
}

interface AttemptData {
  distance: string;
  wind: string;
  is_foul: boolean;
  is_pass: boolean;
  is_confirmed: boolean; // True when distance has been confirmed with checkmark
}

// Official athletics result codes (Rule 132)
type AthleteStatus =
  | 'active'    // Still competing
  | 'DNS'       // Did not start (Startet ikke)
  | 'NM'        // No mark (Uten gyldig resultat)
  | 'r'         // Retired (Trukket seg)
  | 'DQ';       // Disqualified (Diskvalifisert)

interface AthleteResult {
  entry_id: string;
  attempts: AttemptData[];
  status: AthleteStatus;
  notes: string;
}

const MAX_ATTEMPTS = 6;

// Helper to check if event is vertical (høyde/stav)
function isVerticalEvent(event: Event | null): boolean {
  if (!event) return false;
  const name = event.name.toLowerCase();
  return (
    event.event_type === 'vertical' ||
    name.includes('høyde') ||
    name.includes('stav')
  );
}

// Get display code for attempt based on event type
function getAttemptCode(att: AttemptData, isVertical: boolean): string {
  if (att.is_foul) return 'X';
  if (att.is_pass) return '-';
  if (att.distance) return isVertical ? 'O' : att.distance;
  return '';
}

// Status display labels
const STATUS_LABELS: Record<AthleteStatus, string> = {
  active: 'Aktiv',
  DNS: 'DNS',
  NM: 'NM',
  r: 'r',
  DQ: 'DQ',
};

const STATUS_DESCRIPTIONS: Record<AthleteStatus, string> = {
  active: 'Deltar i konkurransen',
  DNS: 'Startet ikke',
  NM: 'Ingen gyldige forsøk',
  r: 'Trukket seg',
  DQ: 'Diskvalifisert',
};

// Map UI status to database status
type DbStatus = 'active' | 'complete' | 'retired' | 'NM' | 'ND';
function mapToDbStatus(status: AthleteStatus): DbStatus {
  switch (status) {
    case 'active': return 'active';
    case 'DNS': return 'ND';
    case 'NM': return 'NM';
    case 'r': return 'retired';
    case 'DQ': return 'retired'; // Map DQ to retired for now
    default: return 'active';
  }
}

function mapFromDbStatus(dbStatus: string): AthleteStatus {
  switch (dbStatus) {
    case 'active': return 'active';
    case 'complete': return 'active';
    case 'ND': return 'DNS';
    case 'NM': return 'NM';
    case 'retired': return 'r';
    default: return 'active';
  }
}

export default function FieldOfficialPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  // Connection state
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Data state
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [results, setResults] = useState<Record<string, AthleteResult>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);
  const [numAttempts, setNumAttempts] = useState(6);
  const [activeAttemptIndex, setActiveAttemptIndex] = useState(0);

  // For round-robin style: track current athlete in the current round
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState(0);

  // Track the last completed athlete (stays visible at top until next one completes)
  const [lastCompletedAthleteId, setLastCompletedAthleteId] = useState<string | null>(null);

  // Vertical event state
  const [verticalSettings, setVerticalSettings] = useState<VerticalSettings | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load competition and events
  useEffect(() => {
    async function loadData() {
      try {
        const [comp, evts] = await Promise.all([
          getCompetition(competitionId),
          getEventsByCompetition(competitionId),
        ]);

        setCompetition(comp);
        // Filter to only field events (horizontal, vertical, throw)
        const fieldEvents = (evts || []).filter(
          (e: Event) =>
            e.event_type === 'horizontal' ||
            e.event_type === 'vertical' ||
            e.event_type === 'throw' ||
            e.name.toLowerCase().includes('lengde') ||
            e.name.toLowerCase().includes('høyde') ||
            e.name.toLowerCase().includes('stav') ||
            e.name.toLowerCase().includes('kule') ||
            e.name.toLowerCase().includes('diskos') ||
            e.name.toLowerCase().includes('spyd') ||
            e.name.toLowerCase().includes('slegge') ||
            e.name.toLowerCase().includes('tresteg')
        );
        // Sort by scheduled_time (null values at the end)
        fieldEvents.sort((a, b) => {
          if (!a.scheduled_time && !b.scheduled_time) return 0;
          if (!a.scheduled_time) return 1;
          if (!b.scheduled_time) return -1;
          return a.scheduled_time.localeCompare(b.scheduled_time);
        });
        setEvents(fieldEvents);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Kunne ikke laste data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [competitionId]);

  // Load entries and results when event is selected
  const loadEventData = useCallback(async (event: Event) => {
    setLoading(true);
    setError(null);

    try {
      const [entriesData, existingResults] = await Promise.all([
        getEntriesByEvent(event.id),
        getFieldResultsByEvent(event.id),
      ]);

      setEntries(entriesData as Entry[]);

      // Initialize results
      const initialResults: Record<string, AthleteResult> = {};

      // Load existing results
      for (const result of existingResults) {
        if (!result.entry?.id) continue;

        const attempts: AttemptData[] = (result.attempts || [])
          .sort((a: { attempt_number: number }, b: { attempt_number: number }) => a.attempt_number - b.attempt_number)
          .map((a: { distance: number | null; wind: number | null; is_foul: boolean; is_pass: boolean }) => ({
            distance: a.distance ? (a.distance / 100).toFixed(2) : '',
            wind: a.wind ? a.wind.toString() : '',
            is_foul: a.is_foul,
            is_pass: a.is_pass,
            // Mark as confirmed if it has a distance or is foul/pass (already saved to DB)
            is_confirmed: !!(a.distance || a.is_foul || a.is_pass),
          }));

        while (attempts.length < MAX_ATTEMPTS) {
          attempts.push({ distance: '', wind: '', is_foul: false, is_pass: false, is_confirmed: false });
        }

        initialResults[result.entry.id] = {
          entry_id: result.entry.id,
          attempts,
          status: mapFromDbStatus(result.status || 'active'),
          notes: result.notes || '',
        };
      }

      // Initialize missing entries
      for (const entry of entriesData as Entry[]) {
        if (!initialResults[entry.id]) {
          const emptyAttempts: AttemptData[] = [];
          for (let i = 0; i < MAX_ATTEMPTS; i++) {
            emptyAttempts.push({ distance: '', wind: '', is_foul: false, is_pass: false, is_confirmed: false });
          }
          initialResults[entry.id] = {
            entry_id: entry.id,
            attempts: emptyAttempts,
            status: 'active',
            notes: '',
          };
        }
      }

      setResults(initialResults);
      setLastSyncTime(new Date());
      setLastCompletedAthleteId(null); // Reset when loading new event

      // Expand first athlete
      if ((entriesData as Entry[]).length > 0) {
        setExpandedAthlete((entriesData as Entry[])[0].id);
      }
    } catch (err) {
      console.error('Error loading event data:', err);
      setError('Kunne ikke laste data for denne øvelsen');
    } finally {
      setLoading(false);
    }
  }, []);

  function selectEvent(event: Event) {
    setSelectedEvent(event);
    // For vertical events, check if settings already exist
    if (isVerticalEvent(event) && event.settings) {
      setVerticalSettings(event.settings);
    } else {
      setVerticalSettings(null);
    }
    loadEventData(event);
  }

  // Handle vertical setup completion
  function handleVerticalSetupComplete(settings: VerticalSettings) {
    setVerticalSettings(settings);
    // Update the selected event with settings
    if (selectedEvent) {
      setSelectedEvent({ ...selectedEvent, settings });
    }
  }

  // Go back from vertical competition to event selection
  function handleVerticalBack() {
    setSelectedEvent(null);
    setVerticalSettings(null);
  }

  function updateAttempt(
    entryId: string,
    attemptIndex: number,
    field: keyof AttemptData,
    value: string | boolean
  ) {
    setResults(prev => {
      const athlete = prev[entryId];
      const newAttempts = [...athlete.attempts];
      newAttempts[attemptIndex] = {
        ...newAttempts[attemptIndex],
        [field]: value,
      };

      // Clear other fields when marking foul or pass
      if (field === 'is_foul' && value === true) {
        newAttempts[attemptIndex].distance = '';
        newAttempts[attemptIndex].is_pass = false;
      }
      if (field === 'is_pass' && value === true) {
        newAttempts[attemptIndex].distance = '';
        newAttempts[attemptIndex].is_foul = false;
      }
      if (field === 'distance' && value !== '') {
        newAttempts[attemptIndex].is_foul = false;
        newAttempts[attemptIndex].is_pass = false;
      }

      return {
        ...prev,
        [entryId]: {
          ...athlete,
          attempts: newAttempts,
        },
      };
    });
  }

  function setFoul(entryId: string, attemptIndex: number) {
    // Set this athlete as "last completed" so they stay visible at top
    setLastCompletedAthleteId(entryId);

    setResults(prev => {
      const athlete = prev[entryId];
      const newAttempts = [...athlete.attempts];
      newAttempts[attemptIndex] = {
        ...newAttempts[attemptIndex],
        distance: '',
        is_foul: true,
        is_pass: false,
      };
      const newAthleteResult = {
        ...athlete,
        attempts: newAttempts,
      };
      // Auto-save
      autoSaveAthleteResult(entryId, newAthleteResult);
      return {
        ...prev,
        [entryId]: newAthleteResult,
      };
    });
    // Auto-advance to next athlete
    setTimeout(() => advanceToNextAthlete(), 100);
  }

  function setPass(entryId: string, attemptIndex: number) {
    // Set this athlete as "last completed" so they stay visible at top
    setLastCompletedAthleteId(entryId);

    setResults(prev => {
      const athlete = prev[entryId];
      const newAttempts = [...athlete.attempts];
      newAttempts[attemptIndex] = {
        ...newAttempts[attemptIndex],
        distance: '',
        is_foul: false,
        is_pass: true,
      };
      const newAthleteResult = {
        ...athlete,
        attempts: newAttempts,
      };
      // Auto-save
      autoSaveAthleteResult(entryId, newAthleteResult);
      return {
        ...prev,
        [entryId]: newAthleteResult,
      };
    });
    // Auto-advance to next athlete
    setTimeout(() => advanceToNextAthlete(), 100);
  }

  // Confirm distance and advance to next athlete
  function confirmDistance(entryId: string, attemptIndex: number, distance: string) {
    // Set this athlete as "last completed" so they stay visible at top
    setLastCompletedAthleteId(entryId);

    setResults(prev => {
      const athlete = prev[entryId];
      const newAttempts = [...athlete.attempts];
      newAttempts[attemptIndex] = {
        ...newAttempts[attemptIndex],
        distance,
        is_foul: false,
        is_pass: false,
        is_confirmed: true, // Mark as confirmed so athlete moves to results list
      };
      const newAthleteResult = {
        ...athlete,
        attempts: newAttempts,
      };
      // Auto-save
      autoSaveAthleteResult(entryId, newAthleteResult);
      return {
        ...prev,
        [entryId]: newAthleteResult,
      };
    });
    // Auto-advance to next athlete
    setTimeout(() => advanceToNextAthlete(), 100);
  }

  function clearAttempt(entryId: string, attemptIndex: number) {
    setResults(prev => {
      const athlete = prev[entryId];
      const newAttempts = [...athlete.attempts];
      newAttempts[attemptIndex] = { distance: '', wind: '', is_foul: false, is_pass: false, is_confirmed: false };
      const newAthleteResult = {
        ...athlete,
        attempts: newAttempts,
      };
      // Auto-save
      autoSaveAthleteResult(entryId, newAthleteResult);
      return {
        ...prev,
        [entryId]: newAthleteResult,
      };
    });
  }

  function setAthleteStatus(entryId: string, status: AthleteStatus) {
    setResults(prev => {
      const newResults = {
        ...prev,
        [entryId]: {
          ...prev[entryId],
          status,
        },
      };
      // Auto-save
      autoSaveAthleteResult(entryId, newResults[entryId]);
      return newResults;
    });
  }

  // Auto-save function (fire and forget, doesn't block UI)
  async function autoSaveAthleteResult(entryId: string, data: AthleteResult) {
    if (!selectedEvent) return;

    try {
      const attempts: FieldAttemptInput[] = data.attempts
        .slice(0, numAttempts)
        .map((a, i) => ({
          attempt_number: i + 1,
          distance: a.distance ? Math.round(parseFloat(a.distance) * 100) : undefined,
          wind: a.wind ? parseFloat(a.wind) : undefined,
          is_foul: a.is_foul,
          is_pass: a.is_pass,
        }))
        .filter(a => a.distance !== undefined || a.is_foul || a.is_pass);

      await saveFieldResult(
        {
          entry_id: entryId,
          attempts,
          status: mapToDbStatus(data.status),
          notes: data.notes || undefined,
        },
        competitionId,
        selectedEvent.id
      );
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error auto-saving result:', err);
    }
  }

  // Get active athletes for current round (those who haven't confirmed this round yet)
  function getActiveAthletesForRound(): Entry[] {
    return entries.filter(entry => {
      const result = results[entry.id];
      if (!result || result.status !== 'active') return false;
      const attempt = result.attempts[activeAttemptIndex];
      // Active if this round is not confirmed (foul/pass count as confirmed)
      return !attempt?.is_confirmed && !attempt?.is_foul && !attempt?.is_pass;
    });
  }

  // Get athletes who have already performed in this round (for showing in results)
  function getCompletedAthletesForRound(): Entry[] {
    return entries.filter(entry => {
      const result = results[entry.id];
      if (!result) return false;
      // Non-active status (DNS, NM, r, DQ) goes to completed
      if (result.status !== 'active') return true;
      const attempt = result.attempts[activeAttemptIndex];
      // Completed if this round is confirmed (distance confirmed, foul, or pass)
      return attempt?.is_confirmed || attempt?.is_foul || attempt?.is_pass;
    });
  }

  // Advance to next athlete in round-robin fashion
  function advanceToNextAthlete() {
    const activeAthletes = getActiveAthletesForRound();

    if (activeAthletes.length === 0) {
      // All athletes done for this round - move to next round
      if (activeAttemptIndex < numAttempts - 1) {
        setActiveAttemptIndex(prev => prev + 1);
        setCurrentAthleteIndex(0);
        // Expand first athlete for next round
        if (entries.length > 0) {
          setExpandedAthlete(entries[0].id);
        }
      }
      return;
    }

    // Find next active athlete
    const currentEntryId = expandedAthlete;
    const currentIndex = entries.findIndex(e => e.id === currentEntryId);

    // Look for next athlete after current who is active
    for (let i = 1; i <= entries.length; i++) {
      const nextIndex = (currentIndex + i) % entries.length;
      const nextEntry = entries[nextIndex];
      if (activeAthletes.some(a => a.id === nextEntry.id)) {
        setExpandedAthlete(nextEntry.id);
        setCurrentAthleteIndex(nextIndex);
        return;
      }
    }
  }

  async function saveAthleteResult(entryId: string) {
    if (!selectedEvent) return;

    setSaving(true);
    setError(null);

    try {
      const data = results[entryId];

      const attempts: FieldAttemptInput[] = data.attempts
        .slice(0, numAttempts)
        .map((a, i) => ({
          attempt_number: i + 1,
          distance: a.distance ? Math.round(parseFloat(a.distance) * 100) : undefined,
          wind: a.wind ? parseFloat(a.wind) : undefined,
          is_foul: a.is_foul,
          is_pass: a.is_pass,
        }))
        .filter(a => a.distance !== undefined || a.is_foul || a.is_pass);

      const result = await saveFieldResult(
        {
          entry_id: entryId,
          attempts,
          status: mapToDbStatus(data.status),
          notes: data.notes || undefined,
        },
        competitionId,
        selectedEvent.id
      );

      if (result.error) {
        setError(result.error);
      } else {
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Error saving result:', err);
      setError('Kunne ikke lagre resultat');
    } finally {
      setSaving(false);
    }
  }

  async function saveAllResults() {
    if (!selectedEvent) return;

    setSaving(true);
    setError(null);

    try {
      for (const entryId of Object.keys(results)) {
        await saveAthleteResult(entryId);
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error saving all results:', err);
      setError('Kunne ikke lagre alle resultater');
    } finally {
      setSaving(false);
    }
  }

  // Calculate best mark for an athlete
  function getBestMark(entryId: string): number {
    const data = results[entryId];
    if (!data) return 0;

    let best = 0;
    for (const attempt of data.attempts) {
      if (attempt.is_foul || attempt.is_pass || !attempt.distance) continue;
      const dist = parseFloat(attempt.distance);
      if (!isNaN(dist) && dist > best) best = dist;
    }
    return best;
  }

  // Get standings sorted by best mark
  function getStandings() {
    return entries
      .map(entry => ({
        entry,
        bestMark: getBestMark(entry.id),
      }))
      .sort((a, b) => b.bestMark - a.bestMark);
  }

  if (loading && !selectedEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Laster...</p>
        </div>
      </div>
    );
  }

  // Event selection screen
  if (!selectedEvent) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-blue-900 text-white p-4 sticky top-0 z-10">
          <button
            onClick={() => router.push(`/dashboard/competitions/${competitionId}/control`)}
            className="flex items-center gap-2 text-blue-200 hover:text-white mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </button>
          <h1 className="text-xl font-bold">{competition?.name || 'Stevne'}</h1>
          <p className="text-blue-200 text-sm">Velg øvelse</p>
        </div>

        {/* Connection status */}
        <div className="px-4 py-2 bg-white border-b flex items-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-green-700">Tilkoblet</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-600" />
              <span className="text-red-700">Frakoblet - data lagres lokalt</span>
            </>
          )}
        </div>

        {/* Event list */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Velg øvelsen du skal registrere resultater for:
          </p>

          {events.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Ingen tekniske øvelser funnet</p>
            </div>
          ) : (
            events.map(event => (
              <button
                key={event.id}
                onClick={() => selectEvent(event)}
                className="w-full bg-white rounded-xl p-4 text-left shadow-sm active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-500">
                      {event.gender === 'M' ? 'Gutter' : event.gender === 'W' ? 'Jenter' : ''}{event.age_group && ` ${event.age_group}`}
                      {event.scheduled_time && ` • ${formatLocalTime(event.scheduled_time)}`}
                      {!event.scheduled_time && !event.gender && !event.age_group && 'Ikke planlagt'}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'in_progress'
                        ? 'bg-red-100 text-red-700'
                        : event.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {event.status === 'in_progress'
                      ? 'Pågår'
                      : event.status === 'completed'
                      ? 'Ferdig'
                      : 'Planlagt'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Vertical event: Show setup or competition UI
  if (selectedEvent && isVerticalEvent(selectedEvent)) {
    // No settings yet OR no heights defined - show setup screen
    const needsSetup = !verticalSettings || !verticalSettings.heights || verticalSettings.heights.length === 0;

    if (needsSetup) {
      return (
        <div className="min-h-screen bg-gray-100">
          {/* Header */}
          <div className="bg-blue-900 text-white p-4 sticky top-0 z-10">
            <button
              onClick={handleVerticalBack}
              className="flex items-center gap-2 text-blue-200 hover:text-white mb-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Tilbake
            </button>
            <h1 className="text-xl font-bold">{selectedEvent.name}</h1>
            <p className="text-blue-200 text-sm">Konfigurer øvelse</p>
          </div>

          <VerticalSetup
            eventId={selectedEvent.id}
            eventName={selectedEvent.name}
            competitionId={competitionId}
            existingSettings={selectedEvent.settings}
            onComplete={handleVerticalSetupComplete}
          />
        </div>
      );
    }

    // Settings exist - show competition UI
    return (
      <VerticalCompetition
        eventId={selectedEvent.id}
        eventName={selectedEvent.name}
        competitionId={competitionId}
        settings={verticalSettings}
        entries={entries}
        onBack={handleVerticalBack}
        onSettingsChange={handleVerticalSetupComplete}
      />
    );
  }

  // Results entry screen (horizontal/throw events)
  const standings = getStandings();
  const activeAthletesInRound = getActiveAthletesForRound();
  const completedAthletesInRound = getCompletedAthletesForRound();

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Compact Header */}
      <div className="bg-blue-900 text-white px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedEvent(null)}
            className="p-1 text-blue-200 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium truncate mx-2">{selectedEvent.name}</h1>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Signal className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <button
              onClick={() => loadEventData(selectedEvent)}
              className="p-1 hover:bg-blue-800 rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <div className="text-2xl font-mono font-bold">Runde {activeAttemptIndex + 1}</div>
          <div className="text-[10px] text-blue-300">
            {activeAthletesInRound.length} igjen • {entries.length} totalt
          </div>
        </div>
      </div>

      {/* Round selector - more compact */}
      <div className="bg-white border-b px-2 py-1.5 flex items-center justify-between sticky top-[60px] z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Runder:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => {
                  setActiveAttemptIndex(num - 1);
                  setLastCompletedAthleteId(null); // Clear when switching rounds
                }}
                disabled={num > numAttempts}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  activeAttemptIndex === num - 1
                    ? 'bg-blue-600 text-white'
                    : num <= numAttempts
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-300'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <select
          value={numAttempts}
          onChange={e => setNumAttempts(parseInt(e.target.value, 10))}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1"
        >
          <option value={3}>3 forsøk</option>
          <option value={6}>6 forsøk</option>
        </select>
      </div>

      {/* Error message */}
      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Ingen deltakere i denne øvelsen</p>
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {/* Last completed athlete - stays visible until next one completes */}
          {lastCompletedAthleteId && (() => {
            const entry = entries.find(e => e.id === lastCompletedAthleteId);
            if (!entry) return null;
            const result = results[entry.id];
            const bestMark = getBestMark(entry.id);
            const attempt = result?.attempts[activeAttemptIndex];
            const lastResult = attempt?.is_foul ? 'X' : attempt?.is_pass ? '-' : attempt?.distance ? `${attempt.distance} m` : '';

            return (
              <div className="mb-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-green-600 font-medium">
                  <Check className="w-3 h-3" />
                  <span>Sist registrert</span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.bib_number && (
                        <span className="text-sm font-mono font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                          {entry.bib_number}
                        </span>
                      )}
                      <span className="font-medium text-green-900 text-sm">
                        {entry.athlete?.first_name} {entry.athlete?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-mono font-bold ${
                        attempt?.is_foul ? 'text-red-600' :
                        attempt?.is_pass ? 'text-gray-500' :
                        'text-green-700'
                      }`}>
                        {lastResult}
                      </span>
                      <span className="text-xs text-green-600">
                        Beste: {bestMark > 0 ? `${bestMark.toFixed(2)} m` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Section header for waiting athletes */}
          {activeAthletesInRound.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 font-medium">
              <span>Venter ({activeAthletesInRound.length})</span>
            </div>
          )}
          {activeAthletesInRound.length === 0 && !lastCompletedAthleteId && (
            <div className="text-center py-4 text-gray-500 text-sm">
              Alle har kastet/hoppet denne runden
            </div>
          )}
          {activeAthletesInRound.map((entry) => {
            const result = results[entry.id];
            const bestMark = getBestMark(entry.id);
            const isExpanded = expandedAthlete === entry.id;
            const attempt = result?.attempts[activeAttemptIndex];

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all ${
                  isExpanded ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Athlete header - no placement badge since not ranked in this list */}
                <button
                  onClick={() => setExpandedAthlete(isExpanded ? null : entry.id)}
                  className="w-full px-3 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {/* Bib number */}
                    {entry.bib_number && (
                      <span className="text-sm font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {entry.bib_number}
                      </span>
                    )}

                    {/* Name */}
                    <span className="font-medium text-gray-900 text-sm">
                      {entry.athlete?.first_name} {entry.athlete?.last_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Current round result indicator */}
                    <div className="flex gap-1">
                      {result?.attempts.slice(0, numAttempts).map((att, i) => (
                        <div
                          key={i}
                          className={`w-5 h-5 rounded text-xs flex items-center justify-center font-mono ${
                            i === activeAttemptIndex ? 'ring-1 ring-blue-500' : ''
                          } ${
                            att.is_foul
                              ? 'bg-red-100 text-red-600'
                              : att.is_pass
                              ? 'bg-gray-100 text-gray-400'
                              : att.distance
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-50 text-gray-300'
                          }`}
                        >
                          {att.is_foul ? 'X' : att.is_pass ? '-' : att.distance ? (isVerticalEvent(selectedEvent) ? 'O' : '✓') : (i + 1)}
                        </div>
                      ))}
                    </div>

                    {/* Best mark - smaller since not ranked here */}
                    <div className="text-right min-w-[40px]">
                      <p className="font-mono text-xs text-gray-500">
                        {bestMark > 0 ? bestMark.toFixed(2) : '-'}
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded content - compact for indoor */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-3 space-y-3">
                    {/* Distance input with quick actions */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          Runde {activeAttemptIndex + 1}:
                        </span>
                        {attempt?.is_foul ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-mono font-bold">
                            X
                          </span>
                        ) : attempt?.is_pass ? (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono font-bold">
                            -
                          </span>
                        ) : attempt?.distance ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-mono font-bold">
                            {isVerticalEvent(selectedEvent) ? 'O' : `${attempt.distance} m`}
                          </span>
                        ) : null}
                      </div>

                      {/* Distance input with confirm button */}
                      <div className="flex gap-2 mb-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={attempt?.is_foul || attempt?.is_pass ? '' : attempt?.distance || ''}
                          onChange={e => updateAttempt(entry.id, activeAttemptIndex, 'distance', e.target.value)}
                          disabled={attempt?.is_foul || attempt?.is_pass}
                          placeholder="0.00"
                          className="flex-1 text-3xl font-mono text-center py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                        />
                        <button
                          onClick={() => {
                            const dist = attempt?.distance;
                            if (dist && parseFloat(dist) > 0) {
                              confirmDistance(entry.id, activeAttemptIndex, dist);
                            }
                          }}
                          disabled={!attempt?.distance || attempt?.is_foul || attempt?.is_pass}
                          className="px-6 py-3 rounded-lg font-bold text-xl bg-green-600 text-white active:bg-green-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <Check className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Quick action buttons - inline */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setFoul(entry.id, activeAttemptIndex)}
                          className={`py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-1 transition-colors ${
                            attempt?.is_foul
                              ? 'bg-red-600 text-white'
                              : 'bg-red-50 text-red-700 active:bg-red-100'
                          }`}
                          title="Ugyldig forsøk (X)"
                        >
                          <X className="w-4 h-4" />
                          X
                        </button>
                        <button
                          onClick={() => setPass(entry.id, activeAttemptIndex)}
                          className={`py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-1 transition-colors ${
                            attempt?.is_pass
                              ? 'bg-gray-600 text-white'
                              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                          }`}
                          title="Står over (-)"
                        >
                          <Minus className="w-4 h-4" />
                          -
                        </button>
                        <button
                          onClick={() => clearAttempt(entry.id, activeAttemptIndex)}
                          className="py-3 rounded-lg font-semibold text-sm bg-white border border-gray-200 text-gray-600 active:bg-gray-50 transition-colors"
                        >
                          Nullstill
                        </button>
                      </div>
                    </div>

                    {/* All attempts - compact row */}
                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                      <div className="flex gap-1">
                        {result?.attempts.slice(0, numAttempts).map((att, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveAttemptIndex(i)}
                            className={`w-12 h-8 rounded text-xs font-mono font-medium ${
                              i === activeAttemptIndex
                                ? 'ring-2 ring-blue-500 bg-blue-50'
                                : 'bg-gray-50'
                            } ${
                              att.is_foul
                                ? 'text-red-600 bg-red-50'
                                : att.is_pass
                                ? 'text-gray-400'
                                : att.distance
                                ? 'text-gray-900'
                                : 'text-gray-300'
                            }`}
                          >
                            {att.is_foul ? 'X' : att.is_pass ? '-' : att.distance ? (isVerticalEvent(selectedEvent) ? 'O' : att.distance) : '-'}
                          </button>
                        ))}
                      </div>

                      {/* Save button - inline */}
                      <button
                        onClick={() => saveAthleteResult(entry.id)}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-green-600 text-white active:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Lagre
                      </button>
                    </div>

                    {/* Status selector - official codes */}
                    <div className="bg-white rounded-lg p-2 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Status:</span>
                        <div className="flex gap-1 flex-wrap">
                          {(['active', 'DNS', 'NM', 'r', 'DQ'] as AthleteStatus[]).map((status) => (
                            <button
                              key={status}
                              onClick={() => setAthleteStatus(entry.id, status)}
                              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                                result?.status === status
                                  ? status === 'active'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title={STATUS_DESCRIPTIONS[status]}
                            >
                              {STATUS_LABELS[status]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Real-time results list */}
      <div className="bg-white border-t mt-4 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-yellow-600" />
          <h3 className="text-sm font-semibold text-gray-700">Resultater</h3>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {standings.map(({ entry, bestMark }, index) => {
            const result = results[entry.id];
            const hasAttempts = result?.attempts.some(a => a.distance || a.is_foul || a.is_pass);

            // Show rank only for those with valid marks
            const rank = bestMark > 0 ? index + 1 : null;

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between py-1 px-2 rounded bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 text-xs font-bold text-center ${
                    rank === 1 ? 'text-yellow-600' :
                    rank === 2 ? 'text-gray-500' :
                    rank === 3 ? 'text-orange-600' :
                    'text-gray-400'
                  }`}>
                    {rank || '-'}
                  </span>
                  <span className="text-xs font-mono text-gray-500 w-6">
                    {entry.bib_number || ''}
                  </span>
                  <span className="text-xs text-gray-900">
                    {entry.athlete?.first_name} {entry.athlete?.last_name?.charAt(0)}.
                  </span>
                  {result?.status && result.status !== 'active' && (
                    <span className="px-1 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700">
                      {STATUS_LABELS[result.status]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Show attempts as mini grid */}
                  <div className="flex gap-0.5">
                    {result?.attempts.slice(0, numAttempts).map((att, i) => (
                      <span
                        key={i}
                        className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-mono ${
                          att.is_foul ? 'bg-red-100 text-red-600' :
                          att.is_pass ? 'bg-gray-100 text-gray-400' :
                          att.distance ? 'bg-green-100 text-green-700' :
                          'bg-gray-50 text-gray-300'
                        }`}
                      >
                        {att.is_foul ? 'X' : att.is_pass ? '-' : att.distance ? (parseFloat(att.distance) === bestMark ? '*' : '~') : ''}
                      </span>
                    ))}
                  </div>
                  <span className={`text-xs font-mono font-bold w-12 text-right ${
                    bestMark > 0 ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {bestMark > 0 ? bestMark.toFixed(2) : (hasAttempts ? 'NM' : '-')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom padding for scroll */}
      <div className="h-4" />
    </div>
  );
}
