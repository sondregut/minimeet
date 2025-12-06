'use client';

import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { ActiveQueue, OrderIndicator } from './ActiveQueue';
import { AthleteData } from './AthleteCard';
import { VerticalAttemptButtons } from './AttemptButtons';
import { HeightControl, StartHeightPrompt } from './HeightControl';
import { VerticalAttemptGrid } from './VerticalAttemptGrid';

export type VerticalAttemptResult = 'O' | 'X' | '-';

export interface VerticalSaveResult {
  athleteId: string;
  height: number; // in cm
  attemptNumber: number; // 1, 2, or 3 for this height
  result: VerticalAttemptResult;
}

export interface VerticalAthleteData extends AthleteData {
  // Heights data: { heightInCm: { attempts: ['O'|'X'|'-'], cleared: boolean } }
  heightsData?: Record<number, {
    attempts: VerticalAttemptResult[];
    cleared: boolean;
  }>;
  highestClearedHeight?: number | null;
  isEliminated?: boolean;
  passedCurrentHeight?: boolean;
}

interface VerticalRegistrationViewProps {
  athletes: VerticalAthleteData[];
  currentAthleteIndex: number;
  currentHeight: number; // in cm
  onSaveResult: (result: VerticalSaveResult) => Promise<void>;
  onAthleteSelect: (index: number) => void;
  onAdvance: () => void;
  onRaiseHeight: () => void;
  onSetHeight: (height: number) => void;
  heightIncrement: number; // in cm
  eventType: 'highJump' | 'poleVault';
  loading?: boolean;
  showStartHeightPrompt?: boolean;
}

export function VerticalRegistrationView({
  athletes,
  currentAthleteIndex,
  currentHeight,
  onSaveResult,
  onAthleteSelect,
  onAdvance,
  onRaiseHeight,
  onSetHeight,
  heightIncrement,
  eventType,
  loading = false,
  showStartHeightPrompt = false,
}: VerticalRegistrationViewProps) {
  const [isSaving, setIsSaving] = useState(false);

  const currentAthlete = athletes[currentAthleteIndex];
  const nextHeight = currentHeight + heightIncrement;

  // Get current attempt number for this athlete at current height
  const getCurrentAttemptInfo = () => {
    if (!currentAthlete?.heightsData?.[currentHeight]) {
      return { attemptNumber: 1, attempts: [] };
    }
    const heightData = currentAthlete.heightsData[currentHeight];
    return {
      attemptNumber: heightData.attempts.length + 1,
      attempts: heightData.attempts,
    };
  };

  const { attemptNumber, attempts } = getCurrentAttemptInfo();

  // Check if current athlete has finished at this height (cleared or 3 fails or passed)
  const isAthleteFinishedAtHeight = () => {
    if (!currentAthlete?.heightsData?.[currentHeight]) return false;
    const heightData = currentAthlete.heightsData[currentHeight];

    // Cleared
    if (heightData.cleared) return true;

    // 3 fails
    const fails = heightData.attempts.filter(a => a === 'X').length;
    if (fails >= 3) return true;

    // Passed (has a '-' and no clear)
    if (heightData.attempts.includes('-') && !heightData.cleared) return true;

    return false;
  };

  const handleAction = useCallback(async (action: 'clear' | 'fail' | 'pass') => {
    if (!currentAthlete || isSaving) return;

    const resultMap: Record<string, VerticalAttemptResult> = {
      clear: 'O',
      fail: 'X',
      pass: '-',
    };

    setIsSaving(true);
    try {
      await onSaveResult({
        athleteId: currentAthlete.id,
        height: currentHeight,
        attemptNumber,
        result: resultMap[action],
      });
      onAdvance();
    } catch (error) {
      console.error('Failed to save result:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentAthlete, isSaving, onSaveResult, currentHeight, attemptNumber, onAdvance]);

  if (showStartHeightPrompt) {
    return (
      <StartHeightPrompt
        eventType={eventType}
        onSetHeight={onSetHeight}
      />
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Ingen utøvere registrert</p>
      </div>
    );
  }

  // Filter out eliminated athletes for the queue
  const activeAthletes = athletes.filter(a => !a.isEliminated);

  return (
    <div className="h-full flex flex-col">
      {/* Height control - always visible at top */}
      <div className="p-4 pb-2">
        <HeightControl
          currentHeight={currentHeight}
          nextHeight={nextHeight}
          onRaiseHeight={onRaiseHeight}
          onSetHeight={onSetHeight}
          increment={heightIncrement}
          loading={loading || isSaving}
          eventType={eventType}
        />
      </div>

      {/* Current athlete's attempt grid */}
      {currentAthlete && (
        <div className="px-4 pb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold">
                  {currentAthlete.firstName} {currentAthlete.lastName}
                </div>
                <div className="text-sm text-gray-500">{currentAthlete.club}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Forsøk</div>
                <div className="font-mono font-bold text-lg">
                  {attemptNumber}/3
                </div>
              </div>
            </div>

            <VerticalAttemptGrid
              heightsData={currentAthlete.heightsData || {}}
              currentHeight={currentHeight}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Active Queue */}
      <div className="flex-1 overflow-y-auto px-4">
        <ActiveQueue
          athletes={activeAthletes}
          currentIndex={currentAthleteIndex}
          eventType="vertical"
          onAthleteSelect={onAthleteSelect}
        />
      </div>

      {/* Action buttons - fixed at bottom */}
      <div className="p-4 bg-white border-t shadow-lg">
        {/* Current height indicator */}
        <div className="text-center mb-3">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium font-mono">
            {(currentHeight / 100).toFixed(2)} m • Forsøk {attemptNumber}
          </span>
        </div>

        <VerticalAttemptButtons
          onAction={handleAction}
          disabled={isSaving || loading || isAthleteFinishedAtHeight()}
        />

        {/* Order indicator */}
        <div className="mt-4">
          <OrderIndicator
            totalAthletes={activeAthletes.length}
            currentIndex={currentAthleteIndex}
            onJumpTo={onAthleteSelect}
          />
        </div>
      </div>
    </div>
  );
}

// Summary component showing all athletes and their heights
interface VerticalSummaryProps {
  athletes: VerticalAthleteData[];
  heights: number[];
  currentHeight: number;
}

export function VerticalSummary({
  athletes,
  heights,
  currentHeight,
}: VerticalSummaryProps) {
  // Sort athletes by highest cleared height, then by fewer attempts
  const sortedAthletes = [...athletes].sort((a, b) => {
    const aHeight = a.highestClearedHeight || 0;
    const bHeight = b.highestClearedHeight || 0;

    if (aHeight !== bHeight) return bHeight - aHeight;

    // If same height, fewer total attempts is better
    const aTotalAttempts = Object.values(a.heightsData || {})
      .reduce((sum, h) => sum + h.attempts.length, 0);
    const bTotalAttempts = Object.values(b.heightsData || {})
      .reduce((sum, h) => sum + h.attempts.length, 0);

    return aTotalAttempts - bTotalAttempts;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left font-medium text-gray-600">Utøver</th>
            {heights.map(height => (
              <th
                key={height}
                className={clsx(
                  'px-2 py-2 text-center font-mono text-xs',
                  height === currentHeight
                    ? 'bg-blue-100 text-blue-700 font-bold'
                    : 'text-gray-600'
                )}
              >
                {(height / 100).toFixed(2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedAthletes.map((athlete, index) => (
            <tr
              key={athlete.id}
              className={clsx(
                'hover:bg-gray-50',
                athlete.isEliminated && 'opacity-50'
              )}
            >
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-gray-400 text-xs">{index + 1}</span>
                  <div>
                    <div className="font-medium truncate max-w-[120px]">
                      {athlete.firstName} {athlete.lastName}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[120px]">
                      {athlete.club}
                    </div>
                  </div>
                </div>
              </td>
              {heights.map(height => {
                const heightData = athlete.heightsData?.[height];
                return (
                  <td
                    key={height}
                    className={clsx(
                      'px-1 py-2 text-center',
                      height === currentHeight && 'bg-blue-50'
                    )}
                  >
                    {heightData ? (
                      <div className="flex justify-center gap-0.5">
                        {heightData.attempts.map((attempt, i) => (
                          <span
                            key={i}
                            className={clsx(
                              'text-xs font-bold',
                              attempt === 'O' && 'text-green-600',
                              attempt === 'X' && 'text-red-600',
                              attempt === '-' && 'text-gray-400'
                            )}
                          >
                            {attempt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
