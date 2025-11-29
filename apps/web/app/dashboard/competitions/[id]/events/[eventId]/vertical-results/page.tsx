'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Plus, Minus, RotateCcw } from 'lucide-react';
import { getEntriesByEvent } from '@/lib/actions/entries';
import { getEvent } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';
import { saveVerticalResult, getVerticalResultsByEvent, type VerticalAttemptInput } from '@/lib/actions/results';

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

interface AthleteAttempts {
  entry_id: string;
  attempts: Record<number, ('o' | 'x' | '-' | 'r')[]>; // height -> array of attempt outcomes
  status: 'active' | 'eliminated' | 'retired' | 'NH';
  notes: string;
}

type AttemptOutcome = 'o' | 'x' | '-' | 'r';

interface VerticalStandingItem {
  entry: Entry;
  data: AthleteAttempts;
  bestHeight: number;
  missesAtBest: number;
  totalMisses: number;
}

export default function VerticalResultsPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [event, setEvent] = useState<{ name: string; event_type: string } | null>(null);
  const [competition, setCompetition] = useState<{ name: string } | null>(null);

  // Heights for the competition (in cm)
  const [heights, setHeights] = useState<number[]>([]);
  const [newHeight, setNewHeight] = useState('');

  // Attempts data for each athlete
  const [athleteData, setAthleteData] = useState<Record<string, AthleteAttempts>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [entriesData, eventData, competitionData, existingResults] = await Promise.all([
          getEntriesByEvent(eventId),
          getEvent(eventId),
          getCompetition(competitionId),
          getVerticalResultsByEvent(eventId),
        ]);

        setEntries(entriesData as Entry[]);
        setEvent(eventData);
        setCompetition(competitionData);

        // Initialize athlete data
        const initialData: Record<string, AthleteAttempts> = {};

        // First, load any existing results
        const existingHeights = new Set<number>();
        for (const result of existingResults) {
          if (!result.entry?.id) continue;

          const attempts: Record<number, AttemptOutcome[]> = {};
          for (const attempt of result.attempts || []) {
            if (!attempts[attempt.height]) {
              attempts[attempt.height] = [];
            }
            attempts[attempt.height].push(attempt.outcome as AttemptOutcome);
            existingHeights.add(attempt.height);
          }

          initialData[result.entry.id] = {
            entry_id: result.entry.id,
            attempts,
            status: result.status as 'active' | 'eliminated' | 'retired' | 'NH',
            notes: result.notes || '',
          };
        }

        // Set heights from existing data
        if (existingHeights.size > 0) {
          setHeights(Array.from(existingHeights).sort((a, b) => a - b));
        } else {
          // Default starting heights based on event type
          const isPoleVault = eventData?.name?.toLowerCase().includes('pole vault');
          if (isPoleVault) {
            setHeights([300, 320, 340, 360, 380, 400]);
          } else {
            setHeights([150, 155, 160, 165, 170, 175]);
          }
        }

        // Initialize missing entries
        for (const entry of entriesData as Entry[]) {
          if (!initialData[entry.id]) {
            initialData[entry.id] = {
              entry_id: entry.id,
              attempts: {},
              status: 'active',
              notes: '',
            };
          }
        }

        setAthleteData(initialData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load event data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, competitionId]);

  function addHeight() {
    const height = parseFloat(newHeight);
    if (isNaN(height) || height <= 0) return;

    // Convert to cm if needed (assume input is in cm)
    const heightCm = Math.round(height);

    if (!heights.includes(heightCm)) {
      setHeights(prev => [...prev, heightCm].sort((a, b) => a - b));
    }
    setNewHeight('');
  }

  function removeHeight(height: number) {
    setHeights(prev => prev.filter(h => h !== height));
    // Also remove attempts at this height
    setAthleteData(prev => {
      const updated = { ...prev };
      for (const entryId of Object.keys(updated)) {
        const { [height]: _, ...rest } = updated[entryId].attempts;
        updated[entryId] = { ...updated[entryId], attempts: rest };
      }
      return updated;
    });
  }

  function recordAttempt(entryId: string, height: number, outcome: AttemptOutcome) {
    setAthleteData(prev => {
      const athlete = prev[entryId];
      const currentAttempts = athlete.attempts[height] || [];

      // Can't record more than 3 attempts at a height (unless retry)
      if (currentAttempts.length >= 3 && outcome !== 'r') {
        return prev;
      }

      const newAttempts = [...currentAttempts, outcome];

      // Check if athlete is eliminated (3 consecutive misses at this height with no clearance)
      let newStatus = athlete.status;
      if (outcome === 'x' && newAttempts.filter(a => a === 'x').length >= 3 && !newAttempts.includes('o')) {
        newStatus = 'eliminated';
      }

      return {
        ...prev,
        [entryId]: {
          ...athlete,
          attempts: {
            ...athlete.attempts,
            [height]: newAttempts,
          },
          status: newStatus,
        },
      };
    });
  }

  function undoAttempt(entryId: string, height: number) {
    setAthleteData(prev => {
      const athlete = prev[entryId];
      const currentAttempts = athlete.attempts[height] || [];

      if (currentAttempts.length === 0) return prev;

      const newAttempts = currentAttempts.slice(0, -1);

      return {
        ...prev,
        [entryId]: {
          ...athlete,
          attempts: {
            ...athlete.attempts,
            [height]: newAttempts,
          },
          status: 'active', // Reset status when undoing
        },
      };
    });
  }

  function updateStatus(entryId: string, status: 'active' | 'eliminated' | 'retired' | 'NH') {
    setAthleteData(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        status,
      },
    }));
  }

  function updateNotes(entryId: string, notes: string) {
    setAthleteData(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        notes,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Save each athlete's results
      for (const [entryId, data] of Object.entries(athleteData)) {
        // Convert to VerticalAttemptInput format
        const attempts: VerticalAttemptInput[] = [];
        let attemptNumber = 1;

        for (const height of heights) {
          const heightAttempts = data.attempts[height] || [];
          for (const outcome of heightAttempts) {
            attempts.push({
              height,
              attempt_number: attemptNumber++,
              outcome,
            });
          }
        }

        const result = await saveVerticalResult(
          {
            entry_id: entryId,
            attempts,
            status: data.status,
            notes: data.notes || undefined,
          },
          competitionId,
          eventId
        );

        if (result.error) {
          setError(result.error);
          setSaving(false);
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/competitions/${competitionId}/events/${eventId}`);
      }, 1500);
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

  // Calculate standings
  const standings = entries
    .map(entry => {
      const data = athleteData[entry.id];
      if (!data) return null;

      // Find best height cleared
      let bestHeight = 0;
      let totalMisses = 0;
      let missesAtBest = 0;

      for (const height of heights) {
        const attempts = data.attempts[height] || [];
        const cleared = attempts.includes('o');
        const misses = attempts.filter(a => a === 'x').length;

        if (cleared) {
          bestHeight = height;
          missesAtBest = misses;
        }
        totalMisses += misses;
      }

      return {
        entry,
        data,
        bestHeight,
        totalMisses,
        missesAtBest,
      };
    })
    .filter((item): item is VerticalStandingItem => item !== null)
    .sort((a, b) => {
      // Sort by best height (descending)
      if (b.bestHeight !== a.bestHeight) return b.bestHeight - a.bestHeight;
      // Tie-break: fewer misses at best height
      if (a.missesAtBest !== b.missesAtBest) return a.missesAtBest - b.missesAtBest;
      // Tie-break: fewer total misses
      return a.totalMisses - b.totalMisses;
    });

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
            <h1 className="text-2xl font-bold text-gray-900">Vertical Jump Results</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - {competition?.name}
            </p>
          </div>

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

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm">
          Results saved successfully! Redirecting...
        </div>
      )}

      {/* Height Management */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Heights (cm)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {heights.map(height => (
              <div
                key={height}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {height}
                <button
                  onClick={() => removeHeight(height)}
                  className="ml-1 hover:text-blue-600"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newHeight}
                onChange={(e) => setNewHeight(e.target.value)}
                placeholder="Add"
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addHeight}
                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No entries</h3>
          <p className="text-gray-500">
            Add athletes to this event before recording results.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-12 sticky left-0 bg-gray-50">
                  #
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-48 sticky left-12 bg-gray-50">
                  Athlete
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-20">
                  Best
                </th>
                {heights.map(height => (
                  <th
                    key={height}
                    className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 px-2 py-3 w-24"
                  >
                    {height}
                  </th>
                ))}
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-28">
                  Status
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-32">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {standings.map((item: VerticalStandingItem, index: number) => {
                const { entry, data, bestHeight } = item;
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-gray-900 sticky left-0 bg-white">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4 sticky left-12 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {entry.athlete?.first_name} {entry.athlete?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {entry.bib_number ? `#${entry.bib_number}` : ''} {entry.athlete?.club_name || ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-gray-900">
                      {bestHeight > 0 ? `${bestHeight}` : '-'}
                    </td>
                    {heights.map(height => {
                      const attempts = data.attempts[height] || [];
                      return (
                        <td key={height} className="px-2 py-3">
                          <div className="flex flex-col items-center gap-1">
                            {/* Display attempts */}
                            <div className="flex items-center gap-1 text-lg font-mono min-h-[28px]">
                              {attempts.map((outcome: AttemptOutcome, i: number) => (
                                <span
                                  key={i}
                                  className={`w-5 text-center ${
                                    outcome === 'o' ? 'text-green-600' :
                                    outcome === 'x' ? 'text-red-600' :
                                    outcome === '-' ? 'text-gray-400' :
                                    'text-orange-500'
                                  }`}
                                >
                                  {outcome === 'o' ? 'O' : outcome === 'x' ? 'X' : outcome === '-' ? '-' : 'R'}
                                </span>
                              ))}
                            </div>
                            {/* Attempt buttons */}
                            {data.status === 'active' && attempts.length < 3 && !attempts.includes('o') && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => recordAttempt(entry.id, height, 'o')}
                                  className="w-6 h-6 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-bold"
                                  title="Cleared"
                                >
                                  O
                                </button>
                                <button
                                  onClick={() => recordAttempt(entry.id, height, 'x')}
                                  className="w-6 h-6 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 font-bold"
                                  title="Miss"
                                >
                                  X
                                </button>
                                <button
                                  onClick={() => recordAttempt(entry.id, height, '-')}
                                  className="w-6 h-6 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 font-bold"
                                  title="Pass"
                                >
                                  -
                                </button>
                                {attempts.length > 0 && (
                                  <button
                                    onClick={() => undoAttempt(entry.id, height)}
                                    className="w-6 h-6 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                    title="Undo"
                                  >
                                    <RotateCcw className="w-3 h-3 mx-auto" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-4">
                      <select
                        value={data.status}
                        onChange={(e) => updateStatus(entry.id, e.target.value as 'active' | 'eliminated' | 'retired' | 'NH')}
                        className={`w-full px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          data.status === 'active' ? 'bg-green-50 border-green-200 text-green-700' :
                          data.status === 'eliminated' ? 'bg-red-50 border-red-200 text-red-700' :
                          data.status === 'retired' ? 'bg-gray-50 border-gray-200 text-gray-700' :
                          'bg-orange-50 border-orange-200 text-orange-700'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="eliminated">Out (XXX)</option>
                        <option value="retired">Retired</option>
                        <option value="NH">No Height</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={data.notes || ''}
                        onChange={(e) => updateNotes(entry.id, e.target.value)}
                        placeholder="Notes..."
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="text-sm text-gray-500 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-green-600">O</span>
          <span>= Cleared</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-red-600">X</span>
          <span>= Miss</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-gray-400">-</span>
          <span>= Pass</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-orange-500">R</span>
          <span>= Retry (waived miss)</span>
        </div>
      </div>
    </div>
  );
}
