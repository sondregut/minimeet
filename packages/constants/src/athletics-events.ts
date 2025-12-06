// Re-export from Norwegian Athletics rules
// This file provides backwards compatibility with existing code

import {
  EVENTS,
  EventDefinition,
  getEventByCode,
  getAvailableEvents,
  isEventAvailable,
  getEquipmentSpec,
  AGE_CLASSES,
  SHOT_PUT_WEIGHTS,
  DISCUS_WEIGHTS,
  JAVELIN_WEIGHTS,
  HAMMER_SPECS,
  HURDLE_HEIGHTS,
} from './norwegian-athletics';

export type { EventDefinition as AthleticsEvent };

// Legacy format for backwards compatibility
export const ATHLETICS_EVENTS = {
  track: EVENTS.filter(e =>
    e.type === 'sprint' ||
    e.type === 'middle_distance' ||
    e.type === 'long_distance'
  ).map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'track',
  })),

  hurdles: EVENTS.filter(e =>
    e.type === 'hurdles' ||
    e.type === 'steeplechase'
  ).map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'hurdles',
  })),

  field_vertical: EVENTS.filter(e =>
    e.type === 'high_jump' ||
    e.type === 'pole_vault'
  ).map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'field_vertical',
  })),

  field_horizontal: EVENTS.filter(e =>
    e.type === 'long_jump' ||
    e.type === 'triple_jump'
  ).map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'field_horizontal',
  })),

  throw: EVENTS.filter(e =>
    e.type === 'shot_put' ||
    e.type === 'discus' ||
    e.type === 'hammer' ||
    e.type === 'javelin' ||
    e.type === 'ball_throw'
  ).map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'throw',
  })),

  relay: EVENTS.filter(e => e.type === 'relay').map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'relay',
  })),

  race_walk: EVENTS.filter(e => e.type === 'race_walk').map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'race_walk',
  })),

  combined: EVENTS.filter(e => e.type === 'combined').map(e => ({
    code: e.code,
    name: e.nameEn,
    type: 'combined',
  })),
};

// Re-export everything from norwegian-athletics
export {
  EVENTS,
  getEventByCode,
  getAvailableEvents,
  isEventAvailable,
  getEquipmentSpec,
  AGE_CLASSES,
  SHOT_PUT_WEIGHTS,
  DISCUS_WEIGHTS,
  JAVELIN_WEIGHTS,
  HAMMER_SPECS,
  HURDLE_HEIGHTS,
};
