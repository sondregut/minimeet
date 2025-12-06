// Central export for all constants - shared between web and mobile apps

// Norwegian Athletics rules and events
export * from './norwegian-athletics';

// Workflow phases
export * from './workflow-phases';

// Event status types
export * from './event-status';

// Timing systems
export * from './timing-systems';

// Result codes
export * from './result-codes';

// Legacy athletics events (for backwards compatibility)
export { ATHLETICS_EVENTS } from './athletics-events';

// Convenience re-exports
export { getGenderLabel, getGenderLabelShort } from './norwegian-athletics';
