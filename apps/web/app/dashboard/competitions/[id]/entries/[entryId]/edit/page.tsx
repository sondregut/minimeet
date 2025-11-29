'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, User } from 'lucide-react';
import { getEntry, updateEntry, deleteEntry } from '@/lib/actions/entries';

type Entry = {
  id: string;
  competition_id: string;
  event_id: string;
  bib_number: string | null;
  seed_mark: string | null;
  seed_mark_value: number | null;
  status: string;
  heat_number: number | null;
  lane_or_position: number | null;
  notes: string | null;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
    nationality: string;
    gender: string;
  } | null;
};

const STATUS_OPTIONS = [
  { value: 'registered', label: 'Registered' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'DNS', label: 'DNS (Did Not Start)' },
  { value: 'scratched', label: 'Scratched' },
];

export default function EditEntryPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;
  const entryId = params.entryId as string;

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [bibNumber, setBibNumber] = useState('');
  const [seedMark, setSeedMark] = useState('');
  const [status, setStatus] = useState('registered');
  const [heatNumber, setHeatNumber] = useState('');
  const [lanePosition, setLanePosition] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadEntry() {
      setLoading(true);
      const data = await getEntry(entryId);
      if (data) {
        setEntry(data as Entry);
        setBibNumber(data.bib_number || '');
        setSeedMark(data.seed_mark || '');
        setStatus(data.status || 'registered');
        setHeatNumber(data.heat_number?.toString() || '');
        setLanePosition(data.lane_or_position?.toString() || '');
        setNotes(data.notes || '');
      }
      setLoading(false);
    }
    loadEntry();
  }, [entryId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Parse seed mark value for time events (simple conversion)
    let seedMarkValue: number | undefined;
    if (seedMark) {
      // Try to parse as time (mm:ss.xx or ss.xx) or distance
      if (seedMark.includes(':')) {
        const parts = seedMark.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseFloat(parts[1]) || 0;
        seedMarkValue = minutes * 60 * 1000 + seconds * 1000;
      } else if (seedMark.includes('.')) {
        // Could be seconds or distance - store as-is for now
        seedMarkValue = parseFloat(seedMark) * 1000;
      } else {
        seedMarkValue = parseFloat(seedMark) * 1000;
      }
    }

    const result = await updateEntry(
      entryId,
      {
        bib_number: bibNumber || undefined,
        seed_mark: seedMark || undefined,
        seed_mark_value: seedMarkValue,
        status,
        heat_number: heatNumber ? parseInt(heatNumber) : undefined,
        lane_or_position: lanePosition ? parseInt(lanePosition) : undefined,
      },
      competitionId
    );

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push(`/dashboard/competitions/${competitionId}/entries`);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;

    const result = await deleteEntry(entryId, competitionId);

    if (result.error) {
      setError(result.error);
    } else {
      router.push(`/dashboard/competitions/${competitionId}/entries`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Entry not found</p>
        <Link
          href={`/dashboard/competitions/${competitionId}/entries`}
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          Back to Entries
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}/entries`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Entries
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Edit Entry</h1>
      </div>

      {/* Athlete Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {entry.athlete?.first_name} {entry.athlete?.last_name}
            </h2>
            <p className="text-gray-600">
              {entry.athlete?.club_name || 'No club'} &middot;{' '}
              {entry.athlete?.nationality}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {entry.athlete?.gender === 'M' ? 'Male' : entry.athlete?.gender === 'W' ? 'Female' : 'Other'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* BIB Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BIB Number
            </label>
            <input
              type="text"
              value={bibNumber}
              onChange={(e) => setBibNumber(e.target.value)}
              placeholder="e.g., 101"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Seed Mark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seed Mark
            </label>
            <input
              type="text"
              value={seedMark}
              onChange={(e) => setSeedMark(e.target.value)}
              placeholder="e.g., 11.23 or 1:52.45"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Time: ss.xx or mm:ss.xx | Distance: meters
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Heat Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heat Number
            </label>
            <input
              type="number"
              min="1"
              value={heatNumber}
              onChange={(e) => setHeatNumber(e.target.value)}
              placeholder="e.g., 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lane / Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lane / Position
            </label>
            <input
              type="number"
              min="1"
              value={lanePosition}
              onChange={(e) => setLanePosition(e.target.value)}
              placeholder="e.g., 4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this entry..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Entry
          </button>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/competitions/${competitionId}/entries`}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
