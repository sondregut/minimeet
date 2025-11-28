'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createEvent } from '@/lib/actions/events';
import { ATHLETICS_EVENTS } from '@/lib/constants/athletics-events';

const ALL_EVENTS = [
  ...ATHLETICS_EVENTS.track,
  ...ATHLETICS_EVENTS.field_vertical,
  ...ATHLETICS_EVENTS.field_horizontal,
  ...ATHLETICS_EVENTS.throw,
];

const AGE_GROUPS = [
  'Senior',
  'U23',
  'U20',
  'U18',
  'U16',
  'U14',
  'U12',
  'Masters 35+',
  'Masters 40+',
  'Masters 45+',
  'Masters 50+',
  'Masters 55+',
  'Masters 60+',
  'Masters 65+',
  'Masters 70+',
];

export default function NewEventPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventCode, setSelectedEventCode] = useState('');

  const selectedEvent = ALL_EVENTS.find(e => e.code === selectedEventCode);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const eventCode = formData.get('eventCode') as string;
    const event = ALL_EVENTS.find(e => e.code === eventCode);

    if (!event) {
      setError('Please select an event');
      setLoading(false);
      return;
    }

    const result = await createEvent({
      competition_id: competitionId,
      event_code: eventCode,
      name: event.name,
      event_type: event.type as 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'relay',
      gender: formData.get('gender') as 'M' | 'W' | 'X',
      age_group: formData.get('ageGroup') as string,
      round: formData.get('round') as 'final' | 'semi' | 'heat' | 'qualification',
      scheduled_time: formData.get('scheduledTime') as string || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/competitions/${competitionId}`);
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competition
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Event</h1>
        <p className="text-gray-600 mt-1">
          Add a new event to this competition
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Event Selection */}
          <div>
            <label htmlFor="eventCode" className="block text-sm font-medium text-gray-700 mb-2">
              Event <span className="text-red-500">*</span>
            </label>
            <select
              id="eventCode"
              name="eventCode"
              required
              value={selectedEventCode}
              onChange={(e) => setSelectedEventCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select an event</option>
              <optgroup label="Track">
                {ATHLETICS_EVENTS.track.map((event) => (
                  <option key={event.code} value={event.code}>
                    {event.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Vertical Jumps">
                {ATHLETICS_EVENTS.field_vertical.map((event) => (
                  <option key={event.code} value={event.code}>
                    {event.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Horizontal Jumps">
                {ATHLETICS_EVENTS.field_horizontal.map((event) => (
                  <option key={event.code} value={event.code}>
                    {event.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Throws">
                {ATHLETICS_EVENTS.throw.map((event) => (
                  <option key={event.code} value={event.code}>
                    {event.name}
                  </option>
                ))}
              </optgroup>
            </select>
            {selectedEvent && (
              <p className="text-xs text-gray-500 mt-1">
                Type: {selectedEvent.type.replace('_', ' ')}
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select gender</option>
              <option value="M">Men</option>
              <option value="W">Women</option>
              <option value="X">Mixed</option>
            </select>
          </div>

          {/* Age Group */}
          <div>
            <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700 mb-2">
              Age Group <span className="text-red-500">*</span>
            </label>
            <select
              id="ageGroup"
              name="ageGroup"
              required
              defaultValue="Senior"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {AGE_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          {/* Round */}
          <div>
            <label htmlFor="round" className="block text-sm font-medium text-gray-700 mb-2">
              Round
            </label>
            <select
              id="round"
              name="round"
              defaultValue="final"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="final">Final</option>
              <option value="semi">Semi-Final</option>
              <option value="heat">Heat</option>
              <option value="qualification">Qualification</option>
            </select>
          </div>

          {/* Scheduled Time */}
          <div>
            <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Time
            </label>
            <input
              id="scheduledTime"
              name="scheduledTime"
              type="time"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Set the scheduled start time for this event
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/dashboard/competitions/${competitionId}`}
            className="px-5 py-3 text-gray-700 font-medium hover:text-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
