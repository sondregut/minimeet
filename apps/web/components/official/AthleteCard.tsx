'use client';

import { clsx } from 'clsx';

export type AthleteCardSize = 'small' | 'current' | 'medium';
export type EventType = 'horizontal' | 'vertical';

export interface HorizontalAttempt {
  attemptNumber: number;
  distance: number | null;
  isFoul: boolean;
  isPass: boolean;
  wind?: number | null;
}

export interface VerticalAttempt {
  height: number;
  attempts: ('O' | 'X' | '-' | null)[];
}

export interface AthleteData {
  id: string;
  bibNumber?: string;
  firstName: string;
  lastName: string;
  club?: string;
  ageGroup?: string;
  bestResult?: number | null;
  currentRound?: number;
  currentAttempt?: number;
  horizontalAttempts?: HorizontalAttempt[];
  verticalAttempts?: VerticalAttempt[];
  isEliminated?: boolean;
  isFinished?: boolean;
}

interface AthleteCardProps {
  athlete: AthleteData;
  size: AthleteCardSize;
  eventType: EventType;
  onLongPress?: () => void;
}

export function AthleteCard({
  athlete,
  size,
  eventType,
  onLongPress,
}: AthleteCardProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onLongPress?.();
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-sm border transition-all',
        {
          // Size variations
          'p-2 opacity-60': size === 'small',
          'p-4 ring-2 ring-blue-500 shadow-lg': size === 'current',
          'p-3': size === 'medium',
          // Status variations
          'opacity-50 bg-gray-50': athlete.isEliminated || athlete.isFinished,
        }
      )}
      onContextMenu={handleContextMenu}
    >
      {/* Header: Name and club */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {athlete.bibNumber && (
            <span
              className={clsx(
                'font-mono font-bold bg-gray-100 rounded px-1.5',
                size === 'current' ? 'text-lg' : 'text-sm'
              )}
            >
              {athlete.bibNumber}
            </span>
          )}
          <div className="min-w-0">
            <div
              className={clsx(
                'font-semibold truncate',
                size === 'current' ? 'text-lg' : 'text-sm'
              )}
            >
              {athlete.firstName} {athlete.lastName}
            </div>
            {athlete.club && size !== 'small' && (
              <div className="text-xs text-gray-500 truncate">
                {athlete.club}
                {athlete.ageGroup && ` • ${athlete.ageGroup}`}
              </div>
            )}
          </div>
        </div>

        {/* Best result badge */}
        {athlete.bestResult && (
          <div
            className={clsx(
              'flex-shrink-0 font-bold rounded px-2 py-0.5',
              size === 'current'
                ? 'bg-green-100 text-green-700 text-base'
                : 'bg-gray-100 text-gray-700 text-xs'
            )}
          >
            {formatDistance(athlete.bestResult)}
          </div>
        )}
      </div>

      {/* Attempts display - only for current and medium cards */}
      {size !== 'small' && (
        <div className="mt-2">
          {eventType === 'horizontal' ? (
            <HorizontalAttemptsDisplay
              attempts={athlete.horizontalAttempts || []}
              size={size}
              onLongPress={onLongPress}
            />
          ) : (
            <VerticalAttemptsDisplay
              attempts={athlete.verticalAttempts || []}
              size={size}
              onLongPress={onLongPress}
            />
          )}
        </div>
      )}

      {/* Round/Attempt info for current card */}
      {size === 'current' && athlete.currentRound && (
        <div className="mt-2 text-sm text-gray-500">
          Runde {athlete.currentRound}
          {athlete.currentAttempt && ` • Forsøk ${athlete.currentAttempt}`}
        </div>
      )}
    </div>
  );
}

interface HorizontalAttemptsDisplayProps {
  attempts: HorizontalAttempt[];
  size: AthleteCardSize;
  onLongPress?: () => void;
}

function HorizontalAttemptsDisplay({
  attempts,
  size,
  onLongPress,
}: HorizontalAttemptsDisplayProps) {
  // Fill to 6 attempts
  const displayAttempts = [...attempts];
  while (displayAttempts.length < 6) {
    displayAttempts.push({
      attemptNumber: displayAttempts.length + 1,
      distance: null,
      isFoul: false,
      isPass: false,
    });
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {displayAttempts.map((attempt, index) => (
        <AttemptBadge
          key={index}
          attempt={attempt}
          size={size}
          onLongPress={onLongPress}
        />
      ))}
    </div>
  );
}

interface AttemptBadgeProps {
  attempt: HorizontalAttempt;
  size: AthleteCardSize;
  onLongPress?: () => void;
}

function AttemptBadge({ attempt, size, onLongPress }: AttemptBadgeProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (attempt.distance !== null || attempt.isFoul || attempt.isPass) {
      onLongPress?.();
    }
  };

  const isEmpty = attempt.distance === null && !attempt.isFoul && !attempt.isPass;

  return (
    <div
      className={clsx(
        'rounded font-mono text-center min-w-[3rem]',
        size === 'current' ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-xs',
        {
          'bg-gray-100 text-gray-400': isEmpty,
          'bg-red-100 text-red-600 font-bold': attempt.isFoul,
          'bg-gray-200 text-gray-500': attempt.isPass,
          'bg-blue-50 text-blue-700': !isEmpty && !attempt.isFoul && !attempt.isPass,
        }
      )}
      onContextMenu={handleContextMenu}
    >
      {isEmpty ? '-' : attempt.isFoul ? 'X' : attempt.isPass ? '-' : formatDistance(attempt.distance!)}
    </div>
  );
}

interface VerticalAttemptsDisplayProps {
  attempts: VerticalAttempt[];
  size: AthleteCardSize;
  onLongPress?: () => void;
}

function VerticalAttemptsDisplay({
  attempts,
  size,
  onLongPress,
}: VerticalAttemptsDisplayProps) {
  if (attempts.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        Ingen forsøk registrert
      </div>
    );
  }

  // Show compact view for medium cards, full grid for current
  const displayAttempts = size === 'current' ? attempts : attempts.slice(-3);

  return (
    <div className="space-y-1">
      {displayAttempts.map((heightAttempts, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className={clsx(
              'font-mono text-gray-500 min-w-[3rem]',
              size === 'current' ? 'text-sm' : 'text-xs'
            )}
          >
            {formatHeight(heightAttempts.height)}
          </span>
          <div className="flex gap-0.5">
            {heightAttempts.attempts.map((result, attemptIndex) => (
              <VerticalAttemptCell
                key={attemptIndex}
                result={result}
                size={size}
                onLongPress={onLongPress}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface VerticalAttemptCellProps {
  result: 'O' | 'X' | '-' | null;
  size: AthleteCardSize;
  onLongPress?: () => void;
}

function VerticalAttemptCell({ result, size, onLongPress }: VerticalAttemptCellProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (result !== null) {
      onLongPress?.();
    }
  };

  return (
    <div
      className={clsx(
        'w-6 h-6 flex items-center justify-center rounded font-bold',
        size === 'current' ? 'text-sm' : 'text-xs',
        {
          'bg-gray-100 text-gray-300': result === null,
          'bg-green-100 text-green-600': result === 'O',
          'bg-red-100 text-red-600': result === 'X',
          'bg-gray-200 text-gray-500': result === '-',
        }
      )}
      onContextMenu={handleContextMenu}
    >
      {result || '_'}
    </div>
  );
}

// Helper functions
function formatDistance(distance: number): string {
  // Distance is stored in centimeters, display in meters
  if (distance >= 100) {
    return (distance / 100).toFixed(2);
  }
  return distance.toFixed(2);
}

function formatHeight(height: number): string {
  // Height is stored in centimeters
  if (height >= 100) {
    return (height / 100).toFixed(2);
  }
  return height.toFixed(2);
}
