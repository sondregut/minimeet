'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { upsertRecordSettings, RecordSettings } from '@/lib/actions/records';
import { Save, Info } from 'lucide-react';

interface RecordSettingsFormProps {
  competitionId: string;
  initialSettings: RecordSettings | null;
}

export function RecordSettingsForm({ competitionId, initialSettings }: RecordSettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [settings, setSettings] = useState({
    track_pb: initialSettings?.track_pb ?? true,
    track_sb: initialSettings?.track_sb ?? true,
    track_mr: initialSettings?.track_mr ?? false,
    track_cr: initialSettings?.track_cr ?? false,
    track_clr: initialSettings?.track_clr ?? false,
    track_nr: initialSettings?.track_nr ?? false,
    highlight_records: initialSettings?.highlight_records ?? true,
    announce_records: initialSettings?.announce_records ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await upsertRecordSettings({
      competition_id: competitionId,
      ...settings,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
    }

    setSaving(false);
  };

  const recordTypes = [
    {
      key: 'track_pb' as const,
      label: 'Personal Best (PB)',
      description: 'Track when athletes achieve a new personal best in any event',
      icon: '🏆',
    },
    {
      key: 'track_sb' as const,
      label: 'Season Best (SB)',
      description: 'Track when athletes achieve a new season best in any event',
      icon: '📅',
    },
    {
      key: 'track_mr' as const,
      label: 'Meeting Record (MR)',
      description: 'Track records specific to this competition/meeting',
      icon: '🎯',
    },
    {
      key: 'track_cr' as const,
      label: 'Championship Record (CR)',
      description: 'Track championship records (for recurring championships)',
      icon: '🏅',
    },
    {
      key: 'track_clr' as const,
      label: 'Club Record (CLR)',
      description: 'Track club records for participating clubs',
      icon: '🏠',
    },
    {
      key: 'track_nr' as const,
      label: 'National Record (NR)',
      description: 'Track national records (requires record definitions)',
      icon: '🇳🇴',
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Record Types to Track */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Types to Track</h2>
        <p className="text-sm text-gray-600 mb-6">
          Select which types of records should be automatically detected and highlighted during this competition.
        </p>

        <div className="space-y-4">
          {recordTypes.map((record) => (
            <label
              key={record.key}
              className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={settings[record.key]}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, [record.key]: e.target.checked }))
                }
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{record.icon}</span>
                  <span className="font-medium text-gray-900">{record.label}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{record.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Settings</h2>

        <div className="space-y-4">
          <label className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={settings.highlight_records}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, highlight_records: e.target.checked }))
              }
              className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Highlight Records in Results</span>
              <p className="text-sm text-gray-500 mt-1">
                Show special badges (PB, SB, MR, etc.) next to results that are records
              </p>
            </div>
          </label>

          <label className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={settings.announce_records}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, announce_records: e.target.checked }))
              }
              className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Show Records in Announcer View</span>
              <p className="text-sm text-gray-500 mt-1">
                Display record notifications in the competition control center for announcers
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">How Records Work</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>PB and SB are automatically tracked from athlete history</li>
            <li>MR and CR require you to set up initial records in the "Records to Beat" tab</li>
            <li>When a result beats an existing record, it's automatically logged</li>
            <li>Records are shown with badges in results and can be announced</li>
          </ul>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
