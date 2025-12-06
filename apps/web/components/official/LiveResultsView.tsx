'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Medal, Trophy } from 'lucide-react';

export interface LiveResult {
  athleteId: string;
  bibNumber?: string;
  firstName: string;
  lastName: string;
  club?: string;
  place: number | null;
  bestResult: number | null;
  status: 'active' | 'finished' | 'dns' | 'dnf';
  // For vertical events
  clearedHeight?: number;
  attempts?: number;
}

type FilterType = 'all' | 'active';

interface LiveResultsViewProps {
  results: LiveResult[];
  eventType: 'horizontal' | 'vertical';
  loading?: boolean;
}

export function LiveResultsView({
  results,
  eventType,
  loading = false,
}: LiveResultsViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredResults = results.filter(r => {
    if (filter === 'active') {
      return r.status === 'active';
    }
    return true;
  });

  // Sort by place
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (a.place === null && b.place === null) return 0;
    if (a.place === null) return 1;
    if (b.place === null) return -1;
    return a.place - b.place;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header with filter */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">Live resultater</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === 'active'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Pågående
          </button>
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Alle
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : sortedResults.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Ingen resultater ennå
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-sm text-gray-600">
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Utøver</th>
                <th className="px-4 py-3 font-medium text-right">
                  {eventType === 'vertical' ? 'Høyde' : 'Resultat'}
                </th>
                <th className="px-4 py-3 font-medium w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedResults.map((result) => (
                <ResultRow
                  key={result.athleteId}
                  result={result}
                  eventType={eventType}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

interface ResultRowProps {
  result: LiveResult;
  eventType: 'horizontal' | 'vertical';
}

function ResultRow({ result, eventType }: ResultRowProps) {
  const getMedalColor = (place: number | null) => {
    switch (place) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-300';
    }
  };

  const getStatusBadge = (status: LiveResult['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Aktiv
          </span>
        );
      case 'finished':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Ferdig
          </span>
        );
      case 'dns':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
            DNS
          </span>
        );
      case 'dnf':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
            DNF
          </span>
        );
    }
  };

  const formatResult = () => {
    if (eventType === 'vertical' && result.clearedHeight) {
      return (
        <div>
          <span className="font-mono font-bold">
            {(result.clearedHeight / 100).toFixed(2)}
          </span>
          {result.attempts && (
            <span className="text-xs text-gray-500 ml-1">
              ({result.attempts} fors.)
            </span>
          )}
        </div>
      );
    }

    if (result.bestResult) {
      return (
        <span className="font-mono font-bold">
          {(result.bestResult / 100).toFixed(2)}
        </span>
      );
    }

    return <span className="text-gray-400">-</span>;
  };

  return (
    <tr className={clsx(
      'hover:bg-gray-50 transition-colors',
      result.status !== 'active' && 'opacity-60'
    )}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {result.place && result.place <= 3 ? (
            <Medal className={clsx('w-5 h-5', getMedalColor(result.place))} />
          ) : (
            <span className="text-gray-500 font-medium w-5 text-center">
              {result.place || '-'}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {result.bibNumber && (
            <span className="text-xs font-mono bg-gray-100 rounded px-1">
              {result.bibNumber}
            </span>
          )}
          <div>
            <div className="font-medium">
              {result.firstName} {result.lastName}
            </div>
            {result.club && (
              <div className="text-xs text-gray-500">{result.club}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {formatResult()}
      </td>
      <td className="px-4 py-3">
        {getStatusBadge(result.status)}
      </td>
    </tr>
  );
}
