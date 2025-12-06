/**
 * World Athletics Seeding Rules Implementation
 * Based on WA Technical Rules 20.1-20.8
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SeededAthlete {
  id: string;
  name: string;
  club?: string;
  seedTime?: number; // in milliseconds for track, cm for field
  seedMark?: string; // display format (e.g., "10.45", "2.05")
  ranking: number;
}

export interface Heat {
  heatNumber: number;
  athletes: HeatAssignment[];
}

export interface HeatAssignment {
  athlete: SeededAthlete;
  lane?: number;
  position?: number; // for non-lane events
}

export type RaceType = 'straight' | '200m_300m' | '400m_relay_800m' | 'distance';
export type LaneCount = 6 | 8 | 9;

export interface SeedingConfig {
  raceType: RaceType;
  laneCount: LaneCount;
  heatCount: number;
  qualificationRule: QualificationRule;
}

export interface QualificationRule {
  byPlace: number;  // e.g., top 3 from each heat
  byTime: number;   // e.g., next 2 fastest times
}

// ============================================================================
// ZIGZAG HEAT DISTRIBUTION (Rule 20.3.3)
// ============================================================================

/**
 * Distributes athletes into heats using zigzag (serpentine) method.
 * Example for 3 heats:
 *   Heat A: 1, 6, 7, 12, 13, 18...
 *   Heat B: 2, 5, 8, 11, 14, 17...
 *   Heat C: 3, 4, 9, 10, 15, 16...
 */
export function distributeToHeats(
  athletes: SeededAthlete[],
  heatCount: number
): Heat[] {
  if (heatCount < 1) throw new Error('Heat count must be at least 1');
  if (athletes.length === 0) return [];

  // Sort athletes by ranking (1 = best)
  const sorted = [...athletes].sort((a, b) => a.ranking - b.ranking);

  // Initialize heats
  const heats: Heat[] = Array.from({ length: heatCount }, (_, i) => ({
    heatNumber: i + 1,
    athletes: [],
  }));

  // Zigzag distribution
  let direction = 1; // 1 = forward, -1 = backward
  let heatIndex = 0;

  for (const athlete of sorted) {
    heats[heatIndex].athletes.push({ athlete });

    // Move to next heat
    heatIndex += direction;

    // Reverse direction at boundaries
    if (heatIndex >= heatCount) {
      heatIndex = heatCount - 1;
      direction = -1;
    } else if (heatIndex < 0) {
      heatIndex = 0;
      direction = 1;
    }
  }

  return heats;
}

/**
 * Calculate optimal number of heats based on athlete count and lane count
 */
export function calculateHeatCount(
  athleteCount: number,
  maxPerHeat: number
): number {
  if (athleteCount <= maxPerHeat) return 1;
  return Math.ceil(athleteCount / maxPerHeat);
}

// ============================================================================
// LANE ASSIGNMENT (Rules 20.4.3 - 20.4.8)
// ============================================================================

/**
 * Lane groups for 8-lane track - straight races (60m, 100m)
 * Rule 20.4.3
 */
const LANE_GROUPS_8_STRAIGHT = {
  top: [3, 4, 5, 6],      // Ranked 1-4
  middle: [2, 7],          // Ranked 5-6
  outer: [1, 8],           // Ranked 7-8
};

/**
 * Lane groups for 8-lane track - 200m/300m
 * Rule 20.4.4
 */
const LANE_GROUPS_8_200M = {
  top: [5, 6, 7],          // Ranked 1-3
  middle: [3, 4, 8],       // Ranked 4-6
  outer: [1, 2],           // Ranked 7-8
};

/**
 * Lane groups for 8-lane track - 400m, relays, 800m in lanes
 * Rule 20.4.5
 */
const LANE_GROUPS_8_400M = {
  top: [4, 5, 6, 7],       // Ranked 1-4
  middle: [3, 8],          // Ranked 5-6
  outer: [1, 2],           // Ranked 7-8
};

/**
 * Lane groups for 9-lane track - straight races
 * Rule 20.4.6
 */
const LANE_GROUPS_9_STRAIGHT = {
  top: [4, 5, 6],          // Ranked 1-3
  upper_middle: [3, 7],    // Ranked 4-5
  lower_middle: [2, 8],    // Ranked 6-7
  outer: [1, 9],           // Ranked 8-9
};

/**
 * Lane groups for 9-lane track - 200m/300m
 * Rule 20.4.7
 */
const LANE_GROUPS_9_200M = {
  top: [5, 6, 7, 8],       // Ranked 1-4
  middle: [3, 4, 9],       // Ranked 5-7
  outer: [1, 2],           // Ranked 8-9
};

/**
 * Lane groups for 9-lane track - 400m, relays, 800m in lanes
 * Rule 20.4.8
 */
const LANE_GROUPS_9_400M = {
  top: [5, 6, 7],          // Ranked 1-3
  upper_middle: [4, 8],    // Ranked 4-5
  lower_middle: [3, 9],    // Ranked 6-7
  outer: [1, 2],           // Ranked 8-9
};

/**
 * Lane groups for 6-lane track (simplified)
 */
const LANE_GROUPS_6_STRAIGHT = {
  top: [3, 4],             // Ranked 1-2
  middle: [2, 5],          // Ranked 3-4
  outer: [1, 6],           // Ranked 5-6
};

const LANE_GROUPS_6_400M = {
  top: [3, 4, 5],          // Ranked 1-3
  middle: [2, 6],          // Ranked 4-5
  outer: [1],              // Ranked 6
};

/**
 * Get lane groups based on race type and lane count
 */
function getLaneGroups(raceType: RaceType, laneCount: LaneCount) {
  if (laneCount === 6) {
    return raceType === '400m_relay_800m' ? LANE_GROUPS_6_400M : LANE_GROUPS_6_STRAIGHT;
  }

  if (laneCount === 9) {
    switch (raceType) {
      case 'straight': return LANE_GROUPS_9_STRAIGHT;
      case '200m_300m': return LANE_GROUPS_9_200M;
      case '400m_relay_800m': return LANE_GROUPS_9_400M;
      default: return LANE_GROUPS_9_STRAIGHT;
    }
  }

  // Default: 8 lanes
  switch (raceType) {
    case 'straight': return LANE_GROUPS_8_STRAIGHT;
    case '200m_300m': return LANE_GROUPS_8_200M;
    case '400m_relay_800m': return LANE_GROUPS_8_400M;
    default: return LANE_GROUPS_8_STRAIGHT;
  }
}

/**
 * Shuffle array randomly (Fisher-Yates)
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Assign lanes to athletes in a heat based on WA rules.
 * Athletes are drawn randomly within their ranking group.
 */
export function assignLanes(
  heat: Heat,
  raceType: RaceType,
  laneCount: LaneCount
): Heat {
  const athletes = heat.athletes
    .map(a => a.athlete)
    .sort((a, b) => a.ranking - b.ranking);

  const groups = getLaneGroups(raceType, laneCount);
  const groupKeys = Object.keys(groups) as (keyof typeof groups)[];

  const assignments: HeatAssignment[] = [];
  let athleteIndex = 0;

  for (const groupKey of groupKeys) {
    const lanes = groups[groupKey] as number[];
    const shuffledLanes = shuffle(lanes);

    for (const lane of shuffledLanes) {
      if (athleteIndex >= athletes.length) break;

      assignments.push({
        athlete: athletes[athleteIndex],
        lane,
      });
      athleteIndex++;
    }
  }

  // Sort by lane number for display
  assignments.sort((a, b) => (a.lane || 0) - (b.lane || 0));

  return {
    ...heat,
    athletes: assignments,
  };
}

// ============================================================================
// RANKING AFTER QUALIFICATION ROUND (Rule 20.3.2)
// ============================================================================

export interface RoundResult {
  athleteId: string;
  heatNumber: number;
  place: number;       // Place within heat (1, 2, 3...)
  time: number;        // Time in milliseconds
  qualified: boolean;  // Did they qualify?
  qualifiedBy: 'place' | 'time' | null;
}

/**
 * Rank athletes after a qualification round for seeding into next round.
 * For events up to 400m (Rule 20.3.2a):
 * - Fastest heat winner, 2nd fastest heat winner, etc.
 * - Then fastest 2nd place, 2nd fastest 2nd place, etc.
 * - Then time qualifiers in order
 */
export function rankAfterQualificationRound(
  results: RoundResult[]
): SeededAthlete[] {
  // Group by place within heat
  const byPlace = new Map<number, RoundResult[]>();
  const timeQualifiers: RoundResult[] = [];

  for (const result of results) {
    if (!result.qualified) continue;

    if (result.qualifiedBy === 'place') {
      const existing = byPlace.get(result.place) || [];
      existing.push(result);
      byPlace.set(result.place, existing);
    } else if (result.qualifiedBy === 'time') {
      timeQualifiers.push(result);
    }
  }

  // Sort each place group by time (fastest first)
  const sortedGroups: RoundResult[][] = [];
  const places = Array.from(byPlace.keys()).sort((a, b) => a - b);

  for (const place of places) {
    const group = byPlace.get(place) || [];
    group.sort((a, b) => a.time - b.time);
    sortedGroups.push(group);
  }

  // Add time qualifiers sorted by time
  timeQualifiers.sort((a, b) => a.time - b.time);
  sortedGroups.push(timeQualifiers);

  // Flatten and assign rankings
  const ranked: SeededAthlete[] = [];
  let ranking = 1;

  for (const group of sortedGroups) {
    for (const result of group) {
      ranked.push({
        id: result.athleteId,
        name: '', // Would be filled from athlete data
        ranking,
        seedTime: result.time,
      });
      ranking++;
    }
  }

  return ranked;
}

// ============================================================================
// DETERMINE QUALIFIERS (Rule 20.8)
// ============================================================================

/**
 * Determine which athletes qualify from a round based on place + time rules.
 * Example: "Top 3 from each heat (Q) + next 2 fastest times (q)"
 */
export function determineQualifiers(
  heats: { heatNumber: number; results: { athleteId: string; place: number; time: number }[] }[],
  qualifyByPlace: number,
  qualifyByTime: number
): RoundResult[] {
  const results: RoundResult[] = [];
  const timeQualifierCandidates: RoundResult[] = [];

  // First, mark place qualifiers
  for (const heat of heats) {
    for (const result of heat.results) {
      const qualifiedByPlace = result.place <= qualifyByPlace;

      const roundResult: RoundResult = {
        athleteId: result.athleteId,
        heatNumber: heat.heatNumber,
        place: result.place,
        time: result.time,
        qualified: qualifiedByPlace,
        qualifiedBy: qualifiedByPlace ? 'place' : null,
      };

      if (qualifiedByPlace) {
        results.push(roundResult);
      } else {
        timeQualifierCandidates.push(roundResult);
      }
    }
  }

  // Sort non-qualified by time and take top N
  timeQualifierCandidates.sort((a, b) => a.time - b.time);
  const timeQualifiers = timeQualifierCandidates.slice(0, qualifyByTime);

  for (const tq of timeQualifiers) {
    tq.qualified = true;
    tq.qualifiedBy = 'time';
    results.push(tq);
  }

  return results;
}

// ============================================================================
// HELPER: PARSE/FORMAT TIMES
// ============================================================================

/**
 * Parse time string (e.g., "10.45", "1:45.32") to milliseconds
 */
export function parseTimeToMs(timeStr: string): number {
  const parts = timeStr.split(':');

  if (parts.length === 1) {
    // Seconds only: "10.45"
    return Math.round(parseFloat(parts[0]) * 1000);
  } else if (parts.length === 2) {
    // Minutes:seconds: "1:45.32"
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return Math.round((minutes * 60 + seconds) * 1000);
  } else if (parts.length === 3) {
    // Hours:minutes:seconds: "2:09:45"
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }

  return 0;
}

/**
 * Format milliseconds to time string
 */
export function formatMsToTime(ms: number): string {
  const totalSeconds = ms / 1000;

  if (totalSeconds < 60) {
    return totalSeconds.toFixed(2);
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
    return `${minutes}:${seconds}`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}`;
  }
}

// ============================================================================
// DETERMINE RACE TYPE FROM EVENT
// ============================================================================

/**
 * Determine the race type for lane assignment rules based on event name/distance
 */
export function getRaceTypeFromEvent(eventName: string): RaceType {
  const name = eventName.toLowerCase();

  // Distance events (no lanes after start)
  if (name.includes('800') && !name.includes('stafett') && !name.includes('relay')) {
    return 'distance'; // 800m can be run without lanes
  }
  if (name.includes('1500') || name.includes('3000') || name.includes('5000') ||
      name.includes('10000') || name.includes('mile')) {
    return 'distance';
  }

  // Straight races
  if (name.includes('60') || name.includes('100')) {
    return 'straight';
  }

  // 200m/300m bend races
  if (name.includes('200') || name.includes('300')) {
    return '200m_300m';
  }

  // 400m, relays, 800m in lanes
  if (name.includes('400') || name.includes('stafett') || name.includes('relay')) {
    return '400m_relay_800m';
  }

  // Default to straight
  return 'straight';
}

// ============================================================================
// FULL SEEDING WORKFLOW
// ============================================================================

export interface SeedingResult {
  heats: Heat[];
  config: SeedingConfig;
}

/**
 * Complete seeding workflow:
 * 1. Distribute athletes to heats (zigzag)
 * 2. Assign lanes within each heat
 */
export function seedEvent(
  athletes: SeededAthlete[],
  config: SeedingConfig
): SeedingResult {
  // Calculate heat count if not specified
  const heatCount = config.heatCount || calculateHeatCount(athletes.length, config.laneCount);

  // Step 1: Distribute to heats
  let heats = distributeToHeats(athletes, heatCount);

  // Step 2: Assign lanes (for lane events)
  if (config.raceType !== 'distance') {
    heats = heats.map(heat => assignLanes(heat, config.raceType, config.laneCount));
  }

  return {
    heats,
    config: { ...config, heatCount },
  };
}
