'use client';

import { useState, useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  SwipeableViews,
  StartlistView,
  VerticalRegistrationView,
  LiveResultsView,
  VerticalSummary,
} from '@/components/official';
import type {
  StartlistAthlete,
  RollCallStatus,
  VerticalSaveResult,
  VerticalAthleteData,
  LiveResult,
} from '@/components/official';

type VerticalAttemptResult = 'O' | 'X' | '-';

interface Entry {
  id: string;
  bib_number: string;
  athletes: {
    first_name: string;
    last_name: string;
    club: string;
  }[];
  roll_call_status?: RollCallStatus;
}

interface VerticalAttempt {
  id: string;
  entry_id: string;
  height: number;
  attempt_number: number;
  result: VerticalAttemptResult;
}

interface Props {
  event: {
    id: string;
    name: string;
    status: string;
    event_type?: string; // 'high_jump' or 'pole_vault'
  };
  entries: Entry[];
  heights?: number[];
  existingAttempts?: VerticalAttempt[];
  heightIncrement?: number; // in cm, e.g., 3 for high jump, 5 for pole vault
}

export default function OfficialVerticalRecording({
  event,
  entries,
  heights: initialHeights = [],
  existingAttempts = [],
  heightIncrement = 3,
}: Props) {
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState(0);
  const [currentHeight, setCurrentHeight] = useState<number | null>(
    initialHeights.length > 0 ? initialHeights[0] : null
  );
  const [heights, setHeights] = useState<number[]>(initialHeights);
  const [localEntries, setLocalEntries] = useState<Entry[]>(entries);
  const [localAttempts, setLocalAttempts] = useState<VerticalAttempt[]>(existingAttempts);
  const [loading, setLoading] = useState(false);

  const eventType = event.event_type === 'pole_vault' ? 'poleVault' : 'highJump';
  const showStartHeightPrompt = currentHeight === null;

  // Transform entries to StartlistAthlete format
  const startlistAthletes: StartlistAthlete[] = useMemo(() =>
    localEntries.map((entry) => ({
      id: entry.id,
      bibNumber: entry.bib_number,
      firstName: entry.athletes[0]?.first_name || '',
      lastName: entry.athletes[0]?.last_name || '',
      club: entry.athletes[0]?.club,
      rollCallStatus: entry.roll_call_status || null,
    })),
    [localEntries]
  );

  // Transform entries to VerticalAthleteData format with attempt history
  const athleteData: VerticalAthleteData[] = useMemo(() => {
    // Filter only present athletes for competition
    const presentEntries = localEntries.filter(
      (e) => e.roll_call_status === 'present' || !e.roll_call_status
    );

    return presentEntries.map((entry) => {
      // Get all attempts for this athlete
      const athleteAttempts = localAttempts.filter((a) => a.entry_id === entry.id);

      // Build heightsData structure
      const heightsData: Record<number, { attempts: VerticalAttemptResult[]; cleared: boolean }> = {};

      athleteAttempts.forEach((attempt) => {
        if (!heightsData[attempt.height]) {
          heightsData[attempt.height] = { attempts: [], cleared: false };
        }
        heightsData[attempt.height].attempts.push(attempt.result);
        if (attempt.result === 'O') {
          heightsData[attempt.height].cleared = true;
        }
      });

      // Calculate highest cleared height
      const clearedHeights = Object.entries(heightsData)
        .filter(([, data]) => data.cleared)
        .map(([height]) => parseInt(height));
      const highestClearedHeight = clearedHeights.length > 0
        ? Math.max(...clearedHeights)
        : null;

      // Check if athlete is eliminated (3 consecutive fails at current height with no clear)
      const isEliminated = (() => {
        if (!currentHeight) return false;
        const currentHeightData = heightsData[currentHeight];
        if (!currentHeightData) return false;
        const fails = currentHeightData.attempts.filter(a => a === 'X').length;
        return fails >= 3 && !currentHeightData.cleared;
      })();

      return {
        id: entry.id,
        bibNumber: entry.bib_number,
        firstName: entry.athletes[0]?.first_name || '',
        lastName: entry.athletes[0]?.last_name || '',
        club: entry.athletes[0]?.club,
        heightsData,
        highestClearedHeight,
        isEliminated,
        status: isEliminated ? 'finished' as const : 'active' as const,
      };
    });
  }, [localEntries, localAttempts, currentHeight]);

  // Transform to LiveResult format
  const liveResults: LiveResult[] = useMemo(() => {
    const results = athleteData.map((athlete) => ({
      athleteId: athlete.id,
      bibNumber: athlete.bibNumber,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      club: athlete.club,
      bestResult: null as number | null,
      clearedHeight: athlete.highestClearedHeight,
      place: null as number | null,
      status: athlete.isEliminated ? 'finished' as const : 'active' as const,
    }));

    // Sort by highest cleared height (descending) and assign places
    const sorted = [...results]
      .filter((r) => r.clearedHeight !== null)
      .sort((a, b) => (b.clearedHeight || 0) - (a.clearedHeight || 0));

    sorted.forEach((result, index) => {
      result.place = index + 1;
    });

    return results;
  }, [athleteData]);

  // Handle roll call status change
  const handleRollCallChange = useCallback(
    async (athleteId: string, status: RollCallStatus) => {
      setLocalEntries((prev) =>
        prev.map((entry) =>
          entry.id === athleteId
            ? { ...entry, roll_call_status: status }
            : entry
        )
      );

      // TODO: Persist to database
      // await updateRollCallStatus(athleteId, status);
    },
    []
  );

  // Handle saving a result
  const handleSaveResult = useCallback(
    async (result: VerticalSaveResult) => {
      setLoading(true);
      try {
        // Create new attempt
        const newAttempt: VerticalAttempt = {
          id: `temp-${Date.now()}`,
          entry_id: result.athleteId,
          height: result.height,
          attempt_number: result.attemptNumber,
          result: result.result,
        };

        // Optimistic update
        setLocalAttempts((prev) => [...prev, newAttempt]);

        // TODO: Persist to database
        // const savedAttempt = await saveVerticalAttempt(event.id, newAttempt);

        console.log('Saved result:', result);
      } catch (error) {
        console.error('Failed to save result:', error);
        // Rollback on error
        setLocalAttempts((prev) => prev.filter((a) => a.id !== `temp-${Date.now()}`));
      } finally {
        setLoading(false);
      }
    },
    [event.id]
  );

  // Handle advancing to next athlete
  const handleAdvance = useCallback(() => {
    // Find next active athlete (skip eliminated ones)
    const activeAthletes = athleteData.filter(a => !a.isEliminated);

    if (activeAthletes.length === 0) {
      // All athletes eliminated or finished
      console.log('Competition complete');
      return;
    }

    if (currentAthleteIndex < activeAthletes.length - 1) {
      setCurrentAthleteIndex((prev) => prev + 1);
    } else {
      // End of round for this height, start from beginning
      setCurrentAthleteIndex(0);
    }
  }, [currentAthleteIndex, athleteData]);

  // Handle raising the height
  const handleRaiseHeight = useCallback(() => {
    if (!currentHeight) return;

    const newHeight = currentHeight + heightIncrement;
    setCurrentHeight(newHeight);

    // Add to heights list if not already there
    if (!heights.includes(newHeight)) {
      setHeights((prev) => [...prev, newHeight].sort((a, b) => a - b));
    }

    // Reset athlete index
    setCurrentAthleteIndex(0);

    // TODO: Persist to database
    // await updateEventHeight(event.id, newHeight);

    console.log('Raised height to:', newHeight);
  }, [currentHeight, heightIncrement, heights]);

  // Handle setting height (from start prompt or settings)
  const handleSetHeight = useCallback((height: number) => {
    setCurrentHeight(height);

    // Add to heights list if not already there
    if (!heights.includes(height)) {
      setHeights((prev) => [...prev, height].sort((a, b) => a - b));
    }

    // TODO: Persist to database
    // await updateEventHeight(event.id, height);

    console.log('Set height to:', height);
  }, [heights]);

  // Show error if no athletes
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900 mb-2">Ingen deltakere</h2>
        <p className="text-slate-600">
          Det er ingen deltakere påmeldt denne øvelsen.
        </p>
      </div>
    );
  }

  // Get active athletes (not eliminated)
  const activeAthletes = athleteData.filter(a => !a.isEliminated);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Event header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">{event.name}</h1>
          <div className="text-sm text-gray-500">
            {currentHeight
              ? `Høyde: ${(currentHeight / 100).toFixed(2)} m`
              : 'Ingen høyde satt'}
            {activeAthletes.length > 0 && (
              <span className="ml-2">• {activeAthletes.length} aktive</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content with swipeable views */}
      <div className="flex-1 overflow-hidden">
        <SwipeableViews
          defaultView={1}
          tabLabels={['Startliste', 'Registrering', 'Resultater']}
        >
          {/* View 0: Startlist / Roll call */}
          <StartlistView
            athletes={startlistAthletes}
            onRollCallChange={handleRollCallChange}
            loading={loading}
          />

          {/* View 1: Registration */}
          <VerticalRegistrationView
            athletes={activeAthletes}
            currentAthleteIndex={currentAthleteIndex}
            currentHeight={currentHeight || 0}
            onSaveResult={handleSaveResult}
            onAthleteSelect={setCurrentAthleteIndex}
            onAdvance={handleAdvance}
            onRaiseHeight={handleRaiseHeight}
            onSetHeight={handleSetHeight}
            heightIncrement={heightIncrement}
            eventType={eventType}
            loading={loading}
            showStartHeightPrompt={showStartHeightPrompt}
          />

          {/* View 2: Live Results / Summary */}
          <div className="h-full overflow-y-auto">
            {heights.length > 0 ? (
              <VerticalSummary
                athletes={athleteData}
                heights={heights}
                currentHeight={currentHeight || 0}
              />
            ) : (
              <LiveResultsView
                results={liveResults}
                eventType="vertical"
                loading={loading}
              />
            )}
          </div>
        </SwipeableViews>
      </div>
    </div>
  );
}
