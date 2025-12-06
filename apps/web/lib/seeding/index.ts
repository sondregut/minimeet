/**
 * Seeding Module
 *
 * Implements World Athletics seeding rules for track events.
 *
 * Usage:
 * ```typescript
 * import {
 *   seedEvent,
 *   distributeToHeats,
 *   assignLanes,
 *   getPreset,
 *   calculateRoundStructure,
 * } from '@/lib/seeding';
 * ```
 */

// Core seeding algorithms
export {
  // Types
  type SeededAthlete,
  type Heat,
  type HeatAssignment,
  type RaceType,
  type LaneCount,
  type SeedingConfig,
  type QualificationRule,
  type RoundResult,
  type SeedingResult,
  // Functions
  distributeToHeats,
  calculateHeatCount,
  assignLanes,
  rankAfterQualificationRound,
  determineQualifiers,
  parseTimeToMs,
  formatMsToTime,
  getRaceTypeFromEvent,
  seedEvent,
} from './seeding-rules';

// Presets and configuration
export {
  // Types
  type SeedingPresetId,
  type SeedingPreset,
  type SeedingPresetSettings,
  // Constants
  SEEDING_PRESETS,
  QUALIFICATION_TABLES,
  // Functions
  getPreset,
  getAllPresets,
  getRecommendedPreset,
  calculateRoundStructure,
} from './seeding-presets';
