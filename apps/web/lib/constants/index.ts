// Central export for all constants

export * from './norwegian-athletics';
export * from './workflow-phases';
export * from './event-status';
export * from './timing-systems';

// Re-export legacy athletics events for backwards compatibility
export { ATHLETICS_EVENTS } from './athletics-events';

// Convenience re-exports
export { getGenderLabel, getGenderLabelShort } from './norwegian-athletics';
