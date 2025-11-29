// Event status types and display info (non-server action)

// All valid event statuses
export type EventStatus = 'draft' | 'scheduled' | 'checkin' | 'in_progress' | 'official' | 'completed' | 'cancelled';

// Status display info
export const EVENT_STATUS_INFO: Record<EventStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  checkin: { label: 'Check-in', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  in_progress: { label: 'In Progress', color: 'text-red-700', bgColor: 'bg-red-100' },
  official: { label: 'Official', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-200' },
};

// Valid status transitions
export const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['draft', 'checkin', 'in_progress', 'cancelled'],
  checkin: ['scheduled', 'in_progress', 'cancelled'],
  in_progress: ['checkin', 'official', 'completed'],
  official: ['in_progress', 'completed'],
  completed: ['official', 'in_progress'],
  cancelled: ['draft', 'scheduled'],
};

// Event action interfaces (moved from server actions file)
export interface EventResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export interface CreateEventInput {
  competition_id: string;
  event_code: string;
  name: string;
  event_type: 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'combined' | 'relay' | 'road';
  gender: 'M' | 'W' | 'X';
  age_group?: string;
  round?: 'final' | 'semi' | 'heat' | 'qualification';
  scheduled_time?: string;
}

export interface BulkCreateEventInput {
  competition_id: string;
  events: {
    event_code: string;
    name: string;
    event_type: 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'combined' | 'relay' | 'road';
    gender: 'M' | 'W' | 'X';
    age_group: string;
    round?: 'final' | 'semi' | 'heat' | 'qualification';
    settings?: Record<string, unknown>;
  }[];
}
