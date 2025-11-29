'use client';

import { useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { recalculateAll } from '@/lib/actions/results';

interface RecalculateButtonProps {
  eventId: string;
  competitionId: string;
  eventType: string;
  eventCode: string;
}

export default function RecalculateButton({
  eventId,
  competitionId,
  eventType,
  eventCode,
}: RecalculateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRecalculate = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await recalculateAll(eventId, competitionId, eventType, eventCode);

      if (result.error) {
        setStatus('error');
        setMessage(result.error);
      } else {
        setStatus('success');
        setMessage('Places and records updated');
        // Reset success status after 3 seconds
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 3000);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to recalculate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRecalculate}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          status === 'success'
            ? 'bg-green-100 text-green-700 border border-green-200'
            : status === 'error'
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Recalculating...
          </>
        ) : status === 'success' ? (
          <>
            <Check className="w-4 h-4" />
            Updated
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4" />
            Error
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Recalculate All
          </>
        )}
      </button>
      {message && status === 'error' && (
        <span className="text-xs text-red-600">{message}</span>
      )}
    </div>
  );
}
