'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Play, CheckCircle, RotateCcw } from 'lucide-react';
import { updateEventStatus } from '@/lib/actions/events';

interface EventStatusControlsProps {
  eventId: string;
  competitionId: string;
  currentStatus: string;
}

export default function EventStatusControls({
  eventId,
  competitionId,
  currentStatus,
}: EventStatusControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(newStatus: 'scheduled' | 'checkin' | 'in_progress' | 'completed') {
    setLoading(true);
    setError(null);

    try {
      const result = await updateEventStatus(eventId, newStatus, competitionId);

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}

      {currentStatus === 'scheduled' && (
        <button
          onClick={() => handleStatusChange('checkin')}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
        >
          <Users className="w-4 h-4" />
          {loading ? 'Updating...' : 'Start Check-in'}
        </button>
      )}

      {currentStatus === 'checkin' && (
        <>
          <button
            onClick={() => handleStatusChange('scheduled')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => handleStatusChange('in_progress')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Updating...' : 'Start Event'}
          </button>
        </>
      )}

      {currentStatus === 'in_progress' && (
        <>
          <button
            onClick={() => handleStatusChange('checkin')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => handleStatusChange('completed')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {loading ? 'Updating...' : 'Complete Event'}
          </button>
        </>
      )}

      {currentStatus === 'completed' && (
        <button
          onClick={() => handleStatusChange('in_progress')}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          {loading ? 'Updating...' : 'Reopen Event'}
        </button>
      )}
    </div>
  );
}
