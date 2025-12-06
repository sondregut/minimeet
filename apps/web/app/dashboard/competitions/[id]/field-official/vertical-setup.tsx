'use client';

import { useState } from 'react';
import { ArrowRight, Check, Loader2, Settings } from 'lucide-react';
import { updateVerticalSettings, type VerticalSettings } from '@/lib/actions/events';

// Pure utility function to generate heights (not a server action)
function generateHeights(startHeight: number, increment: number, count: number = 20): number[] {
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    heights.push(startHeight + i * increment);
  }
  return heights;
}

interface VerticalSetupProps {
  eventId: string;
  eventName: string;
  competitionId: string;
  existingSettings?: VerticalSettings;
  onComplete: (settings: VerticalSettings) => void;
}

// Common presets for different events
const PRESETS = {
  high_jump: {
    label: 'Høyde',
    startHeights: [100, 110, 120, 130, 140, 150],
    increments: [3, 5],
  },
  pole_vault: {
    label: 'Stav',
    startHeights: [200, 220, 240, 260, 280, 300, 320],
    increments: [10, 15, 20],
  },
};

export default function VerticalSetup({
  eventId,
  eventName,
  competitionId,
  existingSettings,
  onComplete,
}: VerticalSetupProps) {
  const isHighJump = eventName.toLowerCase().includes('høyde');
  const preset = isHighJump ? PRESETS.high_jump : PRESETS.pole_vault;

  const [startHeight, setStartHeight] = useState(
    existingSettings?.start_height || (isHighJump ? 120 : 260)
  );
  const [increment, setIncrement] = useState(
    existingSettings?.increment || (isHighJump ? 5 : 15)
  );
  const [customStart, setCustomStart] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate preview heights
  const previewHeights = generateHeights(startHeight, increment, 10);

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const settings: VerticalSettings = {
      start_height: startHeight,
      increment,
      heights: generateHeights(startHeight, increment, 30),
      current_height_index: 0,
    };

    const result = await updateVerticalSettings(eventId, competitionId, settings);

    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onComplete(settings);
    }
  }

  function formatHeight(cm: number): string {
    return (cm / 100).toFixed(2);
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center mb-6">
        <Settings className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Sett opp høyder</h2>
        <p className="text-sm text-gray-600 mt-1">{eventName}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Start height */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Starthøyde
        </label>
        <div className="flex flex-wrap gap-2">
          {preset.startHeights.map((h) => (
            <button
              key={h}
              onClick={() => setStartHeight(h)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                startHeight === h
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {formatHeight(h)} m
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) {
                setStartHeight(Math.round(val * 100));
              }
            }}
            placeholder="Egen høyde (m)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Increment */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Heving mellom høyder
        </label>
        <div className="flex flex-wrap gap-2">
          {preset.increments.map((inc) => (
            <button
              key={inc}
              onClick={() => setIncrement(inc)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                increment === inc
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {inc} cm
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Forhåndsvisning av høyder
        </label>
        <div className="flex flex-wrap gap-2">
          {previewHeights.map((h, i) => (
            <span
              key={i}
              className={`px-2 py-1 rounded text-xs font-mono ${
                i === 0 ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-white text-gray-600'
              }`}
            >
              {formatHeight(h)}
            </span>
          ))}
          <span className="text-gray-400">...</span>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Lagrer...
          </>
        ) : (
          <>
            <Check className="w-5 h-5" />
            Start øvelse
          </>
        )}
      </button>
    </div>
  );
}
