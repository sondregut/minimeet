'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Search, User } from 'lucide-react';
import { createEntry } from '@/lib/actions/entries';
import { getAthletes } from '@/lib/actions/athletes';

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  club_name: string | null;
  nationality: string;
  gender: string;
}

export default function NewEntryPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  useEffect(() => {
    async function loadAthletes() {
      const data = await getAthletes();
      setAthletes(data);
    }
    loadAthletes();
  }, []);

  const filteredAthletes = athletes.filter((athlete) => {
    const fullName = `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) ||
           (athlete.club_name?.toLowerCase().includes(query) ?? false);
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedAthlete) {
      setError('Please select an athlete');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const seedMark = formData.get('seedMark') as string;

    // Parse seed mark to numeric value (for sorting)
    let seedMarkValue: number | undefined;
    if (seedMark) {
      // Try to parse as time (MM:SS.ss or SS.ss) or distance
      if (seedMark.includes(':')) {
        // Time format MM:SS.ss
        const parts = seedMark.split(':');
        const minutes = parseFloat(parts[0]);
        const seconds = parseFloat(parts[1]);
        seedMarkValue = minutes * 60 + seconds;
      } else {
        // Just a number (seconds or meters)
        seedMarkValue = parseFloat(seedMark);
      }
    }

    const result = await createEntry({
      competition_id: competitionId,
      event_id: eventId,
      athlete_id: selectedAthlete.id,
      bib_number: (formData.get('bibNumber') as string) || undefined,
      seed_mark: seedMark || undefined,
      seed_mark_value: seedMarkValue,
      lane_or_position: formData.get('lane') ? parseInt(formData.get('lane') as string) : undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/competitions/${competitionId}/events/${eventId}`);
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/competitions/${competitionId}/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Entry</h1>
        <p className="text-gray-600 mt-1">
          Register an athlete for this event
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Athlete Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Athlete <span className="text-red-500">*</span>
            </label>

            {selectedAthlete ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedAthlete.first_name} {selectedAthlete.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedAthlete.club_name || 'No club'} · {selectedAthlete.nationality}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAthlete(null)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search athletes by name or club..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {filteredAthletes.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {athletes.length === 0 ? (
                        <p>No athletes in database. <Link href="/dashboard/athletes/new" className="text-blue-600 hover:underline">Add one first</Link>.</p>
                      ) : (
                        <p>No athletes match your search</p>
                      )}
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {filteredAthletes.slice(0, 10).map((athlete) => (
                        <li key={athlete.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAthlete(athlete);
                              setSearchQuery('');
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {athlete.first_name} {athlete.last_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {athlete.club_name || 'No club'} · {athlete.nationality}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                      {filteredAthletes.length > 10 && (
                        <li className="px-4 py-2 text-sm text-gray-500 text-center">
                          +{filteredAthletes.length - 10} more results
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bib Number */}
          <div>
            <label htmlFor="bibNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Bib Number
            </label>
            <input
              id="bibNumber"
              name="bibNumber"
              type="text"
              placeholder="e.g., 123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Seed Mark */}
          <div>
            <label htmlFor="seedMark" className="block text-sm font-medium text-gray-700 mb-2">
              Seed Mark / Entry Standard
            </label>
            <input
              id="seedMark"
              name="seedMark"
              type="text"
              placeholder="e.g., 10.85 or 1:52.34 or 7.52"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              For track: time (10.85 or 1:52.34). For field: distance/height in meters (7.52)
            </p>
          </div>

          {/* Lane / Position */}
          <div>
            <label htmlFor="lane" className="block text-sm font-medium text-gray-700 mb-2">
              Lane / Position
            </label>
            <input
              id="lane"
              name="lane"
              type="number"
              min="1"
              max="12"
              placeholder="e.g., 4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lane for track events, flight position for field events
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/dashboard/competitions/${competitionId}/events/${eventId}`}
            className="px-5 py-3 text-gray-700 font-medium hover:text-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !selectedAthlete}
            className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
