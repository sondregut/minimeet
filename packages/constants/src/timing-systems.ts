// Timing systems supported by the application
// Each system may have different export formats for start lists

export type TimingSystemId =
  | 'manual'
  | 'alge'
  | 'finishlynx'
  | 'seiko'
  | 'swisstiming'
  | 'macfinish'
  | 'raceresults'
  | 'racetec';

export interface TimingSystem {
  id: TimingSystemId;
  name: string;
  description: string;
  // Future: API configuration, export formats, etc.
  exportFormats?: string[];
  supportsPhotoFinish?: boolean;
  supportsChipTiming?: boolean;
}

export const TIMING_SYSTEMS: TimingSystem[] = [
  {
    id: 'manual',
    name: 'Manuell tidtaking',
    description: 'Håndholdte stoppeklokker og manuell registrering',
    supportsPhotoFinish: false,
    supportsChipTiming: false,
  },
  {
    id: 'alge',
    name: 'Alge-Timing',
    description: 'Alge-Timing profesjonelt tidtakersystem',
    supportsPhotoFinish: true,
    supportsChipTiming: false,
    exportFormats: ['ALG', 'CSV'],
  },
  {
    id: 'finishlynx',
    name: 'FinishLynx',
    description: 'Lynx System Developers fotofinish-system',
    supportsPhotoFinish: true,
    supportsChipTiming: false,
    exportFormats: ['LIF', 'CSV', 'EVT'],
  },
  {
    id: 'seiko',
    name: 'Seiko',
    description: 'Seiko tidtakersystem',
    supportsPhotoFinish: true,
    supportsChipTiming: false,
  },
  {
    id: 'swisstiming',
    name: 'Swiss Timing',
    description: 'Swiss Timing / Omega profesjonelt system',
    supportsPhotoFinish: true,
    supportsChipTiming: true,
    exportFormats: ['STM', 'XML'],
  },
  {
    id: 'macfinish',
    name: 'MacFinish',
    description: 'MacFinish fotofinish-system',
    supportsPhotoFinish: true,
    supportsChipTiming: false,
  },
  {
    id: 'raceresults',
    name: 'RaceResult',
    description: 'RaceResult aktiv transponder-system',
    supportsPhotoFinish: false,
    supportsChipTiming: true,
    exportFormats: ['CSV', 'XML'],
  },
  {
    id: 'racetec',
    name: 'RaceTec',
    description: 'RaceTec tidtaker- og resultatsystem',
    supportsPhotoFinish: true,
    supportsChipTiming: true,
  },
];

// Helper function to get timing system by ID
export function getTimingSystem(id: TimingSystemId): TimingSystem | undefined {
  return TIMING_SYSTEMS.find(system => system.id === id);
}

// Helper function to get timing system name
export function getTimingSystemName(id: TimingSystemId): string {
  return getTimingSystem(id)?.name || id;
}
