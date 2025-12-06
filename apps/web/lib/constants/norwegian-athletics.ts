// Norwegian Athletics Federation - Official Event Rules
// Source: Norges Friidrettsforbund øvelsesutvalg

export type Gender = 'male' | 'female';
export type VenueType = 'indoor' | 'outdoor' | 'road';

export type AgeClass =
  | 'rekrutt' // 6-8 years
  | '9'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '16'
  | '17'
  | 'u20' // Junior 18-19
  | 'u23' // Junior 20-22
  | 'senior';

export type EventType =
  | 'sprint'
  | 'middle_distance'
  | 'long_distance'
  | 'hurdles'
  | 'steeplechase'
  | 'race_walk'
  | 'high_jump'
  | 'pole_vault'
  | 'long_jump'
  | 'triple_jump'
  | 'shot_put'
  | 'discus'
  | 'hammer'
  | 'javelin'
  | 'ball_throw'
  | 'combined'
  | 'relay'
  | 'road_race';

export interface EventDefinition {
  code: string;
  name: string;
  nameEn: string;
  type: EventType;
  isTimed: boolean; // true = lower is better, false = higher is better
  unit: 'time' | 'distance' | 'height' | 'points';
}

export interface AgeClassInfo {
  code: AgeClass;
  name: string;
  ageRange: string;
  minAge: number;
  maxAge: number;
}

export interface EquipmentSpec {
  weight?: number; // kg
  height?: number; // cm (for hurdles)
  length?: number; // cm (for hammer wire)
}

export interface EventAvailability {
  event: string;
  male: AgeClass[];
  female: AgeClass[];
  equipmentMale?: Record<AgeClass, EquipmentSpec>;
  equipmentFemale?: Record<AgeClass, EquipmentSpec>;
}

// Age Classes
export const AGE_CLASSES: AgeClassInfo[] = [
  { code: 'rekrutt', name: 'Rekrutt', ageRange: '6-8 år', minAge: 6, maxAge: 8 },
  { code: '9', name: '9 år', ageRange: '9 år', minAge: 9, maxAge: 9 },
  { code: '10', name: '10 år', ageRange: '10 år', minAge: 10, maxAge: 10 },
  { code: '11', name: '11 år', ageRange: '11 år', minAge: 11, maxAge: 11 },
  { code: '12', name: '12 år', ageRange: '12 år', minAge: 12, maxAge: 12 },
  { code: '13', name: '13 år', ageRange: '13 år', minAge: 13, maxAge: 13 },
  { code: '14', name: '14 år', ageRange: '14 år', minAge: 14, maxAge: 14 },
  { code: '15', name: '15 år', ageRange: '15 år', minAge: 15, maxAge: 15 },
  { code: '16', name: '16 år', ageRange: '16 år', minAge: 16, maxAge: 16 },
  { code: '17', name: '17 år', ageRange: '17 år', minAge: 17, maxAge: 17 },
  { code: 'u20', name: 'Junior U20', ageRange: '18-19 år', minAge: 18, maxAge: 19 },
  { code: 'u23', name: 'Junior U23', ageRange: '20-22 år', minAge: 20, maxAge: 22 },
  { code: 'senior', name: 'Senior', ageRange: '23+ år', minAge: 23, maxAge: 99 },
];

// All Events
export const EVENTS: EventDefinition[] = [
  // Sprints
  { code: '40m', name: '40 meter', nameEn: '40m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '60m', name: '60 meter', nameEn: '60m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '80m', name: '80 meter', nameEn: '80m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '100m', name: '100 meter', nameEn: '100m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '150m', name: '150 meter', nameEn: '150m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '200m', name: '200 meter', nameEn: '200m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '300m', name: '300 meter', nameEn: '300m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '400m', name: '400 meter', nameEn: '400m', type: 'sprint', isTimed: true, unit: 'time' },
  { code: '400m_strek', name: '400m (fra strek)', nameEn: '400m (waterfall start)', type: 'sprint', isTimed: true, unit: 'time' },

  // Middle Distance
  { code: '600m', name: '600 meter', nameEn: '600m', type: 'middle_distance', isTimed: true, unit: 'time' },
  { code: '800m', name: '800 meter', nameEn: '800m', type: 'middle_distance', isTimed: true, unit: 'time' },
  { code: '1000m', name: '1000 meter', nameEn: '1000m', type: 'middle_distance', isTimed: true, unit: 'time' },
  { code: '1500m', name: '1500 meter', nameEn: '1500m', type: 'middle_distance', isTimed: true, unit: 'time' },
  { code: '1609m', name: '1 engelsk mil', nameEn: '1 Mile', type: 'middle_distance', isTimed: true, unit: 'time' },

  // Long Distance
  { code: '2000m', name: '2000 meter', nameEn: '2000m', type: 'long_distance', isTimed: true, unit: 'time' },
  { code: '3000m', name: '3000 meter', nameEn: '3000m', type: 'long_distance', isTimed: true, unit: 'time' },
  { code: '3218m', name: '2 engelske mil', nameEn: '2 Mile', type: 'long_distance', isTimed: true, unit: 'time' },
  { code: '5000m', name: '5000 meter', nameEn: '5000m', type: 'long_distance', isTimed: true, unit: 'time' },
  { code: '10000m', name: '10000 meter', nameEn: '10000m', type: 'long_distance', isTimed: true, unit: 'time' },

  // Hurdles
  { code: '60mH', name: '60m hekk', nameEn: '60m Hurdles', type: 'hurdles', isTimed: true, unit: 'time' },
  { code: '80mH', name: '80m hekk', nameEn: '80m Hurdles', type: 'hurdles', isTimed: true, unit: 'time' },
  { code: '100mH', name: '100m hekk', nameEn: '100m Hurdles', type: 'hurdles', isTimed: true, unit: 'time' },
  { code: '110mH', name: '110m hekk', nameEn: '110m Hurdles', type: 'hurdles', isTimed: true, unit: 'time' },
  { code: '200mH', name: '200m hekk', nameEn: '200m Hurdles', type: 'hurdles', isTimed: true, unit: 'time' },
  { code: '300mH', name: '300m hekk', nameEn: '300m Hurdles', type: 'hurdles', isTimed: true, unit: 'time' },
  { code: '400mH', name: '400m hekk', nameEn: '400m Hurdles', type: 'hurdles', isTimed: true, unit: 'time' },

  // Steeplechase
  { code: '200_400mH_20cm', name: '200-400m hinder (20cm)', nameEn: '200-400m Obstacles (20cm)', type: 'steeplechase', isTimed: true, unit: 'time' },
  { code: '800mH_50cm', name: '800m hinder (50cm)', nameEn: '800m Obstacles (50cm)', type: 'steeplechase', isTimed: true, unit: 'time' },
  { code: '1500mSC', name: '1500m hinder', nameEn: '1500m Steeplechase', type: 'steeplechase', isTimed: true, unit: 'time' },
  { code: '2000mSC', name: '2000m hinder', nameEn: '2000m Steeplechase', type: 'steeplechase', isTimed: true, unit: 'time' },
  { code: '3000mSC', name: '3000m hinder', nameEn: '3000m Steeplechase', type: 'steeplechase', isTimed: true, unit: 'time' },

  // Race Walk
  { code: 'kappgang_400_800m', name: 'Kappgang 400-800m', nameEn: 'Race Walk 400-800m', type: 'race_walk', isTimed: true, unit: 'time' },
  { code: 'kappgang_600_1000m', name: 'Kappgang 600-1000m', nameEn: 'Race Walk 600-1000m', type: 'race_walk', isTimed: true, unit: 'time' },
  { code: 'kappgang_1000m', name: 'Kappgang 1000m', nameEn: 'Race Walk 1000m', type: 'race_walk', isTimed: true, unit: 'time' },
  { code: 'kappgang_1500m', name: 'Kappgang 1500m', nameEn: 'Race Walk 1500m', type: 'race_walk', isTimed: true, unit: 'time' },
  { code: 'kappgang_2000m', name: 'Kappgang 2000m', nameEn: 'Race Walk 2000m', type: 'race_walk', isTimed: true, unit: 'time' },
  { code: 'kappgang_3000m', name: 'Kappgang 3000m', nameEn: 'Race Walk 3000m', type: 'race_walk', isTimed: true, unit: 'time' },
  { code: 'kappgang_5000m', name: 'Kappgang 5000m', nameEn: 'Race Walk 5000m', type: 'race_walk', isTimed: true, unit: 'time' },
  { code: 'kappgang_10000m', name: 'Kappgang 10000m', nameEn: 'Race Walk 10000m', type: 'race_walk', isTimed: true, unit: 'time' },

  // Jumps
  { code: 'hoyde', name: 'Høyde', nameEn: 'High Jump', type: 'high_jump', isTimed: false, unit: 'height' },
  { code: 'hoyde_uten', name: 'Høyde uten tilløp', nameEn: 'Standing High Jump', type: 'high_jump', isTimed: false, unit: 'height' },
  { code: 'stav', name: 'Stav', nameEn: 'Pole Vault', type: 'pole_vault', isTimed: false, unit: 'height' },
  { code: 'lengde', name: 'Lengde', nameEn: 'Long Jump', type: 'long_jump', isTimed: false, unit: 'distance' },
  { code: 'lengde_uten', name: 'Lengde uten tilløp', nameEn: 'Standing Long Jump', type: 'long_jump', isTimed: false, unit: 'distance' },
  { code: 'tresteg', name: 'Tresteg', nameEn: 'Triple Jump', type: 'triple_jump', isTimed: false, unit: 'distance' },

  // Throws
  { code: 'kule', name: 'Kule', nameEn: 'Shot Put', type: 'shot_put', isTimed: false, unit: 'distance' },
  { code: 'diskos', name: 'Diskos', nameEn: 'Discus', type: 'discus', isTimed: false, unit: 'distance' },
  { code: 'slegge', name: 'Slegge', nameEn: 'Hammer', type: 'hammer', isTimed: false, unit: 'distance' },
  { code: 'spyd', name: 'Spyd', nameEn: 'Javelin', type: 'javelin', isTimed: false, unit: 'distance' },
  { code: 'liten_ball', name: 'Liten ball 150g', nameEn: 'Ball Throw 150g', type: 'ball_throw', isTimed: false, unit: 'distance' },
  { code: 'slengball', name: 'Slengball 1kg', nameEn: 'Rotational Ball 1kg', type: 'ball_throw', isTimed: false, unit: 'distance' },

  // Combined Events
  { code: 'mangekamp', name: 'Mangekamp', nameEn: 'Combined Events', type: 'combined', isTimed: false, unit: 'points' },
  { code: 'trekamp', name: 'Trekamp', nameEn: 'Triathlon', type: 'combined', isTimed: false, unit: 'points' },

  // Relays
  { code: '4x60m', name: '4x60m stafett', nameEn: '4x60m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: '4x100m', name: '4x100m stafett', nameEn: '4x100m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: '4x200m', name: '4x200m stafett', nameEn: '4x200m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: '4x400m', name: '4x400m stafett', nameEn: '4x400m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: '3x600m', name: '3x600m stafett', nameEn: '3x600m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: '3x800m', name: '3x800m stafett', nameEn: '3x800m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: '3x1000m', name: '3x1000m stafett', nameEn: '3x1000m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: '3x1500m', name: '3x1500m stafett', nameEn: '3x1500m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: 'hurricane_1000m', name: 'Hurricane-stafett 1000m', nameEn: 'Hurricane Relay 1000m', type: 'relay', isTimed: true, unit: 'time' },
  { code: 'hurricane_2000m', name: 'Hurricane-stafett 2000m', nameEn: 'Hurricane Relay 2000m', type: 'relay', isTimed: true, unit: 'time' },
  { code: 'hurricane_3000m', name: 'Hurricane-stafett 3000m', nameEn: 'Hurricane Relay 3000m', type: 'relay', isTimed: true, unit: 'time' },
  { code: '8x200m', name: '8x200m stafett', nameEn: '8x200m Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: 'donaldstafett', name: 'Donaldstafett', nameEn: 'Donald Relay', type: 'relay', isTimed: true, unit: 'time' },
  { code: 'stafett_40_600m', name: 'Stafett 40-600m', nameEn: 'Relay 40-600m', type: 'relay', isTimed: true, unit: 'time' },
];

// Shot Put weights by age and gender (kg)
export const SHOT_PUT_WEIGHTS: Record<Gender, Partial<Record<AgeClass, number>>> = {
  male: {
    rekrutt: 2, '9': 2, '10': 2, '11': 2,
    '12': 3, '13': 3,
    '14': 4, '15': 4,
    '16': 5, '17': 5,
    u20: 6,
    u23: 7.26, senior: 7.26,
  },
  female: {
    rekrutt: 2, '9': 2, '10': 2, '11': 2, '12': 2, '13': 2,
    '14': 3, '15': 3, '16': 3, '17': 3,
    u20: 4, u23: 4, senior: 4,
  },
};

// Discus weights by age and gender (kg)
export const DISCUS_WEIGHTS: Record<Gender, Partial<Record<AgeClass, number>>> = {
  male: {
    '9': 0.6, '10': 0.6, '11': 0.6,
    '12': 0.75, '13': 0.75,
    '14': 1, '15': 1,
    '16': 1.5, '17': 1.5,
    u20: 1.75,
    u23: 2, senior: 2,
  },
  female: {
    '9': 0.6, '10': 0.6, '11': 0.6, '12': 0.6, '13': 0.6,
    '14': 0.75, '15': 0.75,
    '16': 1, '17': 1,
    u20: 1, u23: 1, senior: 1,
  },
};

// Javelin weights by age and gender (g)
export const JAVELIN_WEIGHTS: Record<Gender, Partial<Record<AgeClass, number>>> = {
  male: {
    '9': 400, '10': 400, '11': 400, '12': 400, '13': 400,
    '14': 600, '15': 600,
    '16': 700, '17': 700,
    u20: 800, u23: 800, senior: 800,
  },
  female: {
    '9': 400, '10': 400, '11': 400, '12': 400, '13': 400, '14': 400,
    '15': 500, '16': 500, '17': 500,
    u20: 600, u23: 600, senior: 600,
  },
};

// Hammer specifications by age and gender (weight kg / wire length cm)
export const HAMMER_SPECS: Record<Gender, Partial<Record<AgeClass, { weight: number; wireLength: number }>>> = {
  male: {
    '9': { weight: 2, wireLength: 110 }, '10': { weight: 2, wireLength: 110 },
    '11': { weight: 2, wireLength: 110 }, '12': { weight: 2, wireLength: 110 },
    '13': { weight: 3, wireLength: 119.5 },
    '14': { weight: 4, wireLength: 119.5 }, '15': { weight: 4, wireLength: 119.5 },
    '16': { weight: 5, wireLength: 120 }, '17': { weight: 5, wireLength: 120 },
    u20: { weight: 6, wireLength: 121.5 },
    u23: { weight: 7.26, wireLength: 121.5 }, senior: { weight: 7.26, wireLength: 121.5 },
  },
  female: {
    '9': { weight: 2, wireLength: 110 }, '10': { weight: 2, wireLength: 110 },
    '11': { weight: 2, wireLength: 110 }, '12': { weight: 2, wireLength: 110 }, '13': { weight: 2, wireLength: 110 },
    '14': { weight: 3, wireLength: 119.5 }, '15': { weight: 3, wireLength: 119.5 },
    '16': { weight: 3, wireLength: 119.5 }, '17': { weight: 3, wireLength: 119.5 },
    u20: { weight: 4, wireLength: 119.5 }, u23: { weight: 4, wireLength: 119.5 }, senior: { weight: 4, wireLength: 119.5 },
  },
};

// Hurdle heights by event, age and gender (cm)
export const HURDLE_HEIGHTS: Record<string, Record<Gender, Partial<Record<AgeClass, number>>>> = {
  '60mH': {
    male: {
      rekrutt: 60, '9': 68, '10': 68, '11': 68,
      '12': 76.2, '13': 76.2,
      '14': 84, '15': 84,
      '16': 91.4, '17': 91.4,
      u20: 100, u23: 106.7, senior: 106.7,
    },
    female: {
      rekrutt: 60, '9': 68, '10': 68, '11': 68, '12': 68, '13': 68,
      '14': 76.2, '15': 76.2,
    },
  },
  '80mH': {
    male: {
      '14': 84,
    },
    female: {
      '15': 76.2, '16': 76.2,
    },
  },
  '100mH': {
    male: {
      '15': 84, '16': 91.4,
    },
    female: {
      '16': 76.2, '17': 76.2,
      u20: 84, u23: 84, senior: 84,
    },
  },
  '110mH': {
    male: {
      '17': 91.4,
      u20: 100,
      u23: 106.7, senior: 106.7,
    },
    female: {},
  },
  '200mH': {
    male: {
      '11': 68, '12': 68, '13': 68,
      '14': 76.2, '15': 76.2, '16': 76.2, '17': 76.2,
      u20: 76.2, u23: 76.2, senior: 76.2,
    },
    female: {
      '11': 68, '12': 68, '13': 68,
      '14': 76.2, '15': 76.2, '16': 76.2, '17': 76.2,
      u20: 76.2, u23: 76.2, senior: 76.2,
    },
  },
  '300mH': {
    male: {
      '14': 76.2, '15': 76.2,
      '16': 84, '17': 84,
      u20: 91.4, u23: 91.4, senior: 91.4,
    },
    female: {
      '14': 76.2, '15': 76.2, '16': 76.2, '17': 76.2,
      u20: 76.2, u23: 76.2, senior: 76.2,
    },
  },
  '400mH': {
    male: {
      '16': 84, '17': 84,
      u20: 91.4, u23: 91.4, senior: 91.4,
    },
    female: {
      '16': 76.2, '17': 76.2,
      u20: 76.2, u23: 76.2, senior: 76.2,
    },
  },
};

// Events available for each gender and age class
const ALL_AGES: AgeClass[] = ['rekrutt', '9', '10', '11', '12', '13', '14', '15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_9: AgeClass[] = ['9', '10', '11', '12', '13', '14', '15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_10: AgeClass[] = ['10', '11', '12', '13', '14', '15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_11: AgeClass[] = ['11', '12', '13', '14', '15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_12: AgeClass[] = ['12', '13', '14', '15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_13: AgeClass[] = ['13', '14', '15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_14: AgeClass[] = ['14', '15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_15: AgeClass[] = ['15', '16', '17', 'u20', 'u23', 'senior'];
const FROM_16: AgeClass[] = ['16', '17', 'u20', 'u23', 'senior'];
const FROM_17: AgeClass[] = ['17', 'u20', 'u23', 'senior'];
const FROM_U20: AgeClass[] = ['u20', 'u23', 'senior'];

export const EVENT_AVAILABILITY: Record<string, { male: AgeClass[]; female: AgeClass[] }> = {
  // Sprints
  '40m': { male: ALL_AGES, female: ALL_AGES },
  '60m': { male: ALL_AGES, female: ALL_AGES },
  '80m': { male: FROM_9, female: FROM_9 },
  '100m': { male: FROM_12, female: FROM_12 },
  '150m': { male: FROM_12, female: FROM_12 },
  '200m': { male: FROM_11, female: FROM_11 },
  '300m': { male: FROM_12, female: FROM_12 },
  '400m_strek': { male: ['rekrutt', '9', '10', '11', '12', '13'], female: ['rekrutt', '9', '10', '11', '12', '13'] },
  '400m': { male: FROM_14, female: FROM_14 },

  // Middle/Long Distance
  '600m': { male: FROM_10, female: FROM_10 },
  '800m': { male: FROM_13, female: FROM_13 },
  '1000m': { male: FROM_13, female: FROM_13 },
  '1500m': { male: FROM_12, female: FROM_12 },
  '1609m': { male: FROM_U20, female: FROM_U20 },
  '2000m': { male: FROM_14, female: FROM_14 },
  '3000m': { male: FROM_16, female: FROM_16 },
  '3218m': { male: FROM_U20, female: FROM_U20 },
  '5000m': { male: FROM_17, female: FROM_17 },
  '10000m': { male: FROM_U20, female: FROM_U20 },

  // Steeplechase
  '200_400mH_20cm': { male: ['rekrutt', '9', '10'], female: ['rekrutt', '9', '10'] },
  '800mH_50cm': { male: ['11', '12'], female: ['11', '12'] },
  '1500mSC': { male: ['13', '14', '15', '16'], female: ['13', '14', '15', '16'] },
  '2000mSC': { male: FROM_16, female: FROM_16 },
  '3000mSC': { male: FROM_U20, female: FROM_U20 },

  // Race Walk
  'kappgang_400_800m': { male: ['rekrutt', '9'], female: ['rekrutt', '9'] },
  'kappgang_600_1000m': { male: ['10'], female: ['10'] },
  'kappgang_1000m': { male: FROM_11, female: FROM_11 },
  'kappgang_1500m': { male: FROM_11, female: FROM_11 },
  'kappgang_2000m': { male: FROM_13, female: FROM_13 },
  'kappgang_3000m': { male: FROM_14, female: FROM_14 },
  'kappgang_5000m': { male: FROM_15, female: FROM_15 },
  'kappgang_10000m': { male: FROM_16, female: FROM_16 },

  // Hurdles
  '60mH': { male: ALL_AGES, female: ['rekrutt', '9', '10', '11', '12', '13', '14', '15'] },
  '80mH': { male: ['14'], female: ['15', '16'] },
  '100mH': { male: ['15', '16'], female: FROM_16 },
  '110mH': { male: FROM_17, female: [] },
  '200mH': { male: FROM_11, female: FROM_11 },
  '300mH': { male: FROM_14, female: FROM_14 },
  '400mH': { male: FROM_16, female: FROM_16 },

  // Jumps
  'hoyde': { male: ALL_AGES, female: ALL_AGES },
  'hoyde_uten': { male: ALL_AGES, female: ALL_AGES },
  'lengde': { male: ALL_AGES, female: ALL_AGES },
  'lengde_uten': { male: ALL_AGES, female: ALL_AGES },
  'stav': { male: ALL_AGES, female: ALL_AGES },
  'tresteg': { male: FROM_9, female: FROM_9 },

  // Throws
  'kule': { male: FROM_10, female: FROM_10 },
  'diskos': { male: FROM_10, female: FROM_10 },
  'slegge': { male: FROM_10, female: FROM_10 },
  'spyd': { male: FROM_10, female: FROM_10 },
  'liten_ball': { male: ALL_AGES, female: ALL_AGES },
  'slengball': { male: ALL_AGES, female: ALL_AGES },

  // Combined
  'mangekamp': { male: ALL_AGES, female: ALL_AGES },
  'trekamp': { male: ['rekrutt'], female: ['rekrutt'] },

  // Relays
  'stafett_40_600m': { male: ['rekrutt'], female: ['rekrutt'] },
  '4x60m': { male: ALL_AGES, female: ALL_AGES },
  '4x100m': { male: FROM_13, female: FROM_13 },
  '4x200m': { male: FROM_13, female: FROM_13 },
  '4x400m': { male: ALL_AGES, female: ALL_AGES },
  '3x600m': { male: ALL_AGES, female: ALL_AGES },
  '3x800m': { male: FROM_13, female: FROM_13 },
  '3x1000m': { male: FROM_11, female: FROM_11 },
  '3x1500m': { male: FROM_13, female: FROM_13 },
  'hurricane_1000m': { male: FROM_9, female: FROM_9 },
  'hurricane_2000m': { male: FROM_15, female: FROM_15 },
  'hurricane_3000m': { male: ['17', 'u20', 'u23', 'senior'], female: ['17', 'u20', 'u23', 'senior'] },
  '8x200m': { male: ['11', '13', '15', '16', '17', 'u20', 'u23', 'senior'], female: ['11', '13', '15', '16', '17', 'u20', 'u23', 'senior'] },
  'donaldstafett': { male: ['rekrutt', '9', '10', '11', '13', '15', '16', '17', 'u20', 'u23', 'senior'], female: ['rekrutt', '9', '10', '11', '13', '15', '16', '17', 'u20', 'u23', 'senior'] },
};

// Events available by venue type
// Indoor: Standard indoor track events (200m track)
export const INDOOR_EVENTS: string[] = [
  // Sprints (indoor distances)
  '60m', '200m', '400m',
  // Middle/Long Distance
  '600m', '800m', '1000m', '1500m', '1609m', '3000m',
  // Hurdles (only 60mH indoors)
  '60mH',
  // Jumps (all available indoors)
  'hoyde', 'hoyde_uten', 'stav', 'lengde', 'lengde_uten', 'tresteg',
  // Throws (only shot put indoors)
  'kule',
  // Combined events
  'mangekamp',
  // Relays
  '4x200m', '4x400m',
];

// Outdoor: All track and field events
export const OUTDOOR_EVENTS: string[] = [
  // All sprints
  '40m', '60m', '80m', '100m', '150m', '200m', '300m', '400m', '400m_strek',
  // All middle/long distance
  '600m', '800m', '1000m', '1500m', '1609m', '2000m', '3000m', '3218m', '5000m', '10000m',
  // All hurdles
  '60mH', '80mH', '100mH', '110mH', '200mH', '300mH', '400mH',
  // All steeplechase
  '200_400mH_20cm', '800mH_50cm', '1500mSC', '2000mSC', '3000mSC',
  // Race walk
  'kappgang_400_800m', 'kappgang_600_1000m', 'kappgang_1000m', 'kappgang_1500m',
  'kappgang_2000m', 'kappgang_3000m', 'kappgang_5000m', 'kappgang_10000m',
  // All jumps
  'hoyde', 'hoyde_uten', 'stav', 'lengde', 'lengde_uten', 'tresteg',
  // All throws
  'kule', 'diskos', 'slegge', 'spyd', 'liten_ball', 'slengball',
  // Combined events
  'mangekamp', 'trekamp',
  // All relays
  'stafett_40_600m', '4x60m', '4x100m', '4x200m', '4x400m',
  '3x600m', '3x800m', '3x1000m', '3x1500m',
  'hurricane_1000m', 'hurricane_2000m', 'hurricane_3000m',
  '8x200m', 'donaldstafett',
];

// Road: Off-track events (road races, cross-country, etc.)
export const ROAD_EVENTS: string[] = [
  // Road races use distance categories, not specific track events
  // These are handled separately via ROAD_RACE_DISTANCES
];

// Get events available for a specific venue type
export function getEventsForVenue(venueType: VenueType): string[] {
  switch (venueType) {
    case 'indoor':
      return INDOOR_EVENTS;
    case 'outdoor':
      return OUTDOOR_EVENTS;
    case 'road':
      return ROAD_EVENTS;
    default:
      return OUTDOOR_EVENTS;
  }
}

// Check if an event is available for a specific venue type
export function isEventAvailableForVenue(eventCode: string, venueType: VenueType): boolean {
  const venueEvents = getEventsForVenue(venueType);
  return venueEvents.includes(eventCode);
}

// Helper functions
export function isEventAvailable(eventCode: string, gender: Gender, ageClass: AgeClass): boolean {
  const availability = EVENT_AVAILABILITY[eventCode];
  if (!availability) return false;
  const ageClasses = gender === 'male' ? availability.male : availability.female;
  return ageClasses.includes(ageClass);
}

export function getAvailableEvents(gender: Gender, ageClass: AgeClass): EventDefinition[] {
  return EVENTS.filter(event => isEventAvailable(event.code, gender, ageClass));
}

export function getEquipmentSpec(
  eventCode: string,
  gender: Gender,
  ageClass: AgeClass
): EquipmentSpec | null {
  switch (eventCode) {
    case 'kule':
      const shotWeight = SHOT_PUT_WEIGHTS[gender][ageClass];
      return shotWeight ? { weight: shotWeight } : null;
    case 'diskos':
      const discusWeight = DISCUS_WEIGHTS[gender][ageClass];
      return discusWeight ? { weight: discusWeight } : null;
    case 'spyd':
      const javelinWeight = JAVELIN_WEIGHTS[gender][ageClass];
      return javelinWeight ? { weight: javelinWeight / 1000 } : null; // Convert g to kg
    case 'slegge':
      return HAMMER_SPECS[gender][ageClass] || null;
    default:
      if (eventCode.includes('H') || eventCode.includes('hekk')) {
        const heights = HURDLE_HEIGHTS[eventCode];
        if (heights) {
          const height = heights[gender][ageClass];
          return height ? { height } : null;
        }
      }
      return null;
  }
}

export function getAgeClassFromAge(age: number): AgeClass {
  if (age <= 8) return 'rekrutt';
  if (age <= 17) return age.toString() as AgeClass;
  if (age <= 19) return 'u20';
  if (age <= 22) return 'u23';
  return 'senior';
}

export function getEventByCode(code: string): EventDefinition | undefined {
  return EVENTS.find(e => e.code === code);
}

// Helper to get Norwegian gender label
export function getGenderLabel(gender: string): string {
  switch (gender) {
    case 'M': return 'Gutter/Menn';
    case 'W': return 'Jenter/Kvinner';
    case 'X': return 'Blandet';
    default: return gender;
  }
}

// Helper to get short Norwegian gender label
export function getGenderLabelShort(gender: string): string {
  switch (gender) {
    case 'M': return 'Gutter';
    case 'W': return 'Jenter';
    case 'X': return 'Blandet';
    default: return gender;
  }
}

// Road race distances (off-track)
export const ROAD_RACE_DISTANCES: Record<string, { male: AgeClass[]; female: AgeClass[] }> = {
  'up_to_500m': { male: ALL_AGES, female: ALL_AGES },
  'up_to_1km': { male: FROM_9, female: FROM_9 },
  'up_to_3km': { male: FROM_10, female: FROM_10 },
  'up_to_5km': { male: FROM_11, female: FROM_11 },
  'up_to_10km': { male: FROM_13, female: FROM_13 },
  'up_to_half_marathon': { male: FROM_15, female: FROM_15 },
  'marathon_plus': { male: FROM_U20, female: FROM_U20 },
};
