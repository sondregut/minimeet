'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  SwipeableViews,
  StartlistView,
  HorizontalRegistrationView,
  LiveResultsView,
  FinalRoundPrompt,
  FinalRoundBadge,
} from '@/components/official';
import type {
  AthleteData,
  StartlistAthlete,
  RollCallStatus,
  HorizontalSaveResult,
  LiveResult,
  FinalRoundChoice,
} from '@/components/official';

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

interface FieldAttempt {
  id: string;
  entry_id: string;
  attempt_number: number;
  distance: number | null;
  is_foul: boolean;
  is_pass: boolean;
  wind?: number | null;
}

interface Props {
  event: {
    id: string;
    name: string;
    status: string;
  };
  entries: Entry[];
  existingAttempts?: FieldAttempt[];
  showWind?: boolean;
}

export default function OfficialHorizontalRecording({
  event,
  entries,
  existingAttempts = [],
  showWind = false,
}: Props) {
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [localEntries, setLocalEntries] = useState<Entry[]>(entries);
  const [localAttempts, setLocalAttempts] = useState<FieldAttempt[]>(existingAttempts);
  const [loading, setLoading] = useState(false);
  const [showFinalPrompt, setShowFinalPrompt] = useState(false);
  const [finalChoice, setFinalChoice] = useState<FinalRoundChoice | null>(null);

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

  // Transform entries to AthleteData format with attempts
  const athleteData: AthleteData[] = useMemo(() => {
    // Filter only present athletes for competition
    const presentEntries = localEntries.filter(
      (e) => e.roll_call_status === 'present' || !e.roll_call_status
    );

    return presentEntries.map((entry) => {
      // Get attempts for this athlete
      const athleteAttempts = localAttempts
        .filter((a) => a.entry_id === entry.id)
        .sort((a, b) => a.attempt_number - b.attempt_number);

      const horizontalAttempts = athleteAttempts.map((a) => ({
        distance: a.distance,
        isFoul: a.is_foul,
        isPass: a.is_pass,
        wind: a.wind,
      }));

      // Calculate best result
      const validDistances = horizontalAttempts
        .filter((a) => a.distance !== null && !a.isFoul)
        .map((a) => a.distance as number);

      const bestResult = validDistances.length > 0
        ? Math.max(...validDistances)
        : null;

      return {
        id: entry.id,
        bibNumber: entry.bib_number,
        firstName: entry.athletes[0]?.first_name || '',
        lastName: entry.athletes[0]?.last_name || '',
        club: entry.athletes[0]?.club,
        horizontalAttempts,
        bestResult,
        status: 'active' as const,
      };
    });
  }, [localEntries, localAttempts]);

  // Transform to LiveResult format
  const liveResults: LiveResult[] = useMemo(() => {
    const results = athleteData.map((athlete, index) => ({
      athleteId: athlete.id,
      bibNumber: athlete.bibNumber,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      club: athlete.club,
      bestResult: athlete.bestResult || null,
      place: null as number | null,
      status: 'active' as const,
    }));

    // Sort by best result and assign places
    const sorted = [...results]
      .filter((r) => r.bestResult !== null)
      .sort((a, b) => (b.bestResult || 0) - (a.bestResult || 0));

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
    async (result: HorizontalSaveResult) => {
      setLoading(true);
      try {
        // Create new attempt
        const newAttempt: FieldAttempt = {
          id: `temp-${Date.now()}`,
          entry_id: result.athleteId,
          attempt_number: result.attemptNumber,
          distance: result.distance,
          is_foul: result.isFoul,
          is_pass: result.isPass,
          wind: result.wind,
        };

        // Optimistic update
        setLocalAttempts((prev) => [...prev, newAttempt]);

        // TODO: Persist to database
        // const savedAttempt = await saveFieldAttempt(event.id, newAttempt);
        // Update with real ID
        // setLocalAttempts(prev => prev.map(a => a.id === newAttempt.id ? savedAttempt : a));

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
    if (currentAthleteIndex < athleteData.length - 1) {
      setCurrentAthleteIndex((prev) => prev + 1);
    } else {
      // End of round
      const nextRound = currentRound + 1;

      // Check if we need to show final round prompt after round 3
      if (currentRound === 3 && !finalChoice) {
        setShowFinalPrompt(true);
        return;
      }

      // If final 8 is selected and we're past round 3, filter to top 8
      if (finalChoice === 'final8' && currentRound >= 3) {
        // Athletes are already sorted by best result
        // Only continue with top 8
        setCurrentAthleteIndex(0);
        setCurrentRound(nextRound);
        return;
      }

      // Continue with normal round
      setCurrentAthleteIndex(0);
      setCurrentRound(nextRound);
    }
  }, [currentAthleteIndex, athleteData.length, currentRound, finalChoice]);

  // Handle final round choice
  const handleFinalChoice = useCallback((choice: FinalRoundChoice) => {
    setFinalChoice(choice);
    setShowFinalPrompt(false);
    setCurrentAthleteIndex(0);
    setCurrentRound(4);
  }, []);

  // Get athletes for current view (considering final 8 selection)
  const displayAthletes = useMemo(() => {
    if (finalChoice === 'final8' && currentRound > 3) {
      // Get top 8 athletes by best result
      return [...athleteData]
        .sort((a, b) => (b.bestResult || 0) - (a.bestResult || 0))
        .slice(0, 8)
        // Reverse order for finals: 8th throws first, 1st throws last
        .reverse();
    }
    return athleteData;
  }, [athleteData, finalChoice, currentRound]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Event header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">{event.name}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Runde {currentRound}</span>
            {finalChoice && <FinalRoundBadge choice={finalChoice} />}
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
          <HorizontalRegistrationView
            athletes={displayAthletes}
            currentAthleteIndex={currentAthleteIndex}
            currentRound={currentRound}
            onSaveResult={handleSaveResult}
            onAthleteSelect={setCurrentAthleteIndex}
            onAdvance={handleAdvance}
            showWind={showWind}
            loading={loading}
          />

          {/* View 2: Live Results */}
          <LiveResultsView
            results={liveResults}
            eventType="horizontal"
            loading={loading}
          />
        </SwipeableViews>
      </div>

      {/* Final round prompt modal */}
      {showFinalPrompt && (
        <FinalRoundPrompt
          totalAthletes={athleteData.length}
          onChoice={handleFinalChoice}
          loading={loading}
        />
      )}
    </div>
  );
}
