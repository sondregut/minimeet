'use client';

import { useMemo } from 'react';
import { AthleteCard, AthleteData, EventType } from './AthleteCard';

interface ActiveQueueProps {
  athletes: AthleteData[];
  currentIndex: number;
  eventType: EventType;
  onAthleteSelect?: (index: number) => void;
  onLongPress?: (athleteId: string) => void;
}

export function ActiveQueue({
  athletes,
  currentIndex,
  eventType,
  onAthleteSelect,
  onLongPress,
}: ActiveQueueProps) {
  // Get the 4 athletes for the queue: previous, current, next, next+1
  const queueAthletes = useMemo(() => {
    const queue: { athlete: AthleteData; index: number; position: 'previous' | 'current' | 'next' | 'next1' }[] = [];

    // Previous athlete
    if (currentIndex > 0) {
      queue.push({
        athlete: athletes[currentIndex - 1],
        index: currentIndex - 1,
        position: 'previous',
      });
    }

    // Current athlete
    if (currentIndex >= 0 && currentIndex < athletes.length) {
      queue.push({
        athlete: athletes[currentIndex],
        index: currentIndex,
        position: 'current',
      });
    }

    // Next athlete
    if (currentIndex + 1 < athletes.length) {
      queue.push({
        athlete: athletes[currentIndex + 1],
        index: currentIndex + 1,
        position: 'next',
      });
    }

    // Next+1 athlete
    if (currentIndex + 2 < athletes.length) {
      queue.push({
        athlete: athletes[currentIndex + 2],
        index: currentIndex + 2,
        position: 'next1',
      });
    }

    return queue;
  }, [athletes, currentIndex]);

  const getCardSize = (position: string) => {
    switch (position) {
      case 'previous':
        return 'small';
      case 'current':
        return 'current';
      default:
        return 'medium';
    }
  };

  return (
    <div className="space-y-2">
      {queueAthletes.map(({ athlete, index, position }) => (
        <div
          key={athlete.id}
          onClick={() => onAthleteSelect?.(index)}
          className={position !== 'current' ? 'cursor-pointer hover:opacity-80' : ''}
        >
          <AthleteCard
            athlete={athlete}
            size={getCardSize(position) as 'small' | 'current' | 'medium'}
            eventType={eventType}
            onLongPress={() => onLongPress?.(athlete.id)}
          />
        </div>
      ))}

      {queueAthletes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Ingen utøvere i køen
        </div>
      )}
    </div>
  );
}

// Order indicator showing position in the full athlete list
interface OrderIndicatorProps {
  totalAthletes: number;
  currentIndex: number;
  onJumpTo?: (index: number) => void;
}

export function OrderIndicator({
  totalAthletes,
  currentIndex,
  onJumpTo,
}: OrderIndicatorProps) {
  // Show at most 9 numbers centered around current
  const visibleCount = Math.min(9, totalAthletes);
  const halfVisible = Math.floor(visibleCount / 2);

  let startIndex = Math.max(0, currentIndex - halfVisible);
  const endIndex = Math.min(totalAthletes - 1, startIndex + visibleCount - 1);

  // Adjust start if we're near the end
  if (endIndex - startIndex + 1 < visibleCount) {
    startIndex = Math.max(0, endIndex - visibleCount + 1);
  }

  const indicators = [];
  for (let i = startIndex; i <= endIndex; i++) {
    indicators.push(
      <button
        key={i}
        onClick={() => onJumpTo?.(i)}
        className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
          i === currentIndex
            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {i + 1}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 py-2">
      {startIndex > 0 && (
        <span className="text-gray-400 text-sm mr-1">...</span>
      )}
      {indicators}
      {endIndex < totalAthletes - 1 && (
        <span className="text-gray-400 text-sm ml-1">...</span>
      )}
    </div>
  );
}
