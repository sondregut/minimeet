/**
 * Seeding Presets for Different Competition Types
 */

import type { LaneCount, QualificationRule, RaceType } from './seeding-rules';

// ============================================================================
// PRESET TYPES
// ============================================================================

export type SeedingPresetId =
  | 'wa_standard'
  | 'club_simplified'
  | 'school_basic'
  | 'manual';

export interface SeedingPreset {
  id: SeedingPresetId;
  name: string;
  nameNo: string; // Norwegian
  description: string;
  descriptionNo: string;
  settings: SeedingPresetSettings;
}

export interface SeedingPresetSettings {
  useZigzagDistribution: boolean;
  useLaneDrawByRanking: boolean;
  separateClubs: boolean;           // Spread athletes from same club across heats
  separateTopSeeds: boolean;        // Ensure top seeds are in different heats
  firstRoundLanesByLot: boolean;    // First round: random lanes (WA rule)
  subsequentRoundsLanesByRanking: boolean;
  defaultLaneCount: LaneCount;
  qualificationRules: {
    twoRounds: QualificationRule;    // Heats → Final
    threeRounds: QualificationRule;  // Heats → Semi → Final
  };
}

// ============================================================================
// QUALIFICATION TABLES (based on WA)
// ============================================================================

/**
 * Standard qualification rules by heat count
 * Format: { byPlace, byTime }
 */
export const QUALIFICATION_TABLES = {
  // For direct to final (2 rounds: heats → final)
  twoRounds: {
    2: { byPlace: 4, byTime: 0 },   // 2 heats: top 4 each → 8 in final
    3: { byPlace: 2, byTime: 2 },   // 3 heats: top 2 each + 2 fastest → 8
    4: { byPlace: 2, byTime: 0 },   // 4 heats: top 2 each → 8
    5: { byPlace: 1, byTime: 3 },   // 5 heats: winner + 3 fastest → 8
    6: { byPlace: 1, byTime: 2 },   // 6 heats: winner + 2 fastest → 8
  },
  // For semi-finals (3 rounds: heats → semi → final)
  threeRounds: {
    heatsToSemi: {
      4: { byPlace: 3, byTime: 4 },  // 4 heats → 16 semi: top 3 + 4 fastest
      5: { byPlace: 3, byTime: 1 },  // 5 heats → 16 semi: top 3 + 1 fastest
      6: { byPlace: 2, byTime: 4 },  // 6 heats → 16 semi: top 2 + 4 fastest
      8: { byPlace: 2, byTime: 0 },  // 8 heats → 16 semi: top 2 each
    },
    semiToFinal: {
      2: { byPlace: 4, byTime: 0 },  // 2 semis → 8 final: top 4 each
      3: { byPlace: 2, byTime: 2 },  // 3 semis → 8 final: top 2 + 2 fastest
    },
  },
} as const;

// ============================================================================
// PRESETS
// ============================================================================

export const SEEDING_PRESETS: Record<SeedingPresetId, SeedingPreset> = {
  wa_standard: {
    id: 'wa_standard',
    name: 'World Athletics Standard',
    nameNo: 'World Athletics Standard',
    description: 'Full WA rules with zigzag distribution, lane draw by ranking groups, and club separation',
    descriptionNo: 'Fullstendige WA-regler med zigzag-fordeling, banetrekning etter ranking og klubbseparasjon',
    settings: {
      useZigzagDistribution: true,
      useLaneDrawByRanking: true,
      separateClubs: true,
      separateTopSeeds: true,
      firstRoundLanesByLot: true,
      subsequentRoundsLanesByRanking: true,
      defaultLaneCount: 8,
      qualificationRules: {
        twoRounds: { byPlace: 3, byTime: 2 },
        threeRounds: { byPlace: 2, byTime: 2 },
      },
    },
  },

  club_simplified: {
    id: 'club_simplified',
    name: 'Club Meet (Simplified)',
    nameNo: 'Klubbstevne (forenklet)',
    description: 'Simplified rules suitable for club competitions. Uses zigzag but simplified lane assignment.',
    descriptionNo: 'Forenklede regler for klubbstevner. Bruker zigzag-fordeling men enklere banetildeling.',
    settings: {
      useZigzagDistribution: true,
      useLaneDrawByRanking: false, // Simpler: just random lanes
      separateClubs: false,        // Not relevant for club meets
      separateTopSeeds: true,
      firstRoundLanesByLot: true,
      subsequentRoundsLanesByRanking: false,
      defaultLaneCount: 6,
      qualificationRules: {
        twoRounds: { byPlace: 3, byTime: 0 }, // Just top 3 advance
        threeRounds: { byPlace: 2, byTime: 0 },
      },
    },
  },

  school_basic: {
    id: 'school_basic',
    name: 'School Competition',
    nameNo: 'Skolestevne',
    description: 'Basic rules for school competitions. Random heat and lane assignment.',
    descriptionNo: 'Enkle regler for skolestevner. Tilfeldig heat- og banetildeling.',
    settings: {
      useZigzagDistribution: false, // Random assignment
      useLaneDrawByRanking: false,
      separateClubs: false,
      separateTopSeeds: false,
      firstRoundLanesByLot: true,
      subsequentRoundsLanesByRanking: false,
      defaultLaneCount: 6,
      qualificationRules: {
        twoRounds: { byPlace: 2, byTime: 2 },
        threeRounds: { byPlace: 2, byTime: 0 },
      },
    },
  },

  manual: {
    id: 'manual',
    name: 'Manual Assignment',
    nameNo: 'Manuell tildeling',
    description: 'No automatic seeding. Manually assign athletes to heats and lanes.',
    descriptionNo: 'Ingen automatisk seeding. Tildel utøvere til heat og baner manuelt.',
    settings: {
      useZigzagDistribution: false,
      useLaneDrawByRanking: false,
      separateClubs: false,
      separateTopSeeds: false,
      firstRoundLanesByLot: false,
      subsequentRoundsLanesByRanking: false,
      defaultLaneCount: 8,
      qualificationRules: {
        twoRounds: { byPlace: 3, byTime: 0 },
        threeRounds: { byPlace: 2, byTime: 2 },
      },
    },
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export function getPreset(id: SeedingPresetId): SeedingPreset {
  return SEEDING_PRESETS[id];
}

export function getAllPresets(): SeedingPreset[] {
  return Object.values(SEEDING_PRESETS);
}

/**
 * Get recommended preset based on competition type
 */
export function getRecommendedPreset(competitionType: string): SeedingPresetId {
  const type = competitionType.toLowerCase();

  if (type.includes('nm') || type.includes('mester') || type.includes('championship')) {
    return 'wa_standard';
  }
  if (type.includes('skole') || type.includes('school')) {
    return 'school_basic';
  }
  if (type.includes('klubb') || type.includes('club')) {
    return 'club_simplified';
  }

  // Default to club simplified for most local meets
  return 'club_simplified';
}

/**
 * Calculate optimal round structure based on athlete count and final size
 */
export function calculateRoundStructure(
  athleteCount: number,
  laneCount: LaneCount,
  targetFinalSize: number = 8
): {
  rounds: number;
  heatsPerRound: number[];
  qualificationRules: QualificationRule[];
} {
  if (athleteCount <= laneCount) {
    // Direct final
    return {
      rounds: 1,
      heatsPerRound: [1],
      qualificationRules: [],
    };
  }

  if (athleteCount <= laneCount * 3) {
    // Heats → Final (2 rounds)
    const heatCount = Math.ceil(athleteCount / laneCount);
    const qRule = QUALIFICATION_TABLES.twoRounds[heatCount as keyof typeof QUALIFICATION_TABLES.twoRounds]
      || { byPlace: Math.floor(targetFinalSize / heatCount), byTime: targetFinalSize % heatCount };

    return {
      rounds: 2,
      heatsPerRound: [heatCount, 1],
      qualificationRules: [qRule],
    };
  }

  // Heats → Semi → Final (3 rounds)
  // Calculate how many heats needed for ~16-24 athletes in semis
  const targetSemiSize = 16;
  const heatCount = Math.ceil(athleteCount / laneCount);
  const semiCount = Math.ceil(targetSemiSize / laneCount);

  const heatsToSemiRule = QUALIFICATION_TABLES.threeRounds.heatsToSemi[
    heatCount as keyof typeof QUALIFICATION_TABLES.threeRounds.heatsToSemi
  ] || { byPlace: 2, byTime: Math.max(0, targetSemiSize - heatCount * 2) };

  const semiToFinalRule = QUALIFICATION_TABLES.threeRounds.semiToFinal[
    semiCount as keyof typeof QUALIFICATION_TABLES.threeRounds.semiToFinal
  ] || { byPlace: 3, byTime: 2 };

  return {
    rounds: 3,
    heatsPerRound: [heatCount, semiCount, 1],
    qualificationRules: [heatsToSemiRule, semiToFinalRule],
  };
}
