'use client';

import { useState, useCallback, useEffect } from 'react';
import { ActiveQueue, OrderIndicator } from './ActiveQueue';
import { AthleteData } from './AthleteCard';
import { ResultInput, WindInput } from './ResultInput';
import { HorizontalAttemptButtons } from './AttemptButtons';

export interface HorizontalSaveResult {
  athleteId: string;
  attemptNumber: number;
  distance: number | null;
  isFoul: boolean;
  isPass: boolean;
  wind?: number | null;
}

interface HorizontalRegistrationViewProps {
  athletes: AthleteData[];
  currentAthleteIndex: number;
  currentRound: number;
  onSaveResult: (result: HorizontalSaveResult) => Promise<void>;
  onAthleteSelect: (index: number) => void;
  onAdvance: () => void;
  showWind?: boolean;
  loading?: boolean;
}

export function HorizontalRegistrationView({
  athletes,
  currentAthleteIndex,
  currentRound,
  onSaveResult,
  onAthleteSelect,
  onAdvance,
  showWind = false,
  loading = false,
}: HorizontalRegistrationViewProps) {
  const [distanceValue, setDistanceValue] = useState('');
  const [windValue, setWindValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentAthlete = athletes[currentAthleteIndex];

  // Calculate current attempt number for this athlete
  const getCurrentAttemptNumber = () => {
    if (!currentAthlete?.horizontalAttempts) return 1;
    return currentAthlete.horizontalAttempts.length + 1;
  };

  // Reset input when athlete changes
  useEffect(() => {
    setDistanceValue('');
    setWindValue('');
  }, [currentAthleteIndex]);

  const handleSaveResult = useCallback(async (
    distance: number | null,
    isFoul: boolean,
    isPass: boolean
  ) => {
    if (!currentAthlete || isSaving) return;

    setIsSaving(true);
    try {
      await onSaveResult({
        athleteId: currentAthlete.id,
        attemptNumber: getCurrentAttemptNumber(),
        distance,
        isFoul,
        isPass,
        wind: windValue ? parseFloat(windValue) : null,
      });

      // Clear inputs and advance
      setDistanceValue('');
      setWindValue('');
      onAdvance();
    } catch (error) {
      console.error('Failed to save result:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentAthlete, isSaving, onSaveResult, windValue, onAdvance]);

  const handleAction = useCallback((action: 'save' | 'foul' | 'pass') => {
    switch (action) {
      case 'save':
        const distance = parseFloat(distanceValue);
        if (!isNaN(distance) && distance > 0) {
          handleSaveResult(distance * 100, false, false); // Convert to cm
        }
        break;
      case 'foul':
        handleSaveResult(null, true, false);
        break;
      case 'pass':
        handleSaveResult(null, false, true);
        break;
    }
  }, [distanceValue, handleSaveResult]);

  if (athletes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Ingen utøvere registrert</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Round indicator */}
      <div className="text-center mb-2">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          Runde {currentRound} • Forsøk {getCurrentAttemptNumber()}
        </span>
      </div>

      {/* Active Queue */}
      <div className="flex-1 overflow-y-auto mb-4">
        <ActiveQueue
          athletes={athletes}
          currentIndex={currentAthleteIndex}
          eventType="horizontal"
          onAthleteSelect={onAthleteSelect}
        />
      </div>

      {/* Input section - fixed at bottom */}
      <div className="space-y-4 bg-white rounded-xl p-4 shadow-lg">
        {/* Distance input */}
        <ResultInput
          value={distanceValue}
          onChange={setDistanceValue}
          unit="m"
          placeholder="0.00"
          autoFocus
          disabled={isSaving || loading}
        />

        {/* Wind input (optional) */}
        {showWind && (
          <WindInput
            value={windValue}
            onChange={setWindValue}
            disabled={isSaving || loading}
          />
        )}

        {/* Action buttons */}
        <HorizontalAttemptButtons
          onAction={handleAction}
          disabled={isSaving || loading}
          hasDistance={distanceValue.length > 0 && !isNaN(parseFloat(distanceValue))}
        />

        {/* Order indicator */}
        <OrderIndicator
          totalAthletes={athletes.length}
          currentIndex={currentAthleteIndex}
          onJumpTo={onAthleteSelect}
        />
      </div>
    </div>
  );
}
