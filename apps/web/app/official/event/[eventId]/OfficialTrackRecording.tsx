'use client';

import { useState } from 'react';
import { Timer, Check, AlertCircle } from 'lucide-react';

interface Entry {
  id: string;
  bib_number: string;
  lane?: number;
  heat?: number;
  athletes: {
    first_name: string;
    last_name: string;
    club: string;
  }[];
}

interface Props {
  event: {
    id: string;
    name: string;
    status: string;
  };
  entries: Entry[];
}

export default function OfficialTrackRecording({ event, entries }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [time, setTime] = useState('');

  const handleRecordTime = () => {
    if (!selectedEntry || !time) return;
    // TODO: Implement time recording
    console.log('Recording time:', { entry: selectedEntry, time });
    setTime('');
    setSelectedEntry(null);
  };

  // Group entries by heat
  const entriesByHeat = entries.reduce((acc, entry) => {
    const heat = entry.heat || 1;
    if (!acc[heat]) acc[heat] = [];
    acc[heat].push(entry);
    return acc;
  }, {} as Record<number, Entry[]>);

  const heats = Object.keys(entriesByHeat).map(Number).sort((a, b) => a - b);

  return (
    <div className="p-4">
      {/* Time input */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h2 className="font-medium text-slate-900 mb-3">Registrer tid</h2>
        {selectedEntry ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-500">
              Valgt: {entries.find(e => e.id === selectedEntry)?.athletes[0]?.first_name} {entries.find(e => e.id === selectedEntry)?.athletes[0]?.last_name}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="F.eks. 12.34 eller DNS/DNF/DQ"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <button
                onClick={handleRecordTime}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
              >
                Lagre
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTime('DNS')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                DNS
              </button>
              <button
                onClick={() => setTime('DNF')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                DNF
              </button>
              <button
                onClick={() => setTime('DQ')}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              >
                DQ
              </button>
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors ml-auto"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <AlertCircle className="w-4 h-4" />
            Velg en deltaker fra listen under for a registrere tid
          </div>
        )}
      </div>

      {/* Heats */}
      {heats.length > 1 ? (
        heats.map((heat) => (
          <div key={heat} className="bg-white rounded-xl border border-slate-200 mb-4">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-medium text-slate-900">Heat {heat}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {entriesByHeat[heat]
                .sort((a, b) => (a.lane || 0) - (b.lane || 0))
                .map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry === entry.id}
                    onSelect={() => setSelectedEntry(entry.id)}
                  />
                ))}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">Deltakere</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {entries
              .sort((a, b) => (a.lane || 0) - (b.lane || 0))
              .map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedEntry === entry.id}
                  onSelect={() => setSelectedEntry(entry.id)}
                />
              ))}
          </div>
          {entries.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Ingen deltakere pameldt denne ovelsen
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  isSelected,
  onSelect,
}: {
  entry: Entry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 text-left transition-colors ${
        isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {entry.lane && (
          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm">
            {entry.lane}
          </div>
        )}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          isSelected
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {entry.bib_number}
        </div>
        <div className="flex-1">
          <div className="font-medium text-slate-900">
            {entry.athletes[0]?.first_name} {entry.athletes[0]?.last_name}
          </div>
          <div className="text-sm text-slate-500">{entry.athletes[0]?.club}</div>
        </div>
      </div>
    </button>
  );
}
