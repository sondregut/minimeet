// Norwegian Standard Event Templates for Athletics Competitions

export type EventType = 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'relay';

export interface EventTemplate {
  name: string;
  event_code: string;
  event_type: EventType;
  category: 'sprint' | 'middle' | 'long' | 'hurdles' | 'jumps' | 'throws' | 'relay';
  defaultSettings?: Record<string, unknown>;
}

// Norwegian Standard Events (Friidrett.no)
export const EVENT_TEMPLATES: EventTemplate[] = [
  // Sprints
  { name: '60m', event_code: '60m', event_type: 'track', category: 'sprint' },
  { name: '100m', event_code: '100m', event_type: 'track', category: 'sprint' },
  { name: '200m', event_code: '200m', event_type: 'track', category: 'sprint' },
  { name: '400m', event_code: '400m', event_type: 'track', category: 'sprint' },

  // Middle Distance
  { name: '800m', event_code: '800m', event_type: 'track', category: 'middle' },
  { name: '1500m', event_code: '1500m', event_type: 'track', category: 'middle' },
  { name: '3000m', event_code: '3000m', event_type: 'track', category: 'middle' },

  // Long Distance
  { name: '5000m', event_code: '5000m', event_type: 'track', category: 'long' },
  { name: '10000m', event_code: '10000m', event_type: 'track', category: 'long' },

  // Hurdles
  { name: '60m Hurdles', event_code: '60mH', event_type: 'track', category: 'hurdles' },
  { name: '100m Hurdles', event_code: '100mH', event_type: 'track', category: 'hurdles' },
  { name: '110m Hurdles', event_code: '110mH', event_type: 'track', category: 'hurdles' },
  { name: '300m Hurdles', event_code: '300mH', event_type: 'track', category: 'hurdles' },
  { name: '400m Hurdles', event_code: '400mH', event_type: 'track', category: 'hurdles' },

  // Vertical Jumps
  {
    name: 'High Jump',
    event_code: 'HJ',
    event_type: 'field_vertical',
    category: 'jumps',
    defaultSettings: { starting_height: 1.20, height_increment: 0.05 }
  },
  {
    name: 'Pole Vault',
    event_code: 'PV',
    event_type: 'field_vertical',
    category: 'jumps',
    defaultSettings: { starting_height: 2.00, height_increment: 0.10 }
  },

  // Horizontal Jumps
  { name: 'Long Jump', event_code: 'LJ', event_type: 'field_horizontal', category: 'jumps' },
  { name: 'Triple Jump', event_code: 'TJ', event_type: 'field_horizontal', category: 'jumps' },

  // Throws
  { name: 'Shot Put', event_code: 'SP', event_type: 'throw', category: 'throws' },
  { name: 'Discus', event_code: 'DT', event_type: 'throw', category: 'throws' },
  { name: 'Javelin', event_code: 'JT', event_type: 'throw', category: 'throws' },
  { name: 'Hammer', event_code: 'HT', event_type: 'throw', category: 'throws' },

  // Relays
  { name: '4x60m stafett', event_code: '4x60m', event_type: 'relay', category: 'relay' },
  { name: '4x100m stafett', event_code: '4x100m', event_type: 'relay', category: 'relay' },
  { name: '4x200m stafett', event_code: '4x200m', event_type: 'relay', category: 'relay' },
  { name: '4x400m stafett', event_code: '4x400m', event_type: 'relay', category: 'relay' },
  { name: '3x600m stafett', event_code: '3x600m', event_type: 'relay', category: 'relay' },
  { name: '3x800m stafett', event_code: '3x800m', event_type: 'relay', category: 'relay' },
  { name: '3x1000m stafett', event_code: '3x1000m', event_type: 'relay', category: 'relay' },
  { name: '3x1500m stafett', event_code: '3x1500m', event_type: 'relay', category: 'relay' },
  { name: 'Hurricane-stafett 1000m', event_code: 'hurricane_1000m', event_type: 'relay', category: 'relay' },
  { name: 'Hurricane-stafett 2000m', event_code: 'hurricane_2000m', event_type: 'relay', category: 'relay' },
  { name: 'Hurricane-stafett 3000m', event_code: 'hurricane_3000m', event_type: 'relay', category: 'relay' },
  { name: '8x200m stafett', event_code: '8x200m', event_type: 'relay', category: 'relay' },
  { name: 'Donaldstafett', event_code: 'donaldstafett', event_type: 'relay', category: 'relay' },
];

// Quick access by category
export const EVENTS_BY_CATEGORY = {
  sprint: EVENT_TEMPLATES.filter(e => e.category === 'sprint'),
  middle: EVENT_TEMPLATES.filter(e => e.category === 'middle'),
  long: EVENT_TEMPLATES.filter(e => e.category === 'long'),
  hurdles: EVENT_TEMPLATES.filter(e => e.category === 'hurdles'),
  jumps: EVENT_TEMPLATES.filter(e => e.category === 'jumps'),
  throws: EVENT_TEMPLATES.filter(e => e.category === 'throws'),
  relay: EVENT_TEMPLATES.filter(e => e.category === 'relay'),
};

// Most common events (shown first in quick add)
export const COMMON_EVENTS = [
  '100m', '200m', '400m', '800m', '1500m',
  '100mH', '110mH', '400mH',
  'HJ', 'LJ', 'TJ', 'PV',
  'SP', 'DT', 'JT',
];

// Age groups - Norwegian Athletics Federation standard (Norges Friidrettsforbund)
export const AGE_GROUPS = [
  'Rekrutt 6-8',
  '9 år',
  '10 år',
  '11 år',
  '12 år',
  '13 år',
  '14 år',
  '15 år',
  '16 år',
  '17 år',
  'Junior 18-19',
  'Junior 20-22',
  'Senior',
];

// Gender options
export const GENDERS = [
  { value: 'M', label: 'Gutter/Menn' },
  { value: 'W', label: 'Jenter/Kvinner' },
  { value: 'X', label: 'Blandet' },
];

// Helper to generate event name with gender and age
export function generateEventName(
  template: EventTemplate,
  gender: 'M' | 'W' | 'X',
  ageGroup: string
): string {
  const genderLabel = gender === 'M' ? 'Men' : gender === 'W' ? 'Women' : 'Mixed';
  return `${template.name} ${genderLabel} ${ageGroup}`;
}

// Helper to find template by event code
export function getTemplateByCode(eventCode: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find(t => t.event_code === eventCode);
}
