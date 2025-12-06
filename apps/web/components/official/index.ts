// Official result registration components
// New UX for field event result registration

// Navigation
export { SwipeableViews, TabIndicator } from './SwipeableViews';

// Athlete display
export { AthleteCard } from './AthleteCard';
export type { AthleteData, AthleteCardSize, EventType } from './AthleteCard';

// Queue management
export { ActiveQueue, OrderIndicator } from './ActiveQueue';

// Input components
export { ResultInput, WindInput } from './ResultInput';
export {
  HorizontalAttemptButtons,
  VerticalAttemptButtons,
  CompactAttemptButton,
} from './AttemptButtons';

// Startlist / Roll call
export { StartlistView } from './StartlistView';
export type { StartlistAthlete, RollCallStatus } from './StartlistView';

// Horizontal events (throws, horizontal jumps)
export { HorizontalRegistrationView } from './HorizontalRegistrationView';
export type { HorizontalSaveResult } from './HorizontalRegistrationView';

// Final round (Top 8)
export { FinalRoundPrompt, FinalRoundBadge } from './FinalRoundPrompt';
export type { FinalRoundChoice } from './FinalRoundPrompt';

// Vertical events (high jump, pole vault)
export { VerticalRegistrationView, VerticalSummary } from './VerticalRegistrationView';
export type { VerticalSaveResult, VerticalAthleteData } from './VerticalRegistrationView';

// Height control for vertical events
export {
  HeightControl,
  CompactHeightControl,
  StartHeightPrompt,
} from './HeightControl';

// Vertical attempt grid
export {
  VerticalAttemptGrid,
  InlineAttemptDisplay,
  AthleteHeightHistory,
} from './VerticalAttemptGrid';

// Live results
export { LiveResultsView } from './LiveResultsView';
export type { LiveResult } from './LiveResultsView';
