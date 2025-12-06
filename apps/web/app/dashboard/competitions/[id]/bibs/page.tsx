'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Wand2, User, Hash } from 'lucide-react';
import { getCompetition } from '@/lib/actions/competitions';
import {
  getAthletesWithBibs,
  bulkAssignBibs,
  autoAssignBibs,
  type BibAssignment,
} from '@/lib/actions/entries';

interface AthleteWithBib {
  athlete_id: string;
  first_name: string;
  last_name: string;
  club_name: string | null;
  nationality: string;
  bib_number: string | null;
  entry_ids: string[];
}

export default function BibAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [competition, setCompetition] = useState<{ name: string } | null>(null);
  const [athletes, setAthletes] = useState<AthleteWithBib[]>([]);
  const [bibNumbers, setBibNumbers] = useState<Record<string, string>>({});
  const [startingNumber, setStartingNumber] = useState('1');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [competitionData, athletesData] = await Promise.all([
          getCompetition(competitionId),
          getAthletesWithBibs(competitionId),
        ]);

        setCompetition(competitionData);
        setAthletes(athletesData);

        // Initialize bib numbers from existing data
        const initialBibs: Record<string, string> = {};
        athletesData.forEach((athlete) => {
          initialBibs[athlete.athlete_id] = athlete.bib_number || '';
        });
        setBibNumbers(initialBibs);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load competition data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [competitionId]);

  function updateBib(athleteId: string, value: string) {
    setBibNumbers((prev) => ({
      ...prev,
      [athleteId]: value,
    }));
    setHasUnsavedChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Build assignments from changed bib numbers
      const assignments: BibAssignment[] = [];
      for (const athlete of athletes) {
        const newBib = bibNumbers[athlete.athlete_id];
        if (newBib !== (athlete.bib_number || '')) {
          assignments.push({
            athlete_id: athlete.athlete_id,
            bib_number: newBib,
          });
        }
      }

      if (assignments.length === 0) {
        setError('Ingen endringer å lagre');
        setSaving(false);
        return;
      }

      const result = await bulkAssignBibs(competitionId, assignments);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Startnumre lagret!');
        setHasUnsavedChanges(false);
        // Update local state to reflect saved values
        setAthletes((prev) =>
          prev.map((a) => ({
            ...a,
            bib_number: bibNumbers[a.athlete_id] || null,
          }))
        );
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error saving bibs:', err);
      setError('Kunne ikke lagre startnumre');
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoAssign() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const start = parseInt(startingNumber, 10) || 1;
      const result = await autoAssignBibs(competitionId, start);

      if (result.error) {
        setError(result.error);
      } else {
        // Reload data to get new bib numbers
        const athletesData = await getAthletesWithBibs(competitionId);
        setAthletes(athletesData);

        const newBibs: Record<string, string> = {};
        athletesData.forEach((athlete) => {
          newBibs[athlete.athlete_id] = athlete.bib_number || '';
        });
        setBibNumbers(newBibs);

        setHasUnsavedChanges(false);
        setSuccess(`${athletesData.length} startnumre tildelt og lagret automatisk!`);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err) {
      console.error('Error auto-assigning bibs:', err);
      setError('Kunne ikke tildele startnumre automatisk');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til {competition?.name || 'stevnet'}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tildel startnumre</h1>
            <p className="text-gray-600 mt-1">
              {athletes.length} utøver{athletes.length !== 1 ? 'e' : ''} påmeldt
            </p>
          </div>

          {hasUnsavedChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Lagrer...' : 'Lagre endringer'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm">
          {success}
        </div>
      )}

      {/* Auto-assign section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-700">Automatisk tildeling</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Start fra:</label>
            <input
              type="number"
              min="1"
              value={startingNumber}
              onChange={(e) => setStartingNumber(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              onClick={handleAutoAssign}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Tildeler...' : 'Tildel alle'}
            </button>
          </div>
          <span className="text-xs text-gray-500">
            Tildeler fortløpende numre sortert på etternavn (lagres automatisk)
          </span>
        </div>
      </div>

      {/* Athletes Table */}
      {athletes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen utøvere påmeldt</h3>
          <p className="text-gray-500 mb-4">
            Legg til utøvere i øvelser før du tildeler startnumre.
          </p>
          <Link
            href={`/dashboard/competitions/${competitionId}`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Se øvelser
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-32">
                  Startnr
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                  Utøver
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">
                  Klubb
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 w-24">
                  Øvelser
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {athletes.map((athlete) => (
                <tr key={athlete.athlete_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={bibNumbers[athlete.athlete_id] || ''}
                      onChange={(e) => updateBib(athlete.athlete_id, e.target.value)}
                      placeholder="—"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono font-semibold"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {athlete.last_name}, {athlete.first_name}
                        </p>
                        <p className="text-xs text-gray-500">{athlete.nationality}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {athlete.club_name || '—'}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {athlete.entry_ids.length} øvelse{athlete.entry_ids.length !== 1 ? 'r' : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>
          <strong>Tips:</strong> Hver utøver har ett startnummer på tvers av alle øvelser i stevnet.
        </p>
        <p>
          Manuelle endringer må lagres med knappen som vises øverst. Automatisk tildeling lagres umiddelbart.
        </p>
      </div>
    </div>
  );
}
