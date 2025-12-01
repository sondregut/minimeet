'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getRecordDefinitions,
  createRecordDefinition,
  deleteRecordDefinition,
  RecordDefinition,
  RecordType,
} from '@/lib/actions/records';
import { Plus, Trash2, Trophy, Search, X } from 'lucide-react';

interface RecordDefinitionsManagerProps {
  competitionId: string;
}

const recordTypes: { value: RecordType; label: string }[] = [
  { value: 'MR', label: 'Meeting Record (MR)' },
  { value: 'CR', label: 'Championship Record (CR)' },
  { value: 'CLR', label: 'Club Record (CLR)' },
  { value: 'NR', label: 'National Record (NR)' },
];

const commonEvents = [
  { code: '60m', name: '60m', isTrack: true },
  { code: '100m', name: '100m', isTrack: true },
  { code: '200m', name: '200m', isTrack: true },
  { code: '400m', name: '400m', isTrack: true },
  { code: '800m', name: '800m', isTrack: true },
  { code: '1500m', name: '1500m', isTrack: true },
  { code: '3000m', name: '3000m', isTrack: true },
  { code: '5000m', name: '5000m', isTrack: true },
  { code: '10000m', name: '10000m', isTrack: true },
  { code: '60mH', name: '60m Hurdles', isTrack: true },
  { code: '100mH', name: '100m Hurdles', isTrack: true },
  { code: '110mH', name: '110m Hurdles', isTrack: true },
  { code: '400mH', name: '400m Hurdles', isTrack: true },
  { code: 'HJ', name: 'High Jump', isTrack: false },
  { code: 'PV', name: 'Pole Vault', isTrack: false },
  { code: 'LJ', name: 'Long Jump', isTrack: false },
  { code: 'TJ', name: 'Triple Jump', isTrack: false },
  { code: 'SP', name: 'Shot Put', isTrack: false },
  { code: 'DT', name: 'Discus', isTrack: false },
  { code: 'HT', name: 'Hammer', isTrack: false },
  { code: 'JT', name: 'Javelin', isTrack: false },
];

export function RecordDefinitionsManager({ competitionId }: RecordDefinitionsManagerProps) {
  const router = useRouter();
  const [records, setRecords] = useState<RecordDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    record_type: 'MR' as RecordType,
    event_code: '',
    gender: 'M',
    age_group: '',
    mark_display: '',
    athlete_name: '',
    set_date: new Date().toISOString().split('T')[0],
    set_location: '',
    wind: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [competitionId]);

  const loadRecords = async () => {
    setLoading(true);
    const result = await getRecordDefinitions({ competitionId });
    if (result.success && result.data) {
      setRecords(result.data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Parse mark value from display string
    let markValue: number;
    const eventInfo = commonEvents.find((e) => e.code === formData.event_code);
    const isTrackEvent = eventInfo?.isTrack ?? true;

    if (isTrackEvent) {
      // Parse time format (mm:ss.xx or ss.xx)
      const parts = formData.mark_display.split(':');
      if (parts.length === 2) {
        markValue = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      } else {
        markValue = parseFloat(formData.mark_display);
      }
    } else {
      // Parse distance (remove 'm' if present)
      markValue = parseFloat(formData.mark_display.replace('m', ''));
    }

    if (isNaN(markValue)) {
      setError('Invalid mark format. Use time (e.g., 10.52 or 1:45.30) or distance (e.g., 8.95)');
      setSaving(false);
      return;
    }

    const result = await createRecordDefinition({
      competition_id: competitionId,
      organization_id: null,
      record_type: formData.record_type,
      event_code: formData.event_code,
      gender: formData.gender,
      age_group: formData.age_group || null,
      mark_value: markValue,
      mark_display: formData.mark_display,
      wind: formData.wind ? parseFloat(formData.wind) : null,
      athlete_name: formData.athlete_name,
      athlete_id: null,
      nationality: null,
      club_name: null,
      set_date: formData.set_date,
      set_location: formData.set_location || null,
      set_competition: null,
      notes: null,
    });

    if (result.success) {
      setShowAddForm(false);
      setFormData({
        record_type: 'MR',
        event_code: '',
        gender: 'M',
        age_group: '',
        mark_display: '',
        athlete_name: '',
        set_date: new Date().toISOString().split('T')[0],
        set_location: '',
        wind: '',
      });
      loadRecords();
      router.refresh();
    } else {
      setError(result.error || 'Failed to create record');
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    setDeleting(id);
    const result = await deleteRecordDefinition(id);
    if (result.success) {
      loadRecords();
      router.refresh();
    }
    setDeleting(null);
  };

  const filteredRecords = records.filter(
    (r) =>
      r.event_code.toLowerCase().includes(filter.toLowerCase()) ||
      r.athlete_name.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Button and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Record
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Record to Beat</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Record Type *
                  </label>
                  <select
                    value={formData.record_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, record_type: e.target.value as RecordType }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {recordTypes.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="M">Men</option>
                    <option value="W">Women</option>
                    <option value="X">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
                  <select
                    value={formData.event_code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, event_code: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select event...</option>
                    {commonEvents.map((event) => (
                      <option key={event.code} value={event.code}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                  <input
                    type="text"
                    value={formData.age_group}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, age_group: e.target.value }))
                    }
                    placeholder="e.g., U20, Senior"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mark *</label>
                  <input
                    type="text"
                    value={formData.mark_display}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, mark_display: e.target.value }))
                    }
                    placeholder="e.g., 10.52 or 8.95m"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wind (m/s)</label>
                  <input
                    type="text"
                    value={formData.wind}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wind: e.target.value }))}
                    placeholder="e.g., +1.2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Record Holder *
                </label>
                <input
                  type="text"
                  value={formData.athlete_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, athlete_name: e.target.value }))
                  }
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Set *
                  </label>
                  <input
                    type="date"
                    value={formData.set_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, set_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.set_location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, set_location: e.target.value }))
                    }
                    placeholder="e.g., Oslo, Norway"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Defined</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Add existing records that athletes can try to beat during this competition.
            This is required for MR, CR, and NR detection.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Record
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mark
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{record.event_code}</div>
                    <div className="text-sm text-gray-500">
                      {record.gender === 'M' ? 'Men' : record.gender === 'W' ? 'Women' : 'Mixed'}
                      {record.age_group && ` - ${record.age_group}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {record.record_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-gray-900">{record.mark_display}</span>
                    {record.wind !== null && (
                      <span className="ml-1 text-sm text-gray-500">
                        ({record.wind > 0 ? '+' : ''}{record.wind})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {record.athlete_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                    {new Date(record.set_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(record.id)}
                      disabled={deleting === record.id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
