'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  X,
  Minus,
  Trophy,
  CheckCircle,
} from 'lucide-react';
import { type VerticalSettings, advanceToNextHeight, updateEventStatus } from '@/lib/actions/events';
import { saveVerticalResult, getVerticalResultsByEvent, recalculateVerticalEventPlaces, type VerticalAttemptInput } from '@/lib/actions/results';

interface Entry {
  id: string;
  bib_number: string | null;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
  } | null;
}

interface AthleteAttempts {
  [height: number]: ('o' | 'x' | '-' | 'r' | null)[];  // max 3 attempts per height, 'r' = retired
}

interface AthleteState {
  entry_id: string;
  attempts: AthleteAttempts;
  status: 'active' | 'eliminated' | 'retired' | 'NH';
  best_height: number | null;
}

interface VerticalCompetitionProps {
  eventId: string;
  eventName: string;
  competitionId: string;
  settings: VerticalSettings;
  entries: Entry[];
  onBack: () => void;
  onSettingsChange: (settings: VerticalSettings) => void;
}

export default function VerticalCompetition({
  eventId,
  eventName,
  competitionId,
  settings,
  entries,
  onBack,
  onSettingsChange,
}: VerticalCompetitionProps) {
  const [currentHeightIndex, setCurrentHeightIndex] = useState(settings.current_height_index || 0);
  const [athleteStates, setAthleteStates] = useState<Record<string, AthleteState>>({});
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  // Track recently finished athlete (cleared or eliminated) to show them briefly
  const [recentlyFinishedAthlete, setRecentlyFinishedAthlete] = useState<{
    id: string;
    outcome: 'cleared' | 'eliminated';
  } | null>(null);

  // Heights array (parent ensures this is always defined when reaching this component)
  const heights = settings.heights || [];
  const currentHeight = heights[currentHeightIndex] || 0;

  // Load existing results
  useEffect(() => {
    async function loadResults() {
      setLoading(true);
      try {
        const results = await getVerticalResultsByEvent(eventId);

        const states: Record<string, AthleteState> = {};

        // Initialize all entries
        for (const entry of entries) {
          states[entry.id] = {
            entry_id: entry.id,
            attempts: {},
            status: 'active',
            best_height: null,
          };
        }

        // Load existing results
        for (const result of results) {
          if (!result.entry?.id) continue;

          const attempts: AthleteAttempts = {};
          for (const att of result.attempts || []) {
            // Convert height from meters (database) to cm (UI)
            const heightCm = Math.round(att.height * 100);
            if (!attempts[heightCm]) {
              attempts[heightCm] = [null, null, null];
            }
            attempts[heightCm][att.attempt_number - 1] = att.outcome as 'o' | 'x' | '-';
          }

          states[result.entry.id] = {
            entry_id: result.entry.id,
            attempts,
            status: result.status as 'active' | 'eliminated' | 'retired' | 'NH',
            // Convert best_height from meters (database) to cm (UI)
            best_height: result.best_height ? Math.round(result.best_height * 100) : null,
          };
        }

        setAthleteStates(states);

        // Expand first active athlete
        const firstActive = entries.find(e => states[e.id]?.status === 'active');
        if (firstActive) {
          setExpandedAthlete(firstActive.id);
        }
      } catch (err) {
        console.error('Error loading results:', err);
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [eventId, entries]);

  // Record an attempt for an athlete at current height
  function recordAttempt(entryId: string, outcome: 'o' | 'x' | '-') {
    // Clear any previous recently finished athlete when recording a new attempt
    setRecentlyFinishedAthlete(null);

    // Get current state before update to calculate next athlete
    const currentActiveAthletes = getAthletesAtCurrentHeight();
    const currentIndex = currentActiveAthletes.findIndex(e => e.id === entryId);

    // Determine if this attempt will make the athlete inactive at this height
    const currentState = athleteStates[entryId];
    const heightAttempts = currentState?.attempts[currentHeight] || [null, null, null];
    const nextSlot = heightAttempts.findIndex(a => a === null);

    if (nextSlot === -1) return; // All 3 attempts used - shouldn't happen but guard

    // Calculate current total failures (including carried from previous heights)
    const currentTotalFailures = currentState ? getTotalFailuresAtCurrentHeight(currentState) : 0;

    let athleteDoneAtHeight = false;
    let athleteCleared = false;
    let athleteEliminated = false;
    if (outcome === 'o') {
      // Clearing = done at this height
      athleteDoneAtHeight = true;
      athleteCleared = true;
    } else if (outcome === '-') {
      // Pass = done at this height, moves to next height
      athleteDoneAtHeight = true;
    } else if (outcome === 'x') {
      // Check if this X makes total failures = 3 (eliminated)
      if (currentTotalFailures + 1 >= 3) {
        athleteDoneAtHeight = true;
        athleteEliminated = true;
      }
    }

    // If athlete cleared or eliminated, keep them visible until next attempt is registered
    if (athleteCleared) {
      setRecentlyFinishedAthlete({ id: entryId, outcome: 'cleared' });
    } else if (athleteEliminated) {
      setRecentlyFinishedAthlete({ id: entryId, outcome: 'eliminated' });
    }

    // Build new state and save it
    const athlete = athleteStates[entryId];
    const existingAttempts = athlete.attempts[currentHeight] || [null, null, null];

    // Find the next empty slot
    const slot = existingAttempts.findIndex(a => a === null);
    if (slot === -1) return; // All 3 attempts used

    const newAttempts = [...existingAttempts];
    newAttempts[slot] = outcome;

    // Check if athlete cleared or is eliminated
    let newStatus = athlete.status;
    let newBestHeight = athlete.best_height;

    if (outcome === 'o') {
      // Cleared - update best height
      newBestHeight = Math.max(newBestHeight || 0, currentHeight);
    } else if (outcome === 'x') {
      // Check total failures including carried failures
      let carriedFailures = 0;
      for (let i = currentHeightIndex - 1; i >= 0; i--) {
        const prevHeight = heights[i];
        const prevAttempts = athlete.attempts[prevHeight] || [];

        if (prevAttempts.includes('o')) {
          break; // Cleared a previous height, no carry-over
        } else if (prevAttempts.includes('-')) {
          // Passed at this height, count consecutive failures before the pass
          for (const attempt of prevAttempts) {
            if (attempt === 'x') carriedFailures++;
            else if (attempt === '-') break;
          }
        }
      }

      const newFailuresAtHeight = newAttempts.filter(a => a === 'x').length;
      const totalFailures = newFailuresAtHeight + carriedFailures;

      if (totalFailures >= 3) {
        // Eliminated - set status based on whether they cleared any height
        newStatus = newBestHeight ? 'eliminated' : 'NH';
      }
    }

    // Create the new athlete state
    const newAthleteState: AthleteState = {
      ...athlete,
      attempts: {
        ...athlete.attempts,
        [currentHeight]: newAttempts,
      },
      status: newStatus,
      best_height: newBestHeight,
    };

    // Update React state
    setAthleteStates(prev => ({
      ...prev,
      [entryId]: newAthleteState,
    }));

    // Auto-save to database (fire and forget)
    saveAthleteResult(entryId, newAthleteState);

    // Auto-advance to next athlete (with delay to prevent ghost clicks on mobile)
    // We need to pass the updated state to correctly determine who needs to jump next
    const updatedStates = {
      ...athleteStates,
      [entryId]: newAthleteState,
    };

    setTimeout(() => {
      autoAdvanceToNextAthlete(updatedStates, entryId);
    }, 150); // 150ms delay to prevent ghost clicks
  }

  // Simplified auto-advance: find the next athlete who needs to jump at current height
  function autoAdvanceToNextAthlete(states: Record<string, AthleteState>, currentEntryId: string) {
    const currentEntryIndex = entries.findIndex(e => e.id === currentEntryId);

    // Helper to check if an athlete needs to jump at current height
    function needsToJump(state: AthleteState): boolean {
      if (!state) return false;
      if (state.status === 'retired' || state.status === 'NH' || state.status === 'eliminated') return false;

      const attempts = state.attempts[currentHeight] || [];
      if (attempts.includes('o')) return false; // Cleared
      if (attempts.includes('-')) return false; // Passed

      // Calculate total failures for this athlete
      const failuresAtThisHeight = attempts.filter(a => a === 'x').length;
      let carriedFailures = 0;
      for (let i = currentHeightIndex - 1; i >= 0; i--) {
        const prevHeight = heights[i];
        const prevAttempts = state.attempts[prevHeight] || [];
        if (prevAttempts.includes('o')) break;
        else if (prevAttempts.includes('-')) {
          for (const attempt of prevAttempts) {
            if (attempt === 'x') carriedFailures++;
            else if (attempt === '-') break;
          }
        }
      }

      const totalFailures = failuresAtThisHeight + carriedFailures;
      if (totalFailures >= 3) return false; // Eliminated

      return true;
    }

    // Find all athletes who need to jump, in order
    const athletesWhoNeedToJump: Entry[] = [];
    for (const entry of entries) {
      const state = states[entry.id];
      if (needsToJump(state)) {
        athletesWhoNeedToJump.push(entry);
      }
    }

    if (athletesWhoNeedToJump.length === 0) {
      // No one left at this height - auto-advance to next height if available
      if (currentHeightIndex < heights.length - 1) {
        setCurrentHeightIndex(currentHeightIndex + 1);
        // Find first athlete who can compete at next height
        const nextHeight = heights[currentHeightIndex + 1];
        for (const entry of entries) {
          const state = states[entry.id];
          if (state && state.status === 'active') {
            setExpandedAthlete(entry.id);
            return;
          }
        }
      }
      setExpandedAthlete(null);
      return;
    }

    // Find the athlete with the fewest attempts (round-robin style)
    // Get minimum attempt count
    let minAttempts = Infinity;
    for (const entry of athletesWhoNeedToJump) {
      const state = states[entry.id];
      const attempts = state?.attempts[currentHeight] || [];
      const attemptCount = attempts.filter(a => a !== null).length;
      if (attemptCount < minAttempts) {
        minAttempts = attemptCount;
      }
    }

    // Find athletes with minimum attempts (these are the ones in current round)
    const athletesInCurrentRound = athletesWhoNeedToJump.filter(entry => {
      const state = states[entry.id];
      const attempts = state?.attempts[currentHeight] || [];
      return attempts.filter(a => a !== null).length === minAttempts;
    });

    // Find next athlete after current one in the round
    // First, look for athletes after current in entries order
    let nextAthlete: Entry | null = null;

    for (const entry of athletesInCurrentRound) {
      const entryIndex = entries.findIndex(e => e.id === entry.id);
      if (entryIndex > currentEntryIndex) {
        nextAthlete = entry;
        break;
      }
    }

    // If no one found after current, wrap around to start
    if (!nextAthlete && athletesInCurrentRound.length > 0) {
      nextAthlete = athletesInCurrentRound[0];
    }

    if (nextAthlete) {
      setExpandedAthlete(nextAthlete.id);
    } else {
      setExpandedAthlete(null);
    }
  }

  // Clear the last attempt for an athlete
  function clearLastAttempt(entryId: string) {
    const athlete = athleteStates[entryId];
    const heightAttempts = athlete.attempts[currentHeight] || [null, null, null];

    // Find last non-null attempt
    let lastIndex = -1;
    for (let i = heightAttempts.length - 1; i >= 0; i--) {
      if (heightAttempts[i] !== null) {
        lastIndex = i;
        break;
      }
    }

    if (lastIndex === -1) return;

    const newAttempts = [...heightAttempts];
    newAttempts[lastIndex] = null;

    // Recalculate status - might need to revert from eliminated/NH
    // If we're undoing an X that caused elimination, set back to active
    let newStatus = athlete.status;
    if (athlete.status === 'eliminated' || athlete.status === 'NH') {
      // Check if still eliminated after removing this attempt
      const failuresAtHeight = newAttempts.filter(a => a === 'x').length;
      let carriedFailures = 0;
      for (let i = currentHeightIndex - 1; i >= 0; i--) {
        const prevHeight = heights[i];
        const prevAttempts = athlete.attempts[prevHeight] || [];
        if (prevAttempts.includes('o')) break;
        else if (prevAttempts.includes('-')) {
          for (const attempt of prevAttempts) {
            if (attempt === 'x') carriedFailures++;
            else if (attempt === '-') break;
          }
        }
      }
      if (failuresAtHeight + carriedFailures < 3) {
        newStatus = 'active';
      }
    }

    // Also recalculate best_height in case we're undoing a clearance
    let newBestHeight = athlete.best_height;
    if (newAttempts.every(a => a !== 'o') && athlete.best_height === currentHeight) {
      // We undid the only clearance at this height, recalculate best
      newBestHeight = null;
      for (const [heightStr, attempts] of Object.entries(athlete.attempts)) {
        const h = parseInt(heightStr, 10);
        if (h !== currentHeight && attempts.includes('o')) {
          newBestHeight = Math.max(newBestHeight || 0, h);
        }
      }
    }

    const newAthleteState: AthleteState = {
      ...athlete,
      attempts: {
        ...athlete.attempts,
        [currentHeight]: newAttempts,
      },
      status: newStatus,
      best_height: newBestHeight,
    };

    setAthleteStates(prev => ({
      ...prev,
      [entryId]: newAthleteState,
    }));

    // Auto-save
    saveAthleteResult(entryId, newAthleteState);
  }

  // Set athlete status (retired, etc.)
  function setAthleteStatus(entryId: string, status: 'active' | 'eliminated' | 'retired' | 'NH') {
    const athlete = athleteStates[entryId];

    // When marking as retired, determine the correct final status
    let finalStatus = status;
    let newAttempts = { ...athlete.attempts };

    if (status === 'retired') {
      // Check if they have any attempts at all
      const hasAnyAttempts = Object.values(athlete.attempts).some(
        heightAttempts => heightAttempts.some((a: 'o' | 'x' | '-' | null) => a !== null)
      );

      if (!hasAnyAttempts) {
        // No attempts at all = DNS
        finalStatus = 'retired'; // We'll display as DNS
      } else if (!athlete.best_height) {
        // Has attempts but no cleared height = NM (No valid Mark)
        finalStatus = 'NH'; // NH = No Height (same as NM for vertical)
      }
      // If they have best_height, keep as 'retired' and show the height

      // Record an 'r' (retired) at the current height to show in the grid
      // Only if they haven't already cleared or passed at this height
      const heightAttempts = athlete.attempts[currentHeight] || [null, null, null];
      const alreadyCleared = heightAttempts.includes('o');
      const alreadyPassed = heightAttempts.includes('-');

      if (!alreadyCleared && !alreadyPassed) {
        // Find the next empty slot and record 'r'
        const slot = heightAttempts.findIndex(a => a === null);
        if (slot !== -1) {
          const updatedHeightAttempts = [...heightAttempts] as ('o' | 'x' | '-' | 'r' | null)[];
          updatedHeightAttempts[slot] = 'r';
          newAttempts = {
            ...athlete.attempts,
            [currentHeight]: updatedHeightAttempts,
          };
        }
      }
    }

    // Create new athlete state
    const newAthleteState: AthleteState = {
      ...athlete,
      attempts: newAttempts,
      status: finalStatus,
    };

    // Update React state
    setAthleteStates(prev => ({
      ...prev,
      [entryId]: newAthleteState,
    }));

    // Auto-save to database
    saveAthleteResult(entryId, newAthleteState);

    // If athlete is withdrawn (retired), auto-advance to next athlete
    if (status === 'retired' || status === 'NH') {
      const updatedStates = {
        ...athleteStates,
        [entryId]: newAthleteState,
      };
      setTimeout(() => {
        autoAdvanceToNextAthlete(updatedStates, entryId);
      }, 150);
    }
  }

  // Save a single athlete's result (for auto-save)
  async function saveAthleteResult(entryId: string, state: AthleteState) {
    try {
      const attempts: VerticalAttemptInput[] = [];

      for (const [heightStr, heightAttempts] of Object.entries(state.attempts)) {
        const height = parseInt(heightStr, 10);
        for (let i = 0; i < heightAttempts.length; i++) {
          const outcome = heightAttempts[i];
          if (outcome) {
            attempts.push({
              height,
              attempt_number: i + 1,
              outcome,
            });
          }
        }
      }

      await saveVerticalResult(
        {
          entry_id: entryId,
          attempts,
          status: state.status,
        },
        competitionId,
        eventId
      );
    } catch (err) {
      console.error('Error auto-saving result:', err);
    }
  }

  // Save all results
  async function saveAllResults() {
    setSaving(true);
    try {
      for (const [entryId, state] of Object.entries(athleteStates)) {
        await saveAthleteResult(entryId, state);
      }
    } catch (err) {
      console.error('Error saving results:', err);
    } finally {
      setSaving(false);
    }
  }

  // Complete event - saves all results, calculates places, sets status to completed
  async function completeEvent() {
    setCompleting(true);
    try {
      // Save all results first
      for (const [entryId, state] of Object.entries(athleteStates)) {
        await saveAthleteResult(entryId, state);
      }
      // Calculate places
      await recalculateVerticalEventPlaces(eventId, competitionId);
      // Set event status to completed
      await updateEventStatus(eventId, 'completed', competitionId);
      // Navigate back
      onBack();
    } catch (err) {
      console.error('Error completing event:', err);
    } finally {
      setCompleting(false);
    }
  }

  // Advance to next height
  async function goToNextHeight() {
    if (currentHeightIndex < heights.length - 1) {
      setRecentlyFinishedAthlete(null);
      setCurrentHeightIndex(currentHeightIndex + 1);
      await advanceToNextHeight(eventId, competitionId);
    }
  }

  // Go to previous height
  function goToPreviousHeight() {
    if (currentHeightIndex > 0) {
      setRecentlyFinishedAthlete(null);
      setCurrentHeightIndex(currentHeightIndex - 1);
    }
  }

  // Format height in meters
  function formatHeight(cm: number): string {
    return (cm / 100).toFixed(2);
  }

  // Get athletes at current height (active and not cleared/passed yet)
  function getAthletesAtCurrentHeight() {
    return entries.filter(entry => {
      const state = athleteStates[entry.id];
      if (!state || state.status === 'retired' || state.status === 'NH' || state.status === 'eliminated') return false;

      // Check if already cleared this height
      const heightAttempts = state.attempts[currentHeight] || [];
      const cleared = heightAttempts.includes('o');
      if (cleared) return false;

      // Check if passed at this height (can't attempt again until next height)
      const passed = heightAttempts.includes('-');
      if (passed) return false;

      // Check if eliminated - need to count current failures + carried failures
      const failuresAtThisHeight = heightAttempts.filter(a => a === 'x').length;

      // Calculate carried failures from previous passed heights
      let carriedFailures = 0;
      for (let i = currentHeightIndex - 1; i >= 0; i--) {
        const prevHeight = heights[i];
        const prevAttempts = state.attempts[prevHeight] || [];

        if (prevAttempts.includes('o')) {
          // Cleared a previous height, no carry-over from before that
          break;
        } else if (prevAttempts.includes('-')) {
          // Passed at this height, count consecutive failures before the pass
          for (const attempt of prevAttempts) {
            if (attempt === 'x') carriedFailures++;
            else if (attempt === '-') break;
          }
        }
      }

      const totalFailures = failuresAtThisHeight + carriedFailures;
      if (totalFailures >= 3) return false;

      return true;
    });
  }

  // Count consecutive failures before a pass (these carry to next height)
  function getConsecutiveFailuresBeforePass(state: AthleteState, height: number): number {
    const attempts = state.attempts[height] || [];
    let consecutiveFailures = 0;
    for (const attempt of attempts) {
      if (attempt === 'x') {
        consecutiveFailures++;
      } else if (attempt === '-') {
        // Pass found, return failures before it
        return consecutiveFailures;
      } else if (attempt === 'o') {
        // Cleared, reset
        return 0;
      }
    }
    return consecutiveFailures;
  }

  // Calculate total failures for an athlete at current height (including carried)
  function getTotalFailuresAtCurrentHeight(state: AthleteState): number {
    const heightAttempts = state.attempts[currentHeight] || [];
    const failuresAtThisHeight = heightAttempts.filter(a => a === 'x').length;

    // Calculate carried failures from previous passed heights
    let carriedFailures = 0;
    for (let i = currentHeightIndex - 1; i >= 0; i--) {
      const prevHeight = heights[i];
      const prevAttempts = state.attempts[prevHeight] || [];

      if (prevAttempts.includes('o')) {
        // Cleared a previous height, no carry-over from before that
        break;
      } else if (prevAttempts.includes('-')) {
        // Passed at this height, count consecutive failures before the pass
        carriedFailures += getConsecutiveFailuresBeforePass(state, prevHeight);
      }
    }

    return failuresAtThisHeight + carriedFailures;
  }

  // Get remaining attempts for athlete at current height
  function getRemainingAttempts(entryId: string): number {
    const state = athleteStates[entryId];
    if (!state) return 3;

    const heightAttempts = state.attempts[currentHeight] || [];

    // If passed or cleared, no more attempts at this height
    if (heightAttempts.includes('-') || heightAttempts.includes('o')) return 0;

    // Count current failures at this height
    const failuresAtThisHeight = heightAttempts.filter(a => a === 'x').length;

    // Check for carried-over failures from previous heights (passes)
    let carriedFailures = 0;
    for (let i = currentHeightIndex - 1; i >= 0; i--) {
      const prevHeight = heights[i];
      const prevAttempts = state.attempts[prevHeight] || [];

      if (prevAttempts.includes('o')) {
        // Cleared a previous height, no carry-over from before that
        break;
      } else if (prevAttempts.includes('-')) {
        // Passed at this height, count consecutive failures before the pass
        carriedFailures += getConsecutiveFailuresBeforePass(state, prevHeight);
      }
    }

    const totalFailures = failuresAtThisHeight + carriedFailures;
    return Math.max(0, 3 - totalFailures);
  }

  // Get current attempt round (1, 2, or 3) based on what most active athletes have done
  function getCurrentRound(): number {
    const activeAthletes = getAthletesAtCurrentHeight();
    if (activeAthletes.length === 0) return 1;

    // Count how many attempts each active athlete has at current height
    const attemptCounts = activeAthletes.map(entry => {
      const state = athleteStates[entry.id];
      const heightAttempts = state?.attempts[currentHeight] || [];
      return heightAttempts.filter(a => a !== null).length;
    });

    // The current round is the minimum attempts + 1 (the round we're working on)
    const minAttempts = Math.min(...attemptCounts);
    return minAttempts + 1;
  }

  // Count total failures for an athlete across all heights
  function getTotalFailures(state: AthleteState): number {
    let total = 0;
    for (const heightAttempts of Object.values(state.attempts)) {
      total += heightAttempts.filter((a: 'o' | 'x' | '-' | null) => a === 'x').length;
    }
    return total;
  }

  // Count failures at a specific height
  function getFailuresAtHeight(state: AthleteState, height: number): number {
    const attempts = state.attempts[height] || [];
    return attempts.filter((a: 'o' | 'x' | '-' | 'r' | null) => a === 'x').length;
  }

  // Check if athlete has any attempts
  function hasAnyAttempts(state: AthleteState): boolean {
    return Object.values(state.attempts).some(
      heightAttempts => heightAttempts.some((a: 'o' | 'x' | '-' | 'r' | null) => a !== null)
    );
  }

  // Get standings sorted by IAAF rules:
  // 1. Best height (descending)
  // 2. Fewest failures at best height
  // 3. Fewest total failures
  // Also includes all athletes with attempts (active or not) and DNS athletes
  function getStandings() {
    const allAthletes = entries
      .map(entry => ({
        entry,
        state: athleteStates[entry.id],
      }))
      .filter(({ state }) => state); // Must have state

    // Separate into categories
    const withHeight = allAthletes.filter(({ state }) => state?.best_height);

    // NM athletes: no best_height but have attempts (either eliminated/NH or still active with failures)
    const nmAthletes = allAthletes.filter(({ state }) =>
      !state?.best_height &&
      hasAnyAttempts(state!) &&
      state?.status !== 'retired'
    );

    const dnsAthletes = allAthletes.filter(({ state }) =>
      !state?.best_height &&
      state?.status === 'retired' &&
      !hasAnyAttempts(state!)
    );

    // Sort athletes with heights by IAAF rules
    withHeight.sort((a, b) => {
      const aHeight = a.state?.best_height || 0;
      const bHeight = b.state?.best_height || 0;

      // 1. Best height (descending)
      if (bHeight !== aHeight) {
        return bHeight - aHeight;
      }

      // 2. Fewest failures at winning height
      const aFailuresAtBest = a.state ? getFailuresAtHeight(a.state, aHeight) : 0;
      const bFailuresAtBest = b.state ? getFailuresAtHeight(b.state, bHeight) : 0;
      if (aFailuresAtBest !== bFailuresAtBest) {
        return aFailuresAtBest - bFailuresAtBest;
      }

      // 3. Fewest total failures
      const aTotalFailures = a.state ? getTotalFailures(a.state) : 0;
      const bTotalFailures = b.state ? getTotalFailures(b.state) : 0;
      return aTotalFailures - bTotalFailures;
    });

    return { withHeight, nmAthletes, dnsAthletes };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const activeAthletesBase = getAthletesAtCurrentHeight();
  // Include recently finished athlete (cleared or eliminated) in the display list
  // Keep them in their original position based on entries order
  let activeAthletes = activeAthletesBase;
  if (recentlyFinishedAthlete && !activeAthletesBase.find(e => e.id === recentlyFinishedAthlete.id)) {
    const finishedEntry = entries.find(e => e.id === recentlyFinishedAthlete.id);
    if (finishedEntry) {
      // Find the correct position to insert based on entries order
      const finishedEntryIndex = entries.findIndex(e => e.id === recentlyFinishedAthlete.id);
      const result: Entry[] = [];
      let inserted = false;

      for (const entry of activeAthletesBase) {
        const entryIndex = entries.findIndex(e => e.id === entry.id);
        // Insert finished athlete before any entry that comes after them in original order
        if (!inserted && entryIndex > finishedEntryIndex) {
          result.push(finishedEntry);
          inserted = true;
        }
        result.push(entry);
      }
      // If not inserted yet (finished athlete was last in original order), add at end
      if (!inserted) {
        result.push(finishedEntry);
      }
      activeAthletes = result;
    }
  }
  const standings = getStandings();
  const currentRound = getCurrentRound();

  // Get all heights that have been attempted (for series grid)
  const attemptedHeights = heights.slice(0, currentHeightIndex + 1).filter(h => {
    // Check if any athlete has attempted this height
    return Object.values(athleteStates).some(state => {
      const attempts = state.attempts[h] || [];
      return attempts.some(a => a !== null);
    });
  });

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Compact header with current height */}
      <div className="bg-blue-900 text-white px-3 py-2 sticky top-0 z-10">
        {/* Top row: back button, event name, save button */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-1 text-blue-200 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium truncate mx-2">{eventName}</h1>
          <button onClick={saveAllResults} disabled={saving} className="p-1 hover:bg-blue-800 rounded">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          </button>
        </div>

        {/* Height navigation - more compact */}
        <div className="flex items-center justify-center gap-3 mt-1">
          <button
            onClick={goToPreviousHeight}
            disabled={currentHeightIndex === 0}
            className="p-1.5 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div className="text-2xl font-mono font-bold">{formatHeight(currentHeight)} m</div>
            <div className="text-[10px] text-blue-300">
              {currentHeightIndex + 1}/{heights.length}
              {activeAthletes.length > 0 && ` • Forsøk ${currentRound} • ${activeAthletes.length} igjen`}
            </div>
          </div>

          <button
            onClick={goToNextHeight}
            disabled={currentHeightIndex >= heights.length - 1}
            className="p-1.5 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-50"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active athletes at current height */}
      <div className="p-2 space-y-1">
        {activeAthletes.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center">
            <ArrowUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Alle har hoppet på denne høyden</p>
            <button
              onClick={goToNextHeight}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
            >
              Gå til neste høyde
            </button>
          </div>
        ) : (
          activeAthletes.map(entry => {
            const state = athleteStates[entry.id];
            const heightAttempts = state?.attempts[currentHeight] || [null, null, null];
            const isExpanded = expandedAthlete === entry.id;
            const remainingAttempts = getRemainingAttempts(entry.id);
            const isRecentlyCleared = recentlyFinishedAthlete?.id === entry.id && recentlyFinishedAthlete?.outcome === 'cleared';
            const isRecentlyEliminated = recentlyFinishedAthlete?.id === entry.id && recentlyFinishedAthlete?.outcome === 'eliminated';
            const isRecentlyFinished = isRecentlyCleared || isRecentlyEliminated;

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                  isExpanded ? 'ring-2 ring-blue-500' : ''
                } ${isRecentlyCleared ? 'ring-2 ring-green-500 bg-green-50' : ''} ${isRecentlyEliminated ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
              >
                {/* Athlete header */}
                <button
                  onClick={() => setExpandedAthlete(isExpanded ? null : entry.id)}
                  className="w-full px-3 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {entry.bib_number && (
                      <span className="text-sm font-mono font-medium text-gray-600 w-8">
                        {entry.bib_number}
                      </span>
                    )}
                    <span className="font-medium text-gray-900 text-sm">
                      {entry.athlete?.first_name} {entry.athlete?.last_name}
                    </span>
                    {isRecentlyCleared && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">
                        KLART!
                      </span>
                    )}
                    {isRecentlyEliminated && (
                      <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">
                        UTE!
                      </span>
                    )}
                    {state?.best_height && !isRecentlyFinished && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-mono">
                        {formatHeight(state.best_height)}
                      </span>
                    )}
                    {remainingAttempts < 3 && !isRecentlyFinished && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        remainingAttempts === 1 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {remainingAttempts} igjen
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Attempts at current height */}
                    <div className="flex gap-1">
                      {heightAttempts.map((att, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded flex items-center justify-center text-sm font-mono font-bold ${
                            att === 'o'
                              ? 'bg-green-100 text-green-700'
                              : att === 'x'
                              ? 'bg-red-100 text-red-700'
                              : att === '-'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-gray-50 text-gray-300'
                          }`}
                        >
                          {att === 'o' ? 'O' : att === 'x' ? 'X' : att === '-' ? '-' : (i + 1)}
                        </div>
                      ))}
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-3">
                    {/* Quick action buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <button
                        onClick={() => recordAttempt(entry.id, 'o')}
                        className="py-4 rounded-lg font-bold text-lg bg-green-100 text-green-700 active:bg-green-200 transition-colors"
                      >
                        O
                      </button>
                      <button
                        onClick={() => recordAttempt(entry.id, 'x')}
                        className="py-4 rounded-lg font-bold text-lg bg-red-100 text-red-700 active:bg-red-200 transition-colors"
                      >
                        X
                      </button>
                      <button
                        onClick={() => recordAttempt(entry.id, '-')}
                        className="py-4 rounded-lg font-bold text-lg bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors"
                      >
                        -
                      </button>
                      <button
                        onClick={() => clearLastAttempt(entry.id)}
                        className="py-4 rounded-lg text-sm bg-white border border-gray-200 text-gray-600 active:bg-gray-50 transition-colors"
                      >
                        Angre
                      </button>
                    </div>

                    {/* Status buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Status:</span>
                      <button
                        onClick={() => setAthleteStatus(entry.id, 'retired')}
                        className={`px-2 py-1 rounded text-xs font-mono ${
                          state?.status === 'retired'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        r
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Standings */}
      {(standings.withHeight.length > 0 || standings.nmAthletes.length > 0 || standings.dnsAthletes.length > 0) && (
        <div className="p-2">
          <div className="bg-white rounded-lg p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Resultater
            </h3>

            {/* Series grid with heights header */}
            {attemptedHeights.length > 0 && (
              <div className="overflow-x-auto -mx-3 px-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-2 font-medium text-gray-600">Plass</th>
                      <th className="text-left py-1 pr-2 font-medium text-gray-600">Navn</th>
                      {attemptedHeights.map(h => (
                        <th key={h} className="text-center py-1 px-1 font-mono font-medium text-gray-500 min-w-[40px]">
                          {formatHeight(h)}
                        </th>
                      ))}
                      <th className="text-right py-1 pl-2 font-medium text-gray-600">Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Athletes with valid heights */}
                    {standings.withHeight.map(({ entry, state }, index) => {
                      const bestHeight = state?.best_height || 0;
                      const failuresAtBest = state ? getFailuresAtHeight(state, bestHeight) : 0;
                      const totalFailures = state ? getTotalFailures(state) : 0;

                      // Calculate actual placement considering ties
                      // Athletes with same best height, same failures at best, and same total failures tie
                      let place = 1;
                      for (let i = 0; i < index; i++) {
                        const prevState = standings.withHeight[i].state;
                        const prevBestHeight = prevState?.best_height || 0;
                        const prevFailuresAtBest = prevState ? getFailuresAtHeight(prevState, prevBestHeight) : 0;
                        const prevTotalFailures = prevState ? getTotalFailures(prevState) : 0;

                        // If this athlete has worse result than previous, increment place
                        if (
                          bestHeight < prevBestHeight ||
                          (bestHeight === prevBestHeight && failuresAtBest > prevFailuresAtBest) ||
                          (bestHeight === prevBestHeight && failuresAtBest === prevFailuresAtBest && totalFailures > prevTotalFailures)
                        ) {
                          place = i + 2; // +2 because we need next place after index i
                        }
                      }

                      // Format attempts at a height into a string like "XO", "XXO", "O", "-", "Xr", "XXr"
                      const formatAttempts = (height: number): string => {
                        const attempts = state?.attempts[height] || [];
                        const validAttempts = attempts.filter(a => a !== null);
                        if (validAttempts.length === 0) return '';
                        return validAttempts.map(a =>
                          a === 'o' ? 'O' : a === 'x' ? 'X' : a === 'r' ? 'r' : '-'
                        ).join('');
                      };

                      return (
                        <tr key={entry.id} className="border-b border-gray-100 last:border-0">
                          <td className={`py-1.5 pr-2 font-medium ${
                            place === 1 ? 'text-yellow-600' :
                            place === 2 ? 'text-gray-500' :
                            place === 3 ? 'text-amber-700' : 'text-gray-400'
                          }`}>
                            {place}.
                          </td>
                          <td className="py-1.5 pr-2 text-gray-800 whitespace-nowrap">
                            {entry.athlete?.first_name} {entry.athlete?.last_name}
                          </td>
                          {attemptedHeights.map(h => {
                            const attempts = formatAttempts(h);
                            const hasCleared = attempts.includes('O');
                            const hasFailed = attempts.includes('X') && !hasCleared;
                            const hasRetired = attempts.includes('r');
                            return (
                              <td key={h} className={`py-1.5 px-1 text-center font-mono ${
                                hasCleared ? 'text-green-700 font-bold' :
                                hasRetired ? 'text-orange-600' :
                                hasFailed ? 'text-red-600' :
                                attempts === '-' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {attempts || '-'}
                              </td>
                            );
                          })}
                          <td className="py-1.5 pl-2 text-right font-mono font-bold text-gray-900">
                            {formatHeight(bestHeight)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Athletes with attempts but no cleared height */}
                    {standings.nmAthletes.map(({ entry, state }) => {
                      const formatAttempts = (height: number): string => {
                        const attempts = state?.attempts[height] || [];
                        const validAttempts = attempts.filter(a => a !== null);
                        if (validAttempts.length === 0) return '';
                        return validAttempts.map(a =>
                          a === 'o' ? 'O' : a === 'x' ? 'X' : a === 'r' ? 'r' : '-'
                        ).join('');
                      };

                      // Check if still competing (active) or eliminated (NH/eliminated)
                      const isStillCompeting = state?.status === 'active';
                      const resultText = isStillCompeting ? '-' : 'NM';
                      const resultColor = isStillCompeting ? 'text-gray-400' : 'text-orange-600';

                      return (
                        <tr key={entry.id} className="border-b border-gray-100 last:border-0 bg-gray-50">
                          <td className="py-1.5 pr-2 text-gray-400">-</td>
                          <td className="py-1.5 pr-2 text-gray-500 whitespace-nowrap">
                            {entry.athlete?.first_name} {entry.athlete?.last_name}
                          </td>
                          {attemptedHeights.map(h => {
                            const attempts = formatAttempts(h);
                            const hasRetired = attempts.includes('r');
                            return (
                              <td key={h} className={`py-1.5 px-1 text-center font-mono ${hasRetired ? 'text-orange-600' : 'text-red-500'}`}>
                                {attempts || '-'}
                              </td>
                            );
                          })}
                          <td className={`py-1.5 pl-2 text-right font-mono font-bold ${resultColor}`}>
                            {resultText}
                          </td>
                        </tr>
                      );
                    })}

                    {/* DNS athletes */}
                    {standings.dnsAthletes.map(({ entry }) => (
                      <tr key={entry.id} className="border-b border-gray-100 last:border-0 bg-gray-50">
                        <td className="py-1.5 pr-2 text-gray-400">-</td>
                        <td className="py-1.5 pr-2 text-gray-500 whitespace-nowrap">
                          {entry.athlete?.first_name} {entry.athlete?.last_name}
                        </td>
                        {attemptedHeights.map(h => (
                          <td key={h} className="py-1.5 px-1 text-center text-gray-300">-</td>
                        ))}
                        <td className="py-1.5 pl-2 text-right font-mono font-bold text-red-600">
                          DNS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Fallback if no heights attempted yet */}
            {attemptedHeights.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                Ingen forsøk registrert ennå
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
        <button
          onClick={saveAllResults}
          disabled={saving || completing}
          className="flex-1 py-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Lagrer...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Lagre alt
            </>
          )}
        </button>
        <button
          onClick={completeEvent}
          disabled={saving || completing}
          className="flex-1 py-4 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {completing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Fullfører...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Fullfør øvelse
            </>
          )}
        </button>
      </div>
    </div>
  );
}
