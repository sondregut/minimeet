// EasyMeet Workflow Phases
// Based on the 5-phase competition management workflow

export type WorkflowPhase = 1 | 2 | 3 | 4 | 5;

export interface PhaseInfo {
  phase: WorkflowPhase;
  name: string;
  nameNo: string;
  description: string;
  descriptionNo: string;
  icon: string;
}

export interface PhaseMenuItem {
  name: string;
  nameNo: string;
  href: string; // Relative to /dashboard/competitions/[id]
  phase: WorkflowPhase;
  description?: string;
}

// The 5 workflow phases
export const WORKFLOW_PHASES: PhaseInfo[] = [
  {
    phase: 1,
    name: 'Setup',
    nameNo: 'Oppsett',
    description: 'Configure competition details, age classes, and events',
    descriptionNo: 'Sett opp stevnedetaljer, aldersklasser og øvelser',
    icon: '⚙️',
  },
  {
    phase: 2,
    name: 'Planning',
    nameNo: 'Planlegging',
    description: 'Manage registrations, create schedule, set up heats',
    descriptionNo: 'Håndter påmeldinger, lag tidsskjema, sett opp heat',
    icon: '📋',
  },
  {
    phase: 3,
    name: 'Pre-Competition',
    nameNo: 'Før stevnet',
    description: 'Check-in athletes, finalize startlists, print materials',
    descriptionNo: 'Avkrysning, ferdigstill startlister, skriv ut materiell',
    icon: '✅',
  },
  {
    phase: 4,
    name: 'Live Competition',
    nameNo: 'Under stevnet',
    description: 'Record results, manage events, publish live updates',
    descriptionNo: 'Registrer resultater, styr øvelser, publiser live oppdateringer',
    icon: '🏃',
  },
  {
    phase: 5,
    name: 'Post-Competition',
    nameNo: 'Etter stevnet',
    description: 'Verify results, generate reports, export to statistics',
    descriptionNo: 'Kontroller resultater, generer rapporter, eksporter til statistikk',
    icon: '📊',
  },
];

// Menu items organized by phase
export const PHASE_MENU_ITEMS: PhaseMenuItem[] = [
  // Phase 1: Setup
  {
    name: 'Competition Details',
    nameNo: 'Stevnedetaljer',
    href: '',
    phase: 1,
    description: 'Basic info, dates, venue',
  },
  {
    name: 'Events',
    nameNo: 'Øvelser',
    href: '/events/quick-add',
    phase: 1,
    description: 'Add and configure events',
  },
  {
    name: 'Records',
    nameNo: 'Rekorder',
    href: '/records',
    phase: 1,
    description: 'Record definitions',
  },
  {
    name: 'Registration Settings',
    nameNo: 'Påmeldingsinnstillinger',
    href: '/registration',
    phase: 1,
    description: 'Configure registration',
  },

  // Phase 2: Planning
  {
    name: 'Entries',
    nameNo: 'Påmeldinger',
    href: '/entries',
    phase: 2,
    description: 'View and manage entries',
  },
  {
    name: 'Import Entries',
    nameNo: 'Importer påmeldinger',
    href: '/entries/import',
    phase: 2,
    description: 'Import from file',
  },
  {
    name: 'Bib Numbers',
    nameNo: 'Startnummer',
    href: '/bibs',
    phase: 2,
    description: 'Assign bib numbers',
  },
  {
    name: 'Schedule',
    nameNo: 'Tidsskjema',
    href: '/reports/schedule',
    phase: 2,
    description: 'Competition schedule',
  },

  // Phase 3: Pre-Competition
  {
    name: 'Call Room',
    nameNo: 'Avkrysning',
    href: '/callroom',
    phase: 3,
    description: 'Athlete check-in',
  },
  {
    name: 'Startlists',
    nameNo: 'Startlister',
    href: '/reports/startlist',
    phase: 3,
    description: 'Print startlists',
  },

  // Phase 4: Live Competition
  {
    name: 'Control Center',
    nameNo: 'Kontrollsenter',
    href: '/control',
    phase: 4,
    description: 'Live event management',
  },

  // Phase 5: Post-Competition
  {
    name: 'Results Report',
    nameNo: 'Resultatrapport',
    href: '/reports/results',
    phase: 5,
    description: 'Full results',
  },
  {
    name: 'All Reports',
    nameNo: 'Alle rapporter',
    href: '/reports',
    phase: 5,
    description: 'Generate reports',
  },
];

// Helper functions
export function getPhaseInfo(phase: WorkflowPhase): PhaseInfo {
  return WORKFLOW_PHASES.find(p => p.phase === phase)!;
}

export function getMenuItemsForPhase(phase: WorkflowPhase): PhaseMenuItem[] {
  return PHASE_MENU_ITEMS.filter(item => item.phase === phase);
}

export function getCurrentPhase(competition: {
  status?: string;
  start_date?: string;
  end_date?: string;
}): WorkflowPhase {
  const now = new Date();
  const startDate = competition.start_date ? new Date(competition.start_date) : null;
  const endDate = competition.end_date ? new Date(competition.end_date) : null;

  // If competition has ended
  if (endDate && now > endDate) {
    return 5;
  }

  // If competition is ongoing
  if (startDate && endDate && now >= startDate && now <= endDate) {
    return 4;
  }

  // If competition starts within 24 hours
  if (startDate) {
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilStart <= 24 && hoursUntilStart > 0) {
      return 3;
    }
  }

  // If we have registrations, we're in planning phase
  // Otherwise we're in setup phase
  // This would need to check actual registration data
  return 1;
}

// Speaker view menu items (read-only access)
export const SPEAKER_MENU_ITEMS: { name: string; nameNo: string; href: string }[] = [
  { name: 'Live Results', nameNo: 'Live resultater', href: '/results' },
  { name: 'Schedule', nameNo: 'Tidsskjema', href: '/reports/schedule' },
  { name: 'Startlists', nameNo: 'Startlister', href: '/reports/startlist' },
];
