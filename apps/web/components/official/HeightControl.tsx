'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, Settings, Check, X } from 'lucide-react';

interface HeightControlProps {
  currentHeight: number; // in cm
  nextHeight: number; // in cm
  onRaiseHeight: () => void;
  onSetHeight: (height: number) => void;
  increment: number; // in cm (e.g., 3 for high jump, 5 for pole vault)
  loading?: boolean;
  eventType: 'highJump' | 'poleVault';
}

export function HeightControl({
  currentHeight,
  nextHeight,
  onRaiseHeight,
  onSetHeight,
  increment,
  loading = false,
  eventType,
}: HeightControlProps) {
  const [showSettings, setShowSettings] = useState(false);

  const formatHeight = (cm: number) => {
    return (cm / 100).toFixed(2);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-lg">
      <div className="flex items-center justify-between">
        {/* Current height display */}
        <div className="flex-1">
          <div className="text-xs text-blue-200 uppercase tracking-wide">
            Nåværende høyde
          </div>
          <div className="text-3xl font-bold font-mono">
            {formatHeight(currentHeight)} m
          </div>
        </div>

        {/* Next height preview */}
        <div className="text-center px-4">
          <div className="text-xs text-blue-200">Neste</div>
          <div className="text-lg font-mono text-blue-100">
            {formatHeight(nextHeight)} m
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 transition-colors"
            title="Innstillinger"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={onRaiseHeight}
            disabled={loading}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all',
              'active:scale-95',
              loading
                ? 'bg-blue-500/30 cursor-not-allowed'
                : 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
            )}
          >
            <ChevronUp className="w-5 h-5" />
            <span>Hev høyde</span>
          </button>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <HeightSettingsModal
          currentHeight={currentHeight}
          increment={increment}
          eventType={eventType}
          onSetHeight={(height) => {
            onSetHeight(height);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// Compact version for smaller screens
interface CompactHeightControlProps {
  currentHeight: number;
  onRaiseHeight: () => void;
  loading?: boolean;
}

export function CompactHeightControl({
  currentHeight,
  onRaiseHeight,
  loading = false,
}: CompactHeightControlProps) {
  const formatHeight = (cm: number) => (cm / 100).toFixed(2);

  return (
    <div className="flex items-center justify-between bg-blue-600 text-white rounded-lg px-3 py-2">
      <div className="font-mono font-bold text-lg">
        {formatHeight(currentHeight)} m
      </div>
      <button
        onClick={onRaiseHeight}
        disabled={loading}
        className={clsx(
          'flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all',
          loading
            ? 'bg-blue-500/30 cursor-not-allowed'
            : 'bg-white text-blue-700 hover:bg-blue-50'
        )}
      >
        <ChevronUp className="w-4 h-4" />
        Hev
      </button>
    </div>
  );
}

// Settings modal for adjusting height
interface HeightSettingsModalProps {
  currentHeight: number;
  increment: number;
  eventType: 'highJump' | 'poleVault';
  onSetHeight: (height: number) => void;
  onClose: () => void;
}

function HeightSettingsModal({
  currentHeight,
  increment,
  eventType,
  onSetHeight,
  onClose,
}: HeightSettingsModalProps) {
  const [inputValue, setInputValue] = useState(
    (currentHeight / 100).toFixed(2)
  );
  const [customIncrement, setCustomIncrement] = useState(increment);

  // Common heights for quick selection
  const quickHeights = eventType === 'highJump'
    ? [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]
    : [200, 250, 300, 350, 400, 450, 500, 550];

  const handleSubmit = () => {
    const height = Math.round(parseFloat(inputValue) * 100);
    if (!isNaN(height) && height > 0) {
      onSetHeight(height);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden text-gray-900">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h3 className="font-semibold">Høydeinnstillinger</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-500/30 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Manual input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sett høyde manuelt
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-center font-mono text-lg"
                placeholder="1.50"
              />
              <span className="flex items-center text-gray-500">m</span>
            </div>
          </div>

          {/* Quick selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hurtigvalg
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickHeights.map((height) => (
                <button
                  key={height}
                  onClick={() => setInputValue((height / 100).toFixed(2))}
                  className={clsx(
                    'py-2 rounded-lg text-sm font-mono transition-colors',
                    height === Math.round(parseFloat(inputValue) * 100)
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {(height / 100).toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Increment setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Høydeøkning
            </label>
            <div className="flex gap-2">
              {[3, 5, 10].map((inc) => (
                <button
                  key={inc}
                  onClick={() => setCustomIncrement(inc)}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                    customIncrement === inc
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  +{inc} cm
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Bekreft
          </button>
        </div>
      </div>
    </div>
  );
}

// Start height prompt shown at beginning of event
interface StartHeightPromptProps {
  eventType: 'highJump' | 'poleVault';
  suggestedHeight?: number;
  onSetHeight: (height: number) => void;
}

export function StartHeightPrompt({
  eventType,
  suggestedHeight,
  onSetHeight,
}: StartHeightPromptProps) {
  const [inputValue, setInputValue] = useState(
    suggestedHeight ? (suggestedHeight / 100).toFixed(2) : ''
  );

  const defaultHeights = eventType === 'highJump'
    ? [
        { label: 'Gutter 12-13', height: 110 },
        { label: 'Jenter 12-13', height: 105 },
        { label: 'Gutter 14-15', height: 130 },
        { label: 'Jenter 14-15', height: 120 },
        { label: 'Junior herrer', height: 160 },
        { label: 'Junior kvinner', height: 145 },
        { label: 'Senior herrer', height: 190 },
        { label: 'Senior kvinner', height: 165 },
      ]
    : [
        { label: 'Junior herrer', height: 300 },
        { label: 'Junior kvinner', height: 250 },
        { label: 'Senior herrer', height: 450 },
        { label: 'Senior kvinner', height: 350 },
      ];

  const handleConfirm = () => {
    const height = Math.round(parseFloat(inputValue) * 100);
    if (!isNaN(height) && height > 0) {
      onSetHeight(height);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 text-center">
          <h2 className="text-xl font-bold">
            {eventType === 'highJump' ? 'Høydehopp' : 'Stavsprang'}
          </h2>
          <p className="text-blue-100 mt-1">Angi starthøyde for øvelsen</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Manual input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starthøyde
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 px-4 py-3 border-2 rounded-xl text-center font-mono text-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="0.00"
                autoFocus
              />
              <span className="flex items-center text-xl text-gray-500">m</span>
            </div>
          </div>

          {/* Suggested heights by class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forslag etter klasse
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {defaultHeights.map(({ label, height }) => (
                <button
                  key={label}
                  onClick={() => setInputValue((height / 100).toFixed(2))}
                  className={clsx(
                    'p-2 rounded-lg text-sm text-left transition-colors',
                    height === Math.round(parseFloat(inputValue) * 100)
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  )}
                >
                  <div className="font-medium">{label}</div>
                  <div className="font-mono text-gray-500">
                    {(height / 100).toFixed(2)} m
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleConfirm}
            disabled={!inputValue || parseFloat(inputValue) <= 0}
            className={clsx(
              'w-full py-4 rounded-xl font-bold text-lg transition-colors',
              !inputValue || parseFloat(inputValue) <= 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            )}
          >
            Start øvelsen
          </button>
        </div>
      </div>
    </div>
  );
}
