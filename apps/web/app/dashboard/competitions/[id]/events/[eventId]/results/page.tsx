'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Wind, Timer, Keyboard, Trophy } from 'lucide-react';
import { getEntriesByEvent } from '@/lib/actions/entries';
import { getEvent } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';
import { saveTrackResults, getTrackResultsByEvent, type TrackResultInput } from '@/lib/actions/results';
import { parseTimeToMs, formatMsToTime } from '@/lib/utils/time';

interface Entry {
  id: string;
  bib_number: string | null;
  lane_or_position: number | null;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
    nationality: string;
  } | null;
}

interface ResultRow {
  entry_id: string;
  time: string;
  status: 'finished' | 'DNS' | 'DNF' | 'DQ' | 'FS';
  reaction_time: string;
  notes: string;
}

interface PlaceInfo {
  place: number | null;
  time_ms: number | null;
}

export default function TrackResultsPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [event, setEvent] = useState<{ name: string; event_type: string; wind_reading: number | null } | null>(null);
  const [competition, setCompetition] = useState<{ name: string } | null>(null);
  const [results, setResults] = useState<Record<string, ResultRow>>({});
  const [eventWind, setEventWind] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null);

  // Refs for keyboard navigation
  const timeInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const reactionInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [entriesData, eventData, competitionData, existingResults] = await Promise.all([
          getEntriesByEvent(eventId),
          getEvent(eventId),
          getCompetition(competitionId),
          getTrackResultsByEvent(eventId),
        ]);

        setEntries(entriesData as Entry[]);
        setEvent(eventData);
        setCompetition(competitionData);

        if (eventData?.wind_reading) {
          setEventWind(eventData.wind_reading.toString());
        }

        // Initialize results for each entry, pre-filling existing results
        const initialResults: Record<string, ResultRow> = {};
        entriesData.forEach((entry: Entry) => {
          // Check if we have an existing result for this entry
          const existing = existingResults?.find((r: { entry_id: string }) => r.entry_id === entry.id);

          if (existing) {
            initialResults[entry.id] = {
              entry_id: entry.id,
              time: existing.time_display || (existing.time_ms ? formatMsToTime(existing.time_ms) : ''),
              status: existing.status || 'finished',
              reaction_time: existing.reaction_time_ms ? (existing.reaction_time_ms / 1000).toFixed(3) : '',
              notes: existing.notes || '',
            };
          } else {
            initialResults[entry.id] = {
              entry_id: entry.id,
              time: '',
              status: 'finished',
              reaction_time: '',
              notes: '',
            };
          }
        });
        setResults(initialResults);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load event data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, competitionId]);

  function updateResult(entryId: string, field: keyof ResultRow, value: string) {
    setResults(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: value,
      },
    }));
  }

  // Calculate places from times in real-time
  const calculatePlaces = useCallback((): Record<string, PlaceInfo> => {
    const places: Record<string, PlaceInfo> = {};

    // Get all entries with valid times
    const entriesWithTimes: { entryId: string; time_ms: number }[] = [];

    Object.entries(results).forEach(([entryId, result]) => {
      if (result.status === 'finished' && result.time) {
        const time_ms = parseTimeToMs(result.time);
        if (time_ms !== null && time_ms > 0) {
          entriesWithTimes.push({ entryId, time_ms });
        }
      }
    });

    // Sort by time (fastest first)
    entriesWithTimes.sort((a, b) => a.time_ms - b.time_ms);

    // Assign places with tie handling
    let currentPlace = 1;
    let lastTime: number | null = null;
    let sameTimeCount = 0;

    entriesWithTimes.forEach(({ entryId, time_ms }, index) => {
      if (lastTime !== null && time_ms === lastTime) {
        // Same time as previous, same place
        sameTimeCount++;
        places[entryId] = { place: currentPlace, time_ms };
      } else {
        // New time, advance place by number of tied athletes
        currentPlace = index + 1;
        places[entryId] = { place: currentPlace, time_ms };
        sameTimeCount = 1;
      }
      lastTime = time_ms;
    });

    // Mark non-finishers
    Object.entries(results).forEach(([entryId, result]) => {
      if (!places[entryId]) {
        places[entryId] = { place: null, time_ms: null };
      }
    });

    return places;
  }, [results]);

  const calculatedPlaces = calculatePlaces();

  // Get sorted entries for display (by lane initially, or by calculated place)
  const sortedEntries = [...entries].sort((a, b) =>
    (a.lane_or_position || 99) - (b.lane_or_position || 99)
  );

  // Navigate to next/previous row
  const navigateToRow = useCallback((currentEntryId: string, direction: 'next' | 'prev', field: 'time' | 'reaction') => {
    const currentIndex = sortedEntries.findIndex(e => e.id === currentEntryId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= sortedEntries.length) return;

    const targetEntryId = sortedEntries[targetIndex].id;
    const refs = field === 'time' ? timeInputRefs : reactionInputRefs;
    refs.current[targetEntryId]?.focus();
  }, [sortedEntries]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, entryId: string, field: 'time' | 'reaction') => {
    const key = e.key.toLowerCase();

    // Shortcuts only work when not typing in input (or at start of empty input)
    const input = e.currentTarget;
    const isEmpty = input.value === '';

    // D = DNS
    if (key === 'd' && isEmpty) {
      e.preventDefault();
      updateResult(entryId, 'status', 'DNS');
      navigateToRow(entryId, 'next', 'time');
      return;
    }

    // F = DNF
    if (key === 'f' && isEmpty) {
      e.preventDefault();
      updateResult(entryId, 'status', 'DNF');
      navigateToRow(entryId, 'next', 'time');
      return;
    }

    // Q = DQ
    if (key === 'q' && isEmpty) {
      e.preventDefault();
      updateResult(entryId, 'status', 'DQ');
      navigateToRow(entryId, 'next', 'time');
      return;
    }

    // S = False Start
    if (key === 's' && isEmpty) {
      e.preventDefault();
      updateResult(entryId, 'status', 'FS');
      navigateToRow(entryId, 'next', 'time');
      return;
    }

    // Enter = Move to next row (same field)
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateToRow(entryId, 'next', field);
      return;
    }

    // Tab = Move to reaction time (if in time field) or next row time (if in reaction field)
    if (e.key === 'Tab' && !e.shiftKey) {
      if (field === 'time') {
        e.preventDefault();
        reactionInputRefs.current[entryId]?.focus();
      }
      // Let default tab behavior work for reaction → next row
    }

    // Shift+Tab = Move to previous field
    if (e.key === 'Tab' && e.shiftKey) {
      if (field === 'reaction') {
        e.preventDefault();
        timeInputRefs.current[entryId]?.focus();
      }
    }

    // Arrow Up = Previous row
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateToRow(entryId, 'prev', field);
      return;
    }

    // Arrow Down = Next row
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateToRow(entryId, 'next', field);
      return;
    }

    // Ctrl/Cmd + S = Save
    if ((e.ctrlKey || e.metaKey) && key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }
  }, [navigateToRow, updateResult]);

  // Focus handler to track current row
  const handleFocus = (entryId: string) => {
    setFocusedEntryId(entryId);
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert results to TrackResultInput format
      const trackResults: TrackResultInput[] = Object.values(results).map(result => {
        const timeMs = result.status === 'finished' ? parseTimeToMs(result.time) : null;
        const reactionMs = result.reaction_time ? parseTimeToMs(result.reaction_time) : null;

        return {
          entry_id: result.entry_id,
          time_ms: timeMs || undefined,
          time_display: result.status === 'finished' && timeMs ? formatMsToTime(timeMs) : undefined,
          reaction_time_ms: reactionMs || undefined,
          status: result.status,
          notes: result.notes || undefined,
        };
      });

      const wind = eventWind ? parseFloat(eventWind) : undefined;

      const saveResult = await saveTrackResults(eventId, competitionId, trackResults, wind);

      if (saveResult.error) {
        setError(saveResult.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/dashboard/competitions/${competitionId}/events/${eventId}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving results:', err);
      setError('Failed to save results');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {event?.name || 'Event'}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Record Results</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - {competition?.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showShortcuts
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">Shortcuts</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Results'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">D</kbd>
              <span className="ml-2 text-blue-800">DNS (Did Not Start)</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">F</kbd>
              <span className="ml-2 text-blue-800">DNF (Did Not Finish)</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">Q</kbd>
              <span className="ml-2 text-blue-800">DQ (Disqualified)</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">S</kbd>
              <span className="ml-2 text-blue-800">FS (False Start)</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">Enter</kbd>
              <span className="ml-2 text-blue-800">Next row</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">Tab</kbd>
              <span className="ml-2 text-blue-800">Next field</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">Arrow Up/Down</kbd>
              <span className="ml-2 text-blue-800">Navigate rows</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono text-xs">Ctrl+S</kbd>
              <span className="ml-2 text-blue-800">Save results</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">
            Tip: Press shortcut keys when the time field is empty to quickly set status and move to next athlete.
          </p>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm">
          Results saved successfully! Redirecting...
        </div>
      )}

      {/* Wind Reading */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Wind className="w-5 h-5 text-gray-400" />
          <label className="text-sm font-medium text-gray-700">Wind (m/s)</label>
          <input
            type="number"
            step="0.1"
            value={eventWind}
            onChange={(e) => setEventWind(e.target.value)}
            placeholder="e.g., +1.5 or -0.3"
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-xs text-gray-500">
            Positive = tailwind, Negative = headwind. Legal limit: +2.0
          </span>
        </div>
      </div>

      {/* Results Table */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <Timer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No entries</h3>
          <p className="text-gray-500">
            Add athletes to this event before recording results.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3 w-16">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Place
                  </div>
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3 w-14">
                  Lane
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3 w-16">
                  Bib
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3">
                  Athlete
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3 w-28">
                  Time
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3 w-24">
                  Status
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3 w-24">
                  Reaction
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 py-3 w-40">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEntries.map((entry) => {
                const result = results[entry.id];
                const placeInfo = calculatedPlaces[entry.id];
                const isFocused = focusedEntryId === entry.id;
                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isFocused ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Place Column */}
                    <td className="px-3 py-3 text-center">
                      {placeInfo?.place ? (
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            placeInfo.place === 1
                              ? 'bg-yellow-100 text-yellow-700'
                              : placeInfo.place === 2
                              ? 'bg-gray-200 text-gray-700'
                              : placeInfo.place === 3
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {placeInfo.place}
                        </span>
                      ) : result?.status && result.status !== 'finished' ? (
                        <span className="text-xs font-medium text-gray-400">
                          {result.status}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {entry.lane_or_position || '-'}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {entry.bib_number || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {entry.athlete?.first_name} {entry.athlete?.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {entry.athlete?.club_name || entry.athlete?.nationality}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        ref={(el) => { timeInputRefs.current[entry.id] = el; }}
                        type="text"
                        value={result?.time || ''}
                        onChange={(e) => updateResult(entry.id, 'time', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, entry.id, 'time')}
                        onFocus={() => handleFocus(entry.id)}
                        placeholder="10.52"
                        disabled={result?.status !== 'finished'}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 font-mono"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={result?.status || 'finished'}
                        onChange={(e) => updateResult(entry.id, 'status', e.target.value)}
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
                          result?.status === 'DNS' ? 'border-orange-300 bg-orange-50' :
                          result?.status === 'DNF' ? 'border-red-300 bg-red-50' :
                          result?.status === 'DQ' ? 'border-red-400 bg-red-100' :
                          result?.status === 'FS' ? 'border-purple-300 bg-purple-50' :
                          'border-gray-300'
                        }`}
                      >
                        <option value="finished">Finished</option>
                        <option value="DNS">DNS</option>
                        <option value="DNF">DNF</option>
                        <option value="DQ">DQ</option>
                        <option value="FS">False Start</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        ref={(el) => { reactionInputRefs.current[entry.id] = el; }}
                        type="text"
                        value={result?.reaction_time || ''}
                        onChange={(e) => updateResult(entry.id, 'reaction_time', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, entry.id, 'reaction')}
                        onFocus={() => handleFocus(entry.id)}
                        placeholder="0.143"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={result?.notes || ''}
                        onChange={(e) => updateResult(entry.id, 'notes', e.target.value)}
                        onFocus={() => handleFocus(entry.id)}
                        placeholder="Notes..."
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
        <p><strong>Time format:</strong> Enter as seconds (10.52) or minutes:seconds (1:45.67)</p>
        <p><strong>Quick entry:</strong> Places are calculated automatically as you type. Click &quot;Shortcuts&quot; button to see keyboard shortcuts.</p>
        <p><strong>Reaction time:</strong> Optional, in seconds (e.g., 0.143)</p>
      </div>
    </div>
  );
}
