'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecordBreak, markRecordBreakOfficial, markRecordBreakAnnounced } from '@/lib/actions/records';
import { Trophy, CheckCircle, Megaphone, Calendar, User, ArrowRight } from 'lucide-react';

interface RecordBreaksListProps {
  competitionId: string;
  recordBreaks: RecordBreak[];
}

const recordTypeLabels: Record<string, { label: string; color: string; bg: string }> = {
  PB: { label: 'Personal Best', color: 'text-green-700', bg: 'bg-green-100' },
  SB: { label: 'Season Best', color: 'text-blue-700', bg: 'bg-blue-100' },
  MR: { label: 'Meeting Record', color: 'text-purple-700', bg: 'bg-purple-100' },
  CR: { label: 'Championship Record', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  CLR: { label: 'Club Record', color: 'text-orange-700', bg: 'bg-orange-100' },
  NR: { label: 'National Record', color: 'text-red-700', bg: 'bg-red-100' },
  AR: { label: 'Area Record', color: 'text-pink-700', bg: 'bg-pink-100' },
  WR: { label: 'World Record', color: 'text-amber-700', bg: 'bg-amber-100' },
};

export function RecordBreaksList({ competitionId, recordBreaks }: RecordBreaksListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleMarkOfficial = async (id: string, isOfficial: boolean) => {
    setLoading(id);
    await markRecordBreakOfficial(id, isOfficial);
    router.refresh();
    setLoading(null);
  };

  const handleMarkAnnounced = async (id: string) => {
    setLoading(id);
    await markRecordBreakAnnounced(id);
    router.refresh();
    setLoading(null);
  };

  if (recordBreaks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Broken Yet</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Records will appear here when athletes achieve new personal bests, season bests,
          or break any other tracked records during the competition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Records Broken at This Competition</h3>
          <p className="text-sm text-gray-500 mt-1">
            {recordBreaks.length} record{recordBreaks.length !== 1 ? 's' : ''} broken so far
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {recordBreaks.map((record) => {
            const typeInfo = recordTypeLabels[record.record_type] || {
              label: record.record_type,
              color: 'text-gray-700',
              bg: 'bg-gray-100',
            };

            return (
              <div key={record.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Record Type Badge */}
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${typeInfo.bg} ${typeInfo.color}`}
                      >
                        <Trophy className="w-4 h-4" />
                        {typeInfo.label}
                      </span>
                      {record.is_official && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Official
                        </span>
                      )}
                      {record.is_announced && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <Megaphone className="w-3 h-3" />
                          Announced
                        </span>
                      )}
                    </div>

                    {/* Athlete and Mark */}
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{record.athlete_name}</span>
                    </div>

                    {/* New Record */}
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          {record.new_mark_display}
                        </span>
                        {record.wind !== null && record.wind !== undefined && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({record.wind > 0 ? '+' : ''}{record.wind} m/s)
                          </span>
                        )}
                      </div>

                      {/* Previous Record */}
                      {record.previous_mark_display && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <ArrowRight className="w-4 h-4" />
                          <div className="text-sm">
                            <span className="line-through">{record.previous_mark_display}</span>
                            {record.previous_holder_name && (
                              <span className="ml-1">({record.previous_holder_name})</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(record.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleMarkOfficial(record.id, !record.is_official)}
                      disabled={loading === record.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        record.is_official
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {record.is_official ? 'Official' : 'Mark Official'}
                    </button>
                    {!record.is_announced && (
                      <button
                        onClick={() => handleMarkAnnounced(record.id)}
                        disabled={loading === record.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                      >
                        <Megaphone className="w-4 h-4" />
                        Announce
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
