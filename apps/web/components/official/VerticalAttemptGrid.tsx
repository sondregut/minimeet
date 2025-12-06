'use client';

import { clsx } from 'clsx';

type VerticalAttemptResult = 'O' | 'X' | '-';

interface HeightData {
  attempts: VerticalAttemptResult[];
  cleared: boolean;
}

interface VerticalAttemptGridProps {
  heightsData: Record<number, HeightData>;
  currentHeight?: number;
  compact?: boolean;
}

export function VerticalAttemptGrid({
  heightsData,
  currentHeight,
  compact = false,
}: VerticalAttemptGridProps) {
  // Get all heights sorted in descending order
  const heights = Object.keys(heightsData)
    .map(Number)
    .sort((a, b) => b - a);

  // Include current height if not already in data
  if (currentHeight && !heights.includes(currentHeight)) {
    heights.push(currentHeight);
    heights.sort((a, b) => b - a);
  }

  if (heights.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-2">
        Ingen forsøk registrert
      </div>
    );
  }

  const formatHeight = (cm: number) => (cm / 100).toFixed(2);

  return (
    <div className={clsx(
      'flex flex-wrap gap-2',
      compact && 'gap-1'
    )}>
      {heights.map(height => {
        const data = heightsData[height];
        const attempts = data?.attempts || [];
        const isCurrent = height === currentHeight;
        const cleared = data?.cleared;

        return (
          <div
            key={height}
            className={clsx(
              'rounded-lg p-2 border',
              compact && 'p-1',
              isCurrent
                ? 'bg-blue-50 border-blue-300'
                : cleared
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            )}
          >
            {/* Height label */}
            <div
              className={clsx(
                'font-mono text-center mb-1',
                compact ? 'text-xs' : 'text-sm',
                isCurrent ? 'font-bold text-blue-700' : 'text-gray-600'
              )}
            >
              {formatHeight(height)}
            </div>

            {/* Attempts */}
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map(attemptIndex => {
                const attempt = attempts[attemptIndex];
                return (
                  <AttemptCell
                    key={attemptIndex}
                    result={attempt}
                    compact={compact}
                    isCurrent={isCurrent && attemptIndex === attempts.length}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Individual attempt cell
interface AttemptCellProps {
  result?: VerticalAttemptResult;
  compact?: boolean;
  isCurrent?: boolean;
}

function AttemptCell({ result, compact = false, isCurrent = false }: AttemptCellProps) {
  const size = compact ? 'w-5 h-5 text-xs' : 'w-7 h-7 text-sm';

  if (!result) {
    return (
      <div
        className={clsx(
          size,
          'rounded flex items-center justify-center font-bold',
          isCurrent
            ? 'bg-blue-200 border-2 border-blue-400 animate-pulse'
            : 'bg-gray-100 border border-gray-200'
        )}
      >
        {isCurrent ? '?' : ''}
      </div>
    );
  }

  const colors = {
    O: 'bg-green-500 text-white',
    X: 'bg-red-500 text-white',
    '-': 'bg-gray-300 text-gray-600',
  };

  return (
    <div
      className={clsx(
        size,
        'rounded flex items-center justify-center font-bold',
        colors[result]
      )}
    >
      {result}
    </div>
  );
}

// Compact inline display for athlete cards
interface InlineAttemptDisplayProps {
  heightsData: Record<number, HeightData>;
  maxHeights?: number;
}

export function InlineAttemptDisplay({
  heightsData,
  maxHeights = 4,
}: InlineAttemptDisplayProps) {
  const heights = Object.keys(heightsData)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, maxHeights);

  if (heights.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  const formatHeight = (cm: number) => (cm / 100).toFixed(2);

  return (
    <div className="flex gap-2 text-xs font-mono">
      {heights.map(height => {
        const data = heightsData[height];
        const attempts = data?.attempts || [];

        return (
          <span key={height} className="flex items-center gap-0.5">
            <span className="text-gray-500">{formatHeight(height)}:</span>
            {attempts.map((a, i) => (
              <span
                key={i}
                className={clsx(
                  'font-bold',
                  a === 'O' && 'text-green-600',
                  a === 'X' && 'text-red-600',
                  a === '-' && 'text-gray-400'
                )}
              >
                {a}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}

// Full history view for a single athlete
interface AthleteHeightHistoryProps {
  heightsData: Record<number, HeightData>;
  athleteName: string;
  highestCleared?: number | null;
}

export function AthleteHeightHistory({
  heightsData,
  athleteName,
  highestCleared,
}: AthleteHeightHistoryProps) {
  const heights = Object.keys(heightsData)
    .map(Number)
    .sort((a, b) => a - b); // Ascending for history

  const formatHeight = (cm: number) => (cm / 100).toFixed(2);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{athleteName}</h3>
        {highestCleared && (
          <div className="text-sm">
            <span className="text-gray-500">Beste: </span>
            <span className="font-mono font-bold text-green-600">
              {formatHeight(highestCleared)} m
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {heights.map(height => {
          const data = heightsData[height];
          const attempts = data?.attempts || [];
          const cleared = data?.cleared;

          return (
            <div
              key={height}
              className={clsx(
                'flex items-center gap-3 p-2 rounded-lg',
                cleared ? 'bg-green-50' : 'bg-gray-50'
              )}
            >
              <div className="w-16 font-mono font-medium">
                {formatHeight(height)} m
              </div>

              <div className="flex gap-1 flex-1">
                {attempts.map((attempt, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'w-8 h-8 rounded flex items-center justify-center font-bold',
                      attempt === 'O' && 'bg-green-500 text-white',
                      attempt === 'X' && 'bg-red-500 text-white',
                      attempt === '-' && 'bg-gray-300 text-gray-600'
                    )}
                  >
                    {attempt}
                  </span>
                ))}
                {/* Empty slots */}
                {[...Array(3 - attempts.length)].map((_, i) => (
                  <span
                    key={`empty-${i}`}
                    className="w-8 h-8 rounded flex items-center justify-center bg-gray-100 border border-gray-200"
                  />
                ))}
              </div>

              {cleared && (
                <div className="text-green-600 text-sm font-medium">
                  Klarert
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
