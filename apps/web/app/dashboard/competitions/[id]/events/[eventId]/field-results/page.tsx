'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Wind, RotateCcw } from 'lucide-react';
import { getEntriesByEvent } from '@/lib/actions/entries';
import { getEvent } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';
import { saveFieldResult, getFieldResultsByEvent, type FieldAttemptInput } from '@/lib/actions/results';

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

interface AttemptData {
  distance: string;
  wind: string;
  is_foul: boolean;
  is_pass: boolean;
}

interface AthleteAttempts {
  entry_id: string;
  attempts: AttemptData[];
  status: 'active' | 'complete' | 'retired' | 'NM' | 'ND';
  notes: string;
}

const MAX_ATTEMPTS = 6;

interface StandingItem {
  entry: Entry;
  data: AthleteAttempts;
  bestMark: number;
  bestLegalMark: number;
}

export default function FieldResultsPage() {
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

  // Number of attempts allowed (3 for qualifying, 6 for finals)
  const [numAttempts, setNumAttempts] = useState(6);

  // Attempts data for each athlete
  const [athleteData, setAthleteData] = useState<Record<string, AthleteAttempts>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [entriesData, eventData, competitionData, existingResults] = await Promise.all([
          getEntriesByEvent(eventId),
          getEvent(eventId),
          getCompetition(competitionId),
          getFieldResultsByEvent(eventId),
        ]);

        setEntries(entriesData as Entry[]);
        setEvent(eventData);
        setCompetition(competitionData);

        // Initialize athlete data
        const initialData: Record<string, AthleteAttempts> = {};

        // First, load any existing results
        for (const result of existingResults) {
          if (!result.entry?.id) continue;

          const attempts: AttemptData[] = (result.attempts || [])
            .sort((a: { attempt_number: number }, b: { attempt_number: number }) => a.attempt_number - b.attempt_number)
            .map((a: { distance: number | null; wind: number | null; is_foul: boolean; is_pass: boolean }) => ({
              distance: a.distance ? (a.distance / 100).toFixed(2) : '',
              wind: a.wind ? a.wind.toString() : '',
              is_foul: a.is_foul,
              is_pass: a.is_pass,
            }));

          // Pad with empty attempts
          while (attempts.length < MAX_ATTEMPTS) {
            attempts.push({ distance: '', wind: '', is_foul: false, is_pass: false });
          }

          initialData[result.entry.id] = {
            entry_id: result.entry.id,
            attempts,
            status: result.status as 'active' | 'complete' | 'retired' | 'NM' | 'ND',
            notes: result.notes || '',
          };
        }

        // Initialize missing entries
        for (const entry of entriesData as Entry[]) {
          if (!initialData[entry.id]) {
            const emptyAttempts: AttemptData[] = [];
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
              emptyAttempts.push({ distance: '', wind: '', is_foul: false, is_pass: false });
            }
            initialData[entry.id] = {
              entry_id: entry.id,
              attempts: emptyAttempts,
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

  function updateAttempt(
    entryId: string,
    attemptIndex: number,
    field: keyof AttemptData,
    value: string | boolean
  ) {
    setAthleteData(prev => {
      const athlete = prev[entryId];
      const newAttempts = [...athlete.attempts];
      newAttempts[attemptIndex] = {
        ...newAttempts[attemptIndex],
        [field]: value,
      };

      // If marking as foul or pass, clear distance
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

  function updateStatus(entryId: string, status: 'active' | 'complete' | 'retired' | 'NM' | 'ND') {
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

  function clearAttempt(entryId: string, attemptIndex: number) {
    setAthleteData(prev => {
      const athlete = prev[entryId];
      const newAttempts = [...athlete.attempts];
      newAttempts[attemptIndex] = { distance: '', wind: '', is_foul: false, is_pass: false };

      return {
        ...prev,
        [entryId]: {
          ...athlete,
          attempts: newAttempts,
        },
      };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Save each athlete's results
      for (const [entryId, data] of Object.entries(athleteData)) {
        // Convert to FieldAttemptInput format
        const attempts: FieldAttemptInput[] = data.attempts
          .slice(0, numAttempts)
          .map((a, i) => ({
            attempt_number: i + 1,
            distance: a.distance ? Math.round(parseFloat(a.distance) * 100) : undefined, // Convert m to cm
            wind: a.wind ? parseFloat(a.wind) : undefined,
            is_foul: a.is_foul,
            is_pass: a.is_pass,
          }))
          .filter(a => a.distance !== undefined || a.is_foul || a.is_pass);

        const result = await saveFieldResult(
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

      // Find best mark
      let bestMark = 0;
      let bestLegalMark = 0;

      for (const attempt of data.attempts) {
        if (attempt.is_foul || attempt.is_pass || !attempt.distance) continue;
        const distance = parseFloat(attempt.distance);
        if (!isNaN(distance)) {
          if (distance > bestMark) bestMark = distance;
          // Legal = wind <= 2.0
          const wind = parseFloat(attempt.wind);
          if (isNaN(wind) || wind <= 2.0) {
            if (distance > bestLegalMark) bestLegalMark = distance;
          }
        }
      }

      return {
        entry,
        data,
        bestMark,
        bestLegalMark,
      };
    })
    .filter((item): item is StandingItem => item !== null)
    .sort((a, b) => b.bestMark - a.bestMark);

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
            <h1 className="text-2xl font-bold text-gray-900">Field Results</h1>
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

      {/* Settings */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Attempts:</label>
          <select
            value={numAttempts}
            onChange={(e) => setNumAttempts(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value={3}>3 (Qualifying)</option>
            <option value={6}>6 (Finals)</option>
          </select>
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
                {Array.from({ length: numAttempts }, (_, i) => (
                  <th
                    key={i}
                    className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 px-2 py-3 w-32"
                  >
                    Attempt {i + 1}
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
              {standings.map((item: StandingItem, index: number) => {
                const { entry, data, bestMark } = item;
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
                      {bestMark > 0 ? bestMark.toFixed(2) : '-'}
                    </td>
                    {data.attempts.slice(0, numAttempts).map((attempt: AttemptData, attemptIndex: number) => (
                      <td key={attemptIndex} className="px-2 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={attempt.is_foul ? 'X' : attempt.is_pass ? '-' : attempt.distance}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                if (val === 'X') {
                                  updateAttempt(entry.id, attemptIndex, 'is_foul', true);
                                } else if (val === '-') {
                                  updateAttempt(entry.id, attemptIndex, 'is_pass', true);
                                } else {
                                  updateAttempt(entry.id, attemptIndex, 'distance', val);
                                }
                              }}
                              placeholder="0.00"
                              className={`w-16 px-2 py-1 border rounded text-center text-sm font-mono ${
                                attempt.is_foul ? 'bg-red-50 border-red-300 text-red-700' :
                                attempt.is_pass ? 'bg-gray-100 border-gray-300 text-gray-500' :
                                'border-gray-300'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                            <div className="flex items-center gap-0.5 text-gray-400">
                              <Wind className="w-3 h-3" />
                              <input
                                type="text"
                                value={attempt.wind}
                                onChange={(e) => updateAttempt(entry.id, attemptIndex, 'wind', e.target.value)}
                                placeholder="0.0"
                                disabled={attempt.is_foul || attempt.is_pass}
                                className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs font-mono disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              onClick={() => clearAttempt(entry.id, attemptIndex)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Clear"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-4">
                      <select
                        value={data.status}
                        onChange={(e) => updateStatus(entry.id, e.target.value as 'active' | 'complete' | 'retired' | 'NM' | 'ND')}
                        className={`w-full px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          data.status === 'active' ? 'bg-green-50 border-green-200 text-green-700' :
                          data.status === 'complete' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          data.status === 'retired' ? 'bg-gray-50 border-gray-200 text-gray-700' :
                          data.status === 'NM' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                          'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="complete">Complete</option>
                        <option value="retired">Retired</option>
                        <option value="NM">No Mark</option>
                        <option value="ND">No Distance</option>
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
      <div className="text-sm text-gray-500 space-y-1">
        <p><strong>Distance:</strong> Enter in meters (e.g., 6.52)</p>
        <p><strong>X</strong> = Foul, <strong>-</strong> = Pass</p>
        <p><strong>Wind:</strong> Positive = tailwind, Negative = headwind. Legal limit: +2.0 m/s</p>
      </div>
    </div>
  );
}
