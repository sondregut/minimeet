'use client';

import { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { Check, X } from 'lucide-react';

export type RollCallStatus = 'present' | 'absent' | null;

export interface StartlistAthlete {
  id: string;
  bibNumber?: string;
  firstName: string;
  lastName: string;
  club?: string;
  ageGroup?: string;
  rollCallStatus: RollCallStatus;
}

interface StartlistViewProps {
  athletes: StartlistAthlete[];
  onRollCallChange: (athleteId: string, status: RollCallStatus) => void;
  loading?: boolean;
}

export function StartlistView({
  athletes,
  onRollCallChange,
  loading = false,
}: StartlistViewProps) {
  const [rollCallMode, setRollCallMode] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">Startliste</h2>
        <button
          onClick={() => setRollCallMode(!rollCallMode)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            rollCallMode
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {rollCallMode ? 'Opprop aktivt' : 'Start opprop'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 p-3 bg-gray-50 border-b text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-600">Totalt:</span>
          <span className="font-semibold">{athletes.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-green-600">
            {athletes.filter(a => a.rollCallStatus === 'present').length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <X className="w-4 h-4 text-red-600" />
          <span className="font-semibold text-red-600">
            {athletes.filter(a => a.rollCallStatus === 'absent').length}
          </span>
        </div>
      </div>

      {/* Athletes list */}
      <div className="flex-1 overflow-y-auto">
        {athletes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Ingen utøvere i startlisten
          </div>
        ) : (
          <div className="divide-y">
            {athletes.map((athlete) => (
              <SwipeableAthleteRow
                key={athlete.id}
                athlete={athlete}
                rollCallMode={rollCallMode}
                onStatusChange={(status) => onRollCallChange(athlete.id, status)}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SwipeableAthleteRowProps {
  athlete: StartlistAthlete;
  rollCallMode: boolean;
  onStatusChange: (status: RollCallStatus) => void;
  loading?: boolean;
}

function SwipeableAthleteRow({
  athlete,
  rollCallMode,
  onStatusChange,
  loading = false,
}: SwipeableAthleteRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);

  const swipeThreshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    // Limit swipe distance
    const maxSwipe = 120;
    setSwipeOffset(Math.max(-maxSwipe, Math.min(maxSwipe, diff)));
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    if (swipeOffset > swipeThreshold) {
      // Swiped right -> present
      onStatusChange('present');
    } else if (swipeOffset < -swipeThreshold) {
      // Swiped left -> absent
      onStatusChange('absent');
    }

    setSwipeOffset(0);
    setIsDragging(false);
  }, [isDragging, swipeOffset, onStatusChange]);

  // Toggle on tap in roll call mode
  const handleTap = useCallback(() => {
    if (!rollCallMode) return;

    // Cycle: null -> present -> absent -> null
    if (athlete.rollCallStatus === null) {
      onStatusChange('present');
    } else if (athlete.rollCallStatus === 'present') {
      onStatusChange('absent');
    } else {
      onStatusChange(null);
    }
  }, [rollCallMode, athlete.rollCallStatus, onStatusChange]);

  return (
    <div className="relative overflow-hidden">
      {/* Background action indicators */}
      <div className="absolute inset-0 flex">
        <div className={clsx(
          'flex-1 flex items-center justify-start pl-4',
          'bg-green-500 text-white'
        )}>
          <Check className="w-6 h-6" />
          <span className="ml-2 font-medium">Tilstede</span>
        </div>
        <div className={clsx(
          'flex-1 flex items-center justify-end pr-4',
          'bg-red-500 text-white'
        )}>
          <span className="mr-2 font-medium">Ikke møtt</span>
          <X className="w-6 h-6" />
        </div>
      </div>

      {/* Swipeable row content */}
      <div
        ref={rowRef}
        className={clsx(
          'relative bg-white p-4 flex items-center gap-3',
          'transition-transform duration-150 ease-out',
          rollCallMode && 'cursor-pointer',
          loading && 'opacity-50'
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        {/* Bib number */}
        {athlete.bibNumber && (
          <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded font-mono font-bold text-sm">
            {athlete.bibNumber}
          </div>
        )}

        {/* Athlete info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {athlete.firstName} {athlete.lastName}
          </div>
          {athlete.club && (
            <div className="text-sm text-gray-500 truncate">
              {athlete.club}
              {athlete.ageGroup && ` • ${athlete.ageGroup}`}
            </div>
          )}
        </div>

        {/* Roll call status */}
        <RollCallBadge status={athlete.rollCallStatus} />
      </div>
    </div>
  );
}

interface RollCallBadgeProps {
  status: RollCallStatus;
}

function RollCallBadge({ status }: RollCallBadgeProps) {
  if (status === null) {
    return (
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <span className="text-lg">?</span>
      </div>
    );
  }

  if (status === 'present') {
    return (
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 text-green-600">
        <Check className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600">
      <X className="w-5 h-5" />
    </div>
  );
}
