'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { RecordBadges } from '@/components/records/RecordBadges';

interface Athlete {
  first_name: string;
  last_name: string;
  nationality: string | null;
  club_name: string | null;
}

// Common record flags for all result types
interface RecordFlags {
  is_pb?: boolean;
  is_sb?: boolean;
  is_mr?: boolean;
  is_cr?: boolean;
  is_clr?: boolean;
  is_nr?: boolean;
}

interface TrackResult extends RecordFlags {
  place: number | null;
  status: string;
  time_display: string | null;
}

interface VerticalResult extends RecordFlags {
  id: string;
  place: number | null;
  best_height: number | null;
  total_misses: number;
  misses_at_best: number;
}

interface VerticalAttempt {
  result_id: string;
  height: number;
  attempt_number: number;
  outcome: 'o' | 'x' | '-' | 'r';
}

interface FieldResult extends RecordFlags {
  id: string;
  place: number | null;
  best_mark: number | null;
  best_mark_wind: number | null;
}

interface FieldAttempt {
  result_id: string;
  attempt_number: number;
  distance: number | null;
  wind: number | null;
  is_foul: boolean;
  is_pass: boolean;
}

interface Entry {
  id: string;
  bib_number: string | null;
  athlete: Athlete | null;
  result: TrackResult | VerticalResult | FieldResult | null;
  attempts?: VerticalAttempt[] | FieldAttempt[];
}

interface LiveResultsTableProps {
  eventId: string;
  eventType: string;
  eventStatus: string;
  initialEntries: Entry[];
  initialHeights?: number[];
}

function formatMark(mark: number, eventType: string): string {
  if (eventType === 'field_vertical') {
    return `${mark.toFixed(2)}`;
  }
  // field_horizontal and throw - mark is in cm
  const meters = mark / 100;
  return `${meters.toFixed(2)}`;
}

function formatHeight(height: number): string {
  return height.toFixed(2);
}

// Get attempts at a specific height for an athlete
function getAttemptsAtHeight(attempts: VerticalAttempt[], height: number): string {
  const heightAttempts = attempts
    .filter(a => a.height === height)
    .sort((a, b) => a.attempt_number - b.attempt_number);

  if (heightAttempts.length === 0) return '';

  return heightAttempts.map(a => {
    switch (a.outcome) {
      case 'o': return 'O';
      case 'x': return 'X';
      case '-': return '-';
      case 'r': return 'r';
      default: return '';
    }
  }).join('');
}

export default function LiveResultsTable({
  eventId,
  eventType,
  eventStatus,
  initialEntries,
  initialHeights = [],
}: LiveResultsTableProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [heights, setHeights] = useState<number[]>(initialHeights);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTrackEvent = eventType === 'track' || eventType === 'relay';
  const isVerticalEvent = eventType === 'field_vertical';
  const isFieldEvent = eventType === 'field_horizontal' || eventType === 'throw';
  const isLive = eventStatus === 'in_progress';

  const fetchResults = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/public/events/${eventId}/results`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        if (data.heights) {
          setHeights(data.heights);
        }
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [eventId]);

  // Poll for updates when event is live
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, [isLive, fetchResults]);

  return (
    <div>
      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center justify-between mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-800">
              Live - Auto-updating every 5 seconds
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-600">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchResults}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 text-red-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          No entries or results available yet.
        </div>
      ) : isVerticalEvent ? (
        // Vertical Jump Results with Height Progression Matrix
        <VerticalResultsTable entries={entries} heights={heights} />
      ) : isFieldEvent ? (
        // Field/Throw Results with Attempt Columns
        <FieldResultsTable entries={entries} eventType={eventType} />
      ) : (
        // Track Results (simple table)
        <TrackResultsTable entries={entries} />
      )}
    </div>
  );
}

// Track Results Table (unchanged from before)
function TrackResultsTable({ entries }: { entries: Entry[] }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3 w-16">Pos</th>
            <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3 w-20">Bib</th>
            <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3">Athlete</th>
            <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3">Team</th>
            <th className="text-right text-sm font-semibold text-gray-700 px-4 py-3 w-32">Time</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const result = entry.result as TrackResult | null;
            const place = result?.place;
            const isWinner = place === 1;
            const isPodium = place && place <= 3;

            return (
              <tr
                key={entry.id}
                className={`border-b last:border-b-0 ${isWinner ? 'bg-yellow-50' : isPodium ? 'bg-gray-50' : ''}`}
              >
                <td className="px-4 py-3">
                  {place ? (
                    <div className="flex items-center gap-1">
                      {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                      <span className={`font-bold ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                        {place}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                  {entry.bib_number || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                    {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {result?.status === 'finished' && result?.time_display ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className={`font-mono font-bold text-lg ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                        {result.time_display}
                      </span>
                      <RecordBadges
                        isPB={result.is_pb}
                        isSB={result.is_sb}
                        isMR={result.is_mr}
                        isCR={result.is_cr}
                        isCLR={result.is_clr}
                        isNR={result.is_nr}
                        showAll
                      />
                    </div>
                  ) : result?.status === 'DNS' ? (
                    <span className="text-gray-400 font-semibold">DNS</span>
                  ) : result?.status === 'DNF' ? (
                    <span className="text-gray-400 font-semibold">DNF</span>
                  ) : result?.status === 'DQ' ? (
                    <span className="text-red-500 font-semibold">DQ</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Vertical Jump Results with Height Progression Matrix
function VerticalResultsTable({ entries, heights }: { entries: Entry[]; heights: number[] }) {
  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full min-w-max">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left text-sm font-semibold text-gray-700 px-3 py-3 w-12 sticky left-0 bg-gray-50">Pos</th>
            <th className="text-left text-sm font-semibold text-gray-700 px-3 py-3 w-16 sticky left-12 bg-gray-50">Bib</th>
            <th className="text-left text-sm font-semibold text-gray-700 px-3 py-3 min-w-[150px] sticky left-28 bg-gray-50">Athlete</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-3 py-3 w-20">Best</th>
            {heights.map(height => (
              <th key={height} className="text-center text-sm font-semibold text-gray-700 px-2 py-3 w-16">
                {formatHeight(height)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const result = entry.result as VerticalResult | null;
            const attempts = (entry.attempts || []) as VerticalAttempt[];
            const place = result?.place;
            const isWinner = place === 1;
            const isPodium = place && place <= 3;

            return (
              <tr
                key={entry.id}
                className={`border-b last:border-b-0 ${isWinner ? 'bg-yellow-50' : isPodium ? 'bg-gray-50' : ''}`}
              >
                <td className="px-3 py-3 sticky left-0 bg-inherit">
                  {place ? (
                    <div className="flex items-center gap-1">
                      {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                      <span className={`font-bold ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                        {place}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3 font-mono font-semibold text-gray-900 sticky left-12 bg-inherit">
                  {entry.bib_number || '-'}
                </td>
                <td className="px-3 py-3 sticky left-28 bg-inherit">
                  <div>
                    <span className={`font-medium ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                      {entry.athlete?.last_name?.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-sm block">
                      {entry.athlete?.club_name || entry.athlete?.nationality || ''}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  {result?.best_height ? (
                    <div className="flex flex-col items-center">
                      <span className={`font-mono font-bold text-lg ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                        {result.best_height.toFixed(2)}
                      </span>
                      <RecordBadges
                        isPB={result.is_pb}
                        isSB={result.is_sb}
                        isMR={result.is_mr}
                        isCR={result.is_cr}
                        isCLR={result.is_clr}
                        isNR={result.is_nr}
                        showAll
                      />
                    </div>
                  ) : (
                    <span className="text-gray-400">NH</span>
                  )}
                </td>
                {heights.map(height => {
                  const attemptsStr = getAttemptsAtHeight(attempts, height);
                  const cleared = attemptsStr.includes('O');
                  const failed = attemptsStr === 'XXX';

                  return (
                    <td key={height} className="px-2 py-3 text-center font-mono text-sm">
                      {attemptsStr ? (
                        <span className={`
                          ${cleared ? 'text-green-600 font-semibold' : ''}
                          ${failed ? 'text-red-500' : ''}
                          ${!cleared && !failed ? 'text-gray-600' : ''}
                        `}>
                          {attemptsStr}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Field/Throw Results with Attempt Columns
function FieldResultsTable({ entries, eventType }: { entries: Entry[]; eventType: string }) {
  const showWind = eventType === 'field_horizontal'; // Only show wind for jumps

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full min-w-max">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left text-sm font-semibold text-gray-700 px-3 py-3 w-12 sticky left-0 bg-gray-50">Pos</th>
            <th className="text-left text-sm font-semibold text-gray-700 px-3 py-3 w-16 sticky left-12 bg-gray-50">Bib</th>
            <th className="text-left text-sm font-semibold text-gray-700 px-3 py-3 min-w-[150px] sticky left-28 bg-gray-50">Athlete</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-3 py-3 w-20">Best</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-2 py-3 w-20">R1</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-2 py-3 w-20">R2</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-2 py-3 w-20">R3</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-2 py-3 w-20">R4</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-2 py-3 w-20">R5</th>
            <th className="text-center text-sm font-semibold text-gray-700 px-2 py-3 w-20">R6</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const result = entry.result as FieldResult | null;
            const attempts = (entry.attempts || []) as FieldAttempt[];
            const place = result?.place;
            const isWinner = place === 1;
            const isPodium = place && place <= 3;

            // Create array of 6 attempts (fill with empty if not all present)
            const attemptsByRound: (FieldAttempt | null)[] = Array(6).fill(null);
            attempts.forEach(a => {
              if (a.attempt_number >= 1 && a.attempt_number <= 6) {
                attemptsByRound[a.attempt_number - 1] = a;
              }
            });

            return (
              <tr
                key={entry.id}
                className={`border-b last:border-b-0 ${isWinner ? 'bg-yellow-50' : isPodium ? 'bg-gray-50' : ''}`}
              >
                <td className="px-3 py-3 sticky left-0 bg-inherit">
                  {place ? (
                    <div className="flex items-center gap-1">
                      {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                      <span className={`font-bold ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                        {place}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3 font-mono font-semibold text-gray-900 sticky left-12 bg-inherit">
                  {entry.bib_number || '-'}
                </td>
                <td className="px-3 py-3 sticky left-28 bg-inherit">
                  <div>
                    <span className={`font-medium ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                      {entry.athlete?.last_name?.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-sm block">
                      {entry.athlete?.club_name || entry.athlete?.nationality || ''}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  {result?.best_mark ? (
                    <div className="flex flex-col items-center">
                      <span className={`font-mono font-bold text-lg ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                        {formatMark(result.best_mark, eventType)}
                      </span>
                      {showWind && result.best_mark_wind !== null && (
                        <span className="text-gray-400 text-xs">
                          ({result.best_mark_wind > 0 ? '+' : ''}{result.best_mark_wind})
                        </span>
                      )}
                      <RecordBadges
                        isPB={result.is_pb}
                        isSB={result.is_sb}
                        isMR={result.is_mr}
                        isCR={result.is_cr}
                        isCLR={result.is_clr}
                        isNR={result.is_nr}
                        showAll
                      />
                    </div>
                  ) : (
                    <span className="text-gray-400">NM</span>
                  )}
                </td>
                {attemptsByRound.map((attempt, idx) => {
                  const isBestAttempt = attempt?.distance === result?.best_mark && attempt?.distance !== null;

                  return (
                    <td key={idx} className="px-2 py-3 text-center">
                      {attempt ? (
                        attempt.is_foul ? (
                          <span className="text-red-500 font-semibold">X</span>
                        ) : attempt.is_pass ? (
                          <span className="text-gray-400">-</span>
                        ) : attempt.distance ? (
                          <div>
                            <span className={`font-mono text-sm ${isBestAttempt ? 'font-bold text-green-600' : 'text-gray-700'}`}>
                              {formatMark(attempt.distance, eventType)}
                            </span>
                            {showWind && attempt.wind !== null && (
                              <span className="text-gray-400 text-xs block">
                                ({attempt.wind > 0 ? '+' : ''}{attempt.wind})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
