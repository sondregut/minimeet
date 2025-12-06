'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Medal } from 'lucide-react';
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
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-800">
              Direkte - Oppdateres automatisk hvert 5. sekund
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-600">
              Sist oppdatert: {lastUpdated.toLocaleTimeString('nb-NO')}
            </span>
            <button
              onClick={fetchResults}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
              title="Oppdater nå"
            >
              <RefreshCw
                className={`w-4 h-4 text-red-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Medal className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-lg font-medium text-slate-700 mb-1">Ingen resultater ennå</p>
          <p className="text-sm">Resultatene vises her når de er tilgjengelige</p>
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

// Track Results Table
function TrackResultsTable({ entries }: { entries: Entry[] }) {
  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3 w-16">Plass</th>
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3 w-20">Nr</th>
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">Utøver</th>
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">Klubb</th>
            <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3 w-32">Tid</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const result = entry.result as TrackResult | null;
            const place = result?.place;
            const isWinner = place === 1;
            const isPodium = place && place <= 3;

            return (
              <tr
                key={entry.id}
                className={`transition-colors ${
                  isWinner
                    ? 'bg-amber-50'
                    : isPodium
                      ? 'bg-slate-50/50'
                      : 'hover:bg-slate-50/50'
                }`}
              >
                <td className="px-4 py-3">
                  {place ? (
                    <div className="flex items-center gap-1.5">
                      {isWinner && <Trophy className="w-4 h-4 text-amber-500" />}
                      <span className={`font-bold ${isWinner ? 'text-amber-700' : isPodium ? 'text-slate-700' : 'text-slate-900'}`}>
                        {place}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                  {entry.bib_number || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
                    {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {result?.status === 'finished' && result?.time_display ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className={`font-mono font-bold text-lg ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
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
                    <span className="text-slate-400 font-semibold">DNS</span>
                  ) : result?.status === 'DNF' ? (
                    <span className="text-slate-400 font-semibold">DNF</span>
                  ) : result?.status === 'DQ' ? (
                    <span className="text-red-500 font-semibold">DQ</span>
                  ) : (
                    <span className="text-slate-400">-</span>
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-max">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 w-12 sticky left-0 bg-slate-50 z-10">Plass</th>
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 w-16 sticky left-12 bg-slate-50 z-10">Nr</th>
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 min-w-[150px] sticky left-28 bg-slate-50 z-10">Utøver</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 w-20">Beste</th>
            {heights.map(height => (
              <th key={height} className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-3 w-16">
                {formatHeight(height)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const result = entry.result as VerticalResult | null;
            const attempts = (entry.attempts || []) as VerticalAttempt[];
            const place = result?.place;
            const isWinner = place === 1;
            const isPodium = place && place <= 3;

            return (
              <tr
                key={entry.id}
                className={`transition-colors ${
                  isWinner
                    ? 'bg-amber-50'
                    : isPodium
                      ? 'bg-slate-50/50'
                      : 'hover:bg-slate-50/50'
                }`}
              >
                <td className={`px-3 py-3 sticky left-0 z-10 ${isWinner ? 'bg-amber-50' : isPodium ? 'bg-slate-50/50' : 'bg-white'}`}>
                  {place ? (
                    <div className="flex items-center gap-1">
                      {isWinner && <Trophy className="w-4 h-4 text-amber-500" />}
                      <span className={`font-bold ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
                        {place}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className={`px-3 py-3 font-mono font-semibold text-slate-700 sticky left-12 z-10 ${isWinner ? 'bg-amber-50' : isPodium ? 'bg-slate-50/50' : 'bg-white'}`}>
                  {entry.bib_number || '-'}
                </td>
                <td className={`px-3 py-3 sticky left-28 z-10 ${isWinner ? 'bg-amber-50' : isPodium ? 'bg-slate-50/50' : 'bg-white'}`}>
                  <div>
                    <span className={`font-medium ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
                      {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                    </span>
                    <span className="text-slate-500 text-sm block">
                      {entry.athlete?.club_name || entry.athlete?.nationality || ''}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  {result?.best_height ? (
                    <div className="flex flex-col items-center">
                      <span className={`font-mono font-bold text-lg ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
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
                    <span className="text-slate-400">NH</span>
                  )}
                </td>
                {heights.map(height => {
                  const attemptsStr = getAttemptsAtHeight(attempts, height);
                  const cleared = attemptsStr.includes('O');
                  const failed = attemptsStr === 'XXX';
                  const retired = attemptsStr.includes('r');

                  return (
                    <td key={height} className="px-2 py-3 text-center font-mono text-sm">
                      {attemptsStr ? (
                        <span className={`
                          ${cleared ? 'text-emerald-600 font-semibold' : ''}
                          ${failed ? 'text-red-500' : ''}
                          ${retired ? 'text-orange-500 font-medium' : ''}
                          ${!cleared && !failed && !retired ? 'text-slate-600' : ''}
                        `}>
                          {attemptsStr}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-max">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 w-12 sticky left-0 bg-slate-50 z-10">Plass</th>
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 w-16 sticky left-12 bg-slate-50 z-10">Nr</th>
            <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 min-w-[150px] sticky left-28 bg-slate-50 z-10">Utøver</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-3 w-20">Beste</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-3 w-20">1</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-3 w-20">2</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-3 w-20">3</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-3 w-20">4</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-3 w-20">5</th>
            <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-3 w-20">6</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
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
                className={`transition-colors ${
                  isWinner
                    ? 'bg-amber-50'
                    : isPodium
                      ? 'bg-slate-50/50'
                      : 'hover:bg-slate-50/50'
                }`}
              >
                <td className={`px-3 py-3 sticky left-0 z-10 ${isWinner ? 'bg-amber-50' : isPodium ? 'bg-slate-50/50' : 'bg-white'}`}>
                  {place ? (
                    <div className="flex items-center gap-1">
                      {isWinner && <Trophy className="w-4 h-4 text-amber-500" />}
                      <span className={`font-bold ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
                        {place}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className={`px-3 py-3 font-mono font-semibold text-slate-700 sticky left-12 z-10 ${isWinner ? 'bg-amber-50' : isPodium ? 'bg-slate-50/50' : 'bg-white'}`}>
                  {entry.bib_number || '-'}
                </td>
                <td className={`px-3 py-3 sticky left-28 z-10 ${isWinner ? 'bg-amber-50' : isPodium ? 'bg-slate-50/50' : 'bg-white'}`}>
                  <div>
                    <span className={`font-medium ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
                      {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                    </span>
                    <span className="text-slate-500 text-sm block">
                      {entry.athlete?.club_name || entry.athlete?.nationality || ''}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  {result?.best_mark ? (
                    <div className="flex flex-col items-center">
                      <span className={`font-mono font-bold text-lg ${isWinner ? 'text-amber-700' : 'text-slate-900'}`}>
                        {formatMark(result.best_mark, eventType)}
                      </span>
                      {showWind && result.best_mark_wind !== null && (
                        <span className="text-slate-400 text-xs">
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
                    <span className="text-slate-400">NM</span>
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
                          <span className="text-slate-400">-</span>
                        ) : attempt.distance ? (
                          <div>
                            <span className={`font-mono text-sm ${isBestAttempt ? 'font-bold text-emerald-600' : 'text-slate-700'}`}>
                              {formatMark(attempt.distance, eventType)}
                            </span>
                            {showWind && attempt.wind !== null && (
                              <span className="text-slate-400 text-xs block">
                                ({attempt.wind > 0 ? '+' : ''}{attempt.wind})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
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
