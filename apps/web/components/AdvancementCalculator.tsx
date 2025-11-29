'use client';

import { useState } from 'react';
import { Calculator, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateAdvancement, getAdvancementSummary } from '@/lib/actions/heats';

interface AdvancementCalculatorProps {
  eventId: string;
  competitionId: string;
  currentRule?: { by_place: number; by_time: number } | null;
}

export default function AdvancementCalculator({
  eventId,
  competitionId,
  currentRule,
}: AdvancementCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState<{
    qualifiedByPlace: number;
    qualifiedByTime: number;
    totalAdvancing: number;
    totalFinished: number;
  } | null>(null);

  // Form state
  const [advanceByPlace, setAdvanceByPlace] = useState(currentRule?.by_place ?? 3);
  const [advanceByTime, setAdvanceByTime] = useState(currentRule?.by_time ?? 2);

  const handleCalculate = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await calculateAdvancement(eventId, competitionId, advanceByPlace, advanceByTime);

      if (result.error) {
        setStatus('error');
        setMessage(result.error);
      } else {
        // Get updated summary
        const summaryResult = await getAdvancementSummary(eventId);
        setSummary(summaryResult);
        setStatus('success');
        setMessage(`${summaryResult.totalAdvancing} athletes advance (${summaryResult.qualifiedByPlace}Q + ${summaryResult.qualifiedByTime}q)`);

        // Reset success status after 5 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 5000);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to calculate advancement');
    } finally {
      setIsLoading(false);
    }
  };

  // Common advancement patterns
  const presets = [
    { label: '3Q + 2q', byPlace: 3, byTime: 2, desc: 'Top 3 + 2 fastest' },
    { label: '2Q + 2q', byPlace: 2, byTime: 2, desc: 'Top 2 + 2 fastest' },
    { label: '4Q', byPlace: 4, byTime: 0, desc: 'Top 4 only' },
    { label: '2Q + 4q', byPlace: 2, byTime: 4, desc: 'Top 2 + 4 fastest' },
    { label: '1Q + 6q', byPlace: 1, byTime: 6, desc: 'Winner + 6 fastest' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Advancement Calculator</h3>
            <p className="text-sm text-gray-500">
              {currentRule
                ? `Current: ${currentRule.by_place}Q + ${currentRule.by_time}q`
                : 'Calculate Q/q qualifiers'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setAdvanceByPlace(preset.byPlace);
                    setAdvanceByTime(preset.byTime);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    advanceByPlace === preset.byPlace && advanceByTime === preset.byTime
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                  title={preset.desc}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advance by Place (Q)
              </label>
              <p className="text-xs text-gray-500 mb-2">Top N from each heat</p>
              <input
                type="number"
                min="0"
                max="10"
                value={advanceByPlace}
                onChange={(e) => setAdvanceByPlace(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advance by Time (q)
              </label>
              <p className="text-xs text-gray-500 mb-2">Next fastest across all heats</p>
              <input
                type="number"
                min="0"
                max="20"
                value={advanceByTime}
                onChange={(e) => setAdvanceByTime(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-700 font-bold text-xs">Q</span>
              <span className="text-gray-600">Qualified by place</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 font-bold text-xs">q</span>
              <span className="text-gray-600">Qualified by time</span>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.qualifiedByPlace}</p>
                  <p className="text-xs text-gray-500">Q</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{summary.qualifiedByTime}</p>
                  <p className="text-xs text-gray-500">q</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{summary.totalAdvancing}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600">{summary.totalFinished}</p>
                  <p className="text-xs text-gray-500">Finished</p>
                </div>
              </div>
            </div>
          )}

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              status === 'success'
                ? 'bg-green-600 text-white'
                : status === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <Calculator className="w-4 h-4 animate-pulse" />
                Calculating...
              </>
            ) : status === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                {message}
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                {message}
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Calculate Advancement
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
