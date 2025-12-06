'use client';

import { useState } from 'react';
import { Trophy, Users } from 'lucide-react';

export type FinalRoundChoice = 'final8' | 'allContinue';

interface FinalRoundPromptProps {
  totalAthletes: number;
  onChoice: (choice: FinalRoundChoice) => void;
  loading?: boolean;
}

export function FinalRoundPrompt({
  totalAthletes,
  onChoice,
  loading = false,
}: FinalRoundPromptProps) {
  const [selectedChoice, setSelectedChoice] = useState<FinalRoundChoice | null>(null);

  const handleConfirm = () => {
    if (selectedChoice) {
      onChoice(selectedChoice);
    }
  };

  const canDoFinal8 = totalAthletes >= 8;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 text-center">
          <h2 className="text-xl font-bold">Runde 3 fullført!</h2>
          <p className="text-blue-100 mt-1">
            Velg format for resterende forsøk
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* Final 8 option */}
          <button
            onClick={() => setSelectedChoice('final8')}
            disabled={!canDoFinal8 || loading}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              !canDoFinal8
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : selectedChoice === 'final8'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  Finale (beste 8)
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Rekkefølge: 8-7-6-5-4-3-2-1
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  De 8 beste fortsetter med 3 ekstra forsøk
                </div>
                {!canDoFinal8 && (
                  <div className="text-xs text-red-500 mt-2">
                    Krever minst 8 utøvere ({totalAthletes} påmeldt)
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* All continue option */}
          <button
            onClick={() => setSelectedChoice('allContinue')}
            disabled={loading}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selectedChoice === 'allContinue'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  Alle fortsetter
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  4+ forsøk til alle utøvere
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Passer for mindre stevner eller ungdomsklasser
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleConfirm}
            disabled={!selectedChoice || loading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
              !selectedChoice || loading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {loading ? 'Lagrer...' : 'Bekreft valg'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Info badge shown after choice is made
interface FinalRoundBadgeProps {
  choice: FinalRoundChoice;
  athletesInFinal?: number;
}

export function FinalRoundBadge({ choice, athletesInFinal }: FinalRoundBadgeProps) {
  if (choice === 'final8') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
        <Trophy className="w-4 h-4" />
        <span>Finale ({athletesInFinal || 8} utøvere)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
      <Users className="w-4 h-4" />
      <span>Alle fortsetter</span>
    </div>
  );
}
