// Common athletics events
export const ATHLETICS_EVENTS = {
  track: [
    { code: '60m', name: '60m', type: 'track' },
    { code: '100m', name: '100m', type: 'track' },
    { code: '200m', name: '200m', type: 'track' },
    { code: '400m', name: '400m', type: 'track' },
    { code: '800m', name: '800m', type: 'track' },
    { code: '1500m', name: '1500m', type: 'track' },
    { code: '3000m', name: '3000m', type: 'track' },
    { code: '5000m', name: '5000m', type: 'track' },
    { code: '10000m', name: '10000m', type: 'track' },
    { code: '60mH', name: '60m Hurdles', type: 'track' },
    { code: '100mH', name: '100m Hurdles', type: 'track' },
    { code: '110mH', name: '110m Hurdles', type: 'track' },
    { code: '400mH', name: '400m Hurdles', type: 'track' },
    { code: '3000mSC', name: '3000m Steeplechase', type: 'track' },
    { code: '4x100m', name: '4x100m Relay', type: 'relay' },
    { code: '4x400m', name: '4x400m Relay', type: 'relay' },
  ],
  field_vertical: [
    { code: 'HJ', name: 'High Jump', type: 'field_vertical' },
    { code: 'PV', name: 'Pole Vault', type: 'field_vertical' },
  ],
  field_horizontal: [
    { code: 'LJ', name: 'Long Jump', type: 'field_horizontal' },
    { code: 'TJ', name: 'Triple Jump', type: 'field_horizontal' },
  ],
  throw: [
    { code: 'SP', name: 'Shot Put', type: 'throw' },
    { code: 'DT', name: 'Discus Throw', type: 'throw' },
    { code: 'HT', name: 'Hammer Throw', type: 'throw' },
    { code: 'JT', name: 'Javelin Throw', type: 'throw' },
  ],
};

export type AthleticsEvent = {
  code: string;
  name: string;
  type: string;
};
