// ============================================================================
// MiniMeet Type Definitions
// ============================================================================

// ----------------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------------

export type OrganizationType = 'club' | 'federation' | 'school' | 'other';

export type OrganizationRole = 'admin' | 'official' | 'volunteer';

export type CompetitionStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived';

export type EventType = 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'combined' | 'relay' | 'road';

export type EventRound = 'final' | 'semi' | 'heat' | 'qualification';

export type Gender = 'M' | 'W' | 'X';

export type EntryStatus = 'registered' | 'confirmed' | 'checked_in' | 'DNS' | 'scratched';

export type TrackResultStatus = 'finished' | 'DNS' | 'DNF' | 'DQ' | 'FS';

export type VerticalStatus = 'active' | 'eliminated' | 'retired' | 'NH';

export type FieldStatus = 'active' | 'complete' | 'retired' | 'NM' | 'ND';

export type VerticalAttemptOutcome = 'o' | 'x' | '-' | 'r';

export type QualificationMark = 'Q' | 'q' | 'qR' | 'qJ';

export type EventStatus = 'scheduled' | 'checkin' | 'in_progress' | 'completed' | 'cancelled';

// ----------------------------------------------------------------------------
// User & Profile
// ----------------------------------------------------------------------------

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Organization
// ----------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  logo_url: string | null;
  country: string;
  city: string | null;
  contact_email: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  // Joined data
  profile?: Profile;
  organization?: Organization;
}

// ----------------------------------------------------------------------------
// Competition
// ----------------------------------------------------------------------------

export interface CompetitionSettings {
  allow_online_registration: boolean;
  registration_deadline?: string;
  entry_fee?: number;
  currency: 'NOK' | 'EUR' | 'USD';
  age_groups: string[];
  default_attempts: number;
  top_n_to_final: number;
}

export interface Competition {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  date: string;
  end_date: string | null;
  location: string;
  venue: string | null;
  status: CompetitionStatus;
  settings: CompetitionSettings;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  organization?: Organization;
  events?: Event[];
}

// ----------------------------------------------------------------------------
// Event
// ----------------------------------------------------------------------------

export interface TrackEventSettings {
  heat_count?: number;
  lanes_per_heat?: number;
  advance_rule?: string; // e.g., 'Q3+4q'
}

export interface VerticalEventSettings {
  starting_height?: number;
  height_increment?: number;
  progression?: number[];
}

export interface FieldEventSettings {
  attempts_preliminary?: number;
  attempts_final?: number;
  top_n_to_final?: number;
  wind_gauge_required?: boolean;
}

export type EventSettings = TrackEventSettings | VerticalEventSettings | FieldEventSettings;

export interface Event {
  id: string;
  competition_id: string;
  name: string;
  event_code: string;
  event_type: EventType;
  gender: Gender;
  age_group: string;
  round: EventRound;
  scheduled_time: string | null;
  status: EventStatus;
  wind_reading: number | null;
  settings: EventSettings;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined data
  competition?: Competition;
  entries?: Entry[];
}

// ----------------------------------------------------------------------------
// Athlete
// ----------------------------------------------------------------------------

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  strava?: string;
  website?: string;
}

export interface PersonalBestCache {
  [eventCode: string]: {
    value: string;
    date?: string;
  };
}

export interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: Gender;
  nationality: string;
  club_id: string | null;
  club_name: string | null;
  license_number: string | null;
  wa_athlete_id: string | null;
  profile_image_url: string | null;
  social_links: SocialLinks;
  personal_bests: PersonalBestCache;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  full_name?: string;
  // Joined data
  organization?: Organization;
}

// ----------------------------------------------------------------------------
// Entry
// ----------------------------------------------------------------------------

export interface Entry {
  id: string;
  competition_id: string;
  event_id: string;
  athlete_id: string;
  bib_number: string | null;
  seed_mark: string | null;
  seed_mark_value: number | null;
  heat_number: number | null;
  lane_or_position: number | null;
  status: EntryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  athlete?: Athlete;
  event?: Event;
}

// ----------------------------------------------------------------------------
// Track Results
// ----------------------------------------------------------------------------

export interface TrackResult {
  id: string;
  entry_id: string;
  time_ms: number | null;
  time_display: string | null;
  place: number | null;
  reaction_time_ms: number | null;
  wind: number | null;
  status: TrackResultStatus;
  dq_rule: string | null;
  qualification_mark: QualificationMark | null;
  splits: number[] | null;
  is_pb: boolean;
  is_sb: boolean;
  record_type: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  entry?: Entry;
}

// ----------------------------------------------------------------------------
// Vertical Jump Results (High Jump, Pole Vault)
// ----------------------------------------------------------------------------

export interface VerticalResult {
  id: string;
  entry_id: string;
  best_height: number | null;
  total_attempts: number;
  total_misses: number;
  misses_at_best: number;
  status: VerticalStatus;
  place: number | null;
  is_pb: boolean;
  is_sb: boolean;
  record_type: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  entry?: Entry;
  attempts?: VerticalAttempt[];
}

export interface VerticalAttempt {
  id: string;
  result_id: string;
  height: number;
  attempt_number: 1 | 2 | 3;
  outcome: VerticalAttemptOutcome;
  standards_position: number | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Field Results (Horizontal Jumps & Throws)
// ----------------------------------------------------------------------------

export interface FieldResult {
  id: string;
  entry_id: string;
  best_mark: number | null;
  best_mark_wind: number | null;
  best_legal_mark: number | null;
  attempts_taken: number;
  status: FieldStatus;
  place: number | null;
  is_pb: boolean;
  is_sb: boolean;
  record_type: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  entry?: Entry;
  attempts?: FieldAttempt[];
}

export interface FieldAttempt {
  id: string;
  result_id: string;
  attempt_number: 1 | 2 | 3 | 4 | 5 | 6;
  distance: number | null;
  wind: number | null;
  is_foul: boolean;
  is_pass: boolean;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Personal Best
// ----------------------------------------------------------------------------

export interface PersonalBest {
  id: string;
  athlete_id: string;
  event_code: string;
  result_value: number;
  result_display: string;
  is_indoor: boolean;
  wind: number | null;
  competition_name: string | null;
  competition_date: string | null;
  location: string | null;
  set_at: string;
}

// ----------------------------------------------------------------------------
// Event Code Constants
// ----------------------------------------------------------------------------

export const EVENT_CODES = {
  // Track
  '60m': { name: '60m', type: 'track' },
  '100m': { name: '100m', type: 'track' },
  '200m': { name: '200m', type: 'track' },
  '400m': { name: '400m', type: 'track' },
  '800m': { name: '800m', type: 'track' },
  '1500m': { name: '1500m', type: 'track' },
  '3000m': { name: '3000m', type: 'track' },
  '5000m': { name: '5000m', type: 'track' },
  '10000m': { name: '10000m', type: 'track' },
  // Hurdles
  '60mH': { name: '60m Hurdles', type: 'track' },
  '100mH': { name: '100m Hurdles', type: 'track' },
  '110mH': { name: '110m Hurdles', type: 'track' },
  '400mH': { name: '400m Hurdles', type: 'track' },
  // Steeplechase
  '2000mSC': { name: '2000m Steeplechase', type: 'track' },
  '3000mSC': { name: '3000m Steeplechase', type: 'track' },
  // Relays
  '4x100m': { name: '4x100m Relay', type: 'relay' },
  '4x400m': { name: '4x400m Relay', type: 'relay' },
  // Vertical
  HJ: { name: 'High Jump', type: 'field_vertical' },
  PV: { name: 'Pole Vault', type: 'field_vertical' },
  // Horizontal
  LJ: { name: 'Long Jump', type: 'field_horizontal' },
  TJ: { name: 'Triple Jump', type: 'field_horizontal' },
  // Throws
  SP: { name: 'Shot Put', type: 'throw' },
  DT: { name: 'Discus Throw', type: 'throw' },
  JT: { name: 'Javelin Throw', type: 'throw' },
  HT: { name: 'Hammer Throw', type: 'throw' },
  // Combined
  DEC: { name: 'Decathlon', type: 'combined' },
  HEP: { name: 'Heptathlon', type: 'combined' },
  PEN: { name: 'Pentathlon', type: 'combined' },
} as const;

export type EventCode = keyof typeof EVENT_CODES;

// ----------------------------------------------------------------------------
// API Response Types
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ----------------------------------------------------------------------------
// Form Types
// ----------------------------------------------------------------------------

export interface CreateCompetitionInput {
  organization_id: string;
  name: string;
  description?: string;
  date: string;
  end_date?: string;
  location: string;
  venue?: string;
  settings?: Partial<CompetitionSettings>;
}

export interface CreateEventInput {
  competition_id: string;
  name: string;
  event_code: string;
  event_type: EventType;
  gender: Gender;
  age_group?: string;
  round?: EventRound;
  scheduled_time?: string;
  settings?: EventSettings;
}

export interface CreateAthleteInput {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender: Gender;
  nationality?: string;
  club_id?: string;
  club_name?: string;
  license_number?: string;
}

export interface CreateEntryInput {
  competition_id: string;
  event_id: string;
  athlete_id: string;
  bib_number?: string;
  seed_mark?: string;
  seed_mark_value?: number;
}
