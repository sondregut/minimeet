'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Users,
  Zap,
  Trash2,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  RefreshCw,
  Wind
} from 'lucide-react';
import {
  getHeatsForEvent,
  getHeatEntries,
  getEventEntriesForHeats,
  generateHeats,
  deleteEventHeats,
  updateHeatStatus,
  type Heat,
  type HeatEntry
} from '@/lib/actions/heats';
import { getEvent } from '@/lib/actions/events';
import AdvancementCalculator from '@/components/AdvancementCalculator';

interface HeatWithEntries extends Heat {
  entries: HeatEntry[];
}

export default function HeatsPage() {
  const params = useParams();
  const competitionId = params.id as string;
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<{ id: string; name: string; event_code: string; num_lanes?: number; advancement_rule?: { by_place: number; by_time: number } | null } | null>(null);
  const [heats, setHeats] = useState<HeatWithEntries[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [expandedHeats, setExpandedHeats] = useState<Set<string>>(new Set());

  // Generate heats form state
  const [numLanes, setNumLanes] = useState(8);
  const [seedingMethod, setSeedingMethod] = useState<'serpentine' | 'random' | 'fastest_last'>('serpentine');

  const loadData = async () => {
    setLoading(true);
    try {
      // Load event info
      const eventData = await getEvent(eventId);
      if (eventData) {
        setEvent(eventData);
        setNumLanes(eventData.num_lanes || 8);
      }

      // Load heats
      const heatsData = await getHeatsForEvent(eventId);

      // Load entries for each heat
      const heatsWithEntries: HeatWithEntries[] = await Promise.all(
        heatsData.map(async (heat) => {
          const entries = await getHeatEntries(heat.id);
          return { ...heat, entries };
        })
      );

      setHeats(heatsWithEntries);

      // Expand all heats by default
      setExpandedHeats(new Set(heatsWithEntries.map(h => h.id)));

      // Load total entries
      const entries = await getEventEntriesForHeats(eventId);
      setTotalEntries(entries.length);
    } catch (error) {
      console.error('Error loading heats data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleGenerateHeats = async () => {
    setGenerating(true);
    try {
      const result = await generateHeats({
        eventId,
        competitionId,
        numLanes,
        seedingMethod,
      });

      if (result.error) {
        alert(result.error);
      } else {
        setShowGenerateModal(false);
        await loadData();
      }
    } catch (error) {
      console.error('Error generating heats:', error);
      alert('Failed to generate heats');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteHeats = async () => {
    if (!confirm('Are you sure you want to delete all heats? This cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteEventHeats(eventId, competitionId);
      if (result.error) {
        alert(result.error);
      } else {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting heats:', error);
      alert('Failed to delete heats');
    }
  };

  const handleHeatStatusChange = async (heatId: string, newStatus: 'in_progress' | 'completed') => {
    try {
      const result = await updateHeatStatus(heatId, newStatus, competitionId, eventId);
      if (result.error) {
        alert(result.error);
      } else {
        await loadData();
      }
    } catch (error) {
      console.error('Error updating heat status:', error);
    }
  };

  const toggleHeatExpanded = (heatId: string) => {
    setExpandedHeats(prev => {
      const next = new Set(prev);
      if (next.has(heatId)) {
        next.delete(heatId);
      } else {
        next.add(heatId);
      }
      return next;
    });
  };

  const formatTime = (ms: number | null) => {
    if (ms === null) return '-';
    const seconds = ms / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${secs.toFixed(2).padStart(5, '0')}`;
    }
    return secs.toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-200 text-gray-500';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading heats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href={`/dashboard/competitions/${competitionId}/events/${eventId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Heats Management
              </h1>
              <p className="text-gray-600 mt-1">
                {event?.name} ({event?.event_code})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              {heats.length > 0 && (
                <button
                  onClick={handleDeleteHeats}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Heats
                </button>
              )}
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {heats.length > 0 ? 'Regenerate Heats' : 'Generate Heats'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{totalEntries} entries</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{heats.length} heats</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">{numLanes} lanes</span>
            </div>
            {heats.some(h => h.status === 'in_progress') && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-red-600 font-medium">Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {heats.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Heats Generated</h3>
            <p className="text-gray-500 mb-6">
              {totalEntries > 0
                ? `You have ${totalEntries} entries. Generate heats to assign athletes to lanes.`
                : 'Add entries to this event first, then generate heats.'}
            </p>
            {totalEntries > 0 && (
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Zap className="h-5 w-5" />
                Generate Heats
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Advancement Calculator */}
            <AdvancementCalculator
              eventId={eventId}
              competitionId={competitionId}
              currentRule={event?.advancement_rule}
            />

            {heats.map((heat) => (
              <div key={heat.id} className="bg-white rounded-lg border overflow-hidden">
                {/* Heat Header */}
                <div
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleHeatExpanded(heat.id)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400">
                      {expandedHeats.has(heat.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    <h3 className="font-semibold text-gray-900">
                      {heat.name || `Heat ${heat.heat_number}`}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(heat.status)}`}>
                      {getStatusLabel(heat.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {heat.entries.length} athletes
                    </span>
                    {heat.wind_reading !== null && (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Wind className="h-3 w-3" />
                        {heat.wind_reading > 0 ? '+' : ''}{heat.wind_reading}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {heat.status === 'scheduled' && (
                      <button
                        onClick={() => handleHeatStatusChange(heat.id, 'in_progress')}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Start
                      </button>
                    )}
                    {heat.status === 'in_progress' && (
                      <button
                        onClick={() => handleHeatStatusChange(heat.id, 'completed')}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>

                {/* Heat Entries Table */}
                {expandedHeats.has(heat.id) && (
                  <div className="border-t">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <th className="px-4 py-2 text-left w-16">Lane</th>
                          <th className="px-4 py-2 text-left w-20">Bib</th>
                          <th className="px-4 py-2 text-left">Athlete</th>
                          <th className="px-4 py-2 text-right w-24">Seed</th>
                          <th className="px-4 py-2 text-right w-24">Result</th>
                          <th className="px-4 py-2 text-center w-16">Place</th>
                          <th className="px-4 py-2 text-center w-16">Q</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heat.entries
                          .sort((a, b) => (a.lane || 99) - (b.lane || 99))
                          .map((entry) => (
                            <tr key={entry.id} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-gray-600">
                                {entry.lane || '-'}
                              </td>
                              <td className="px-4 py-2 font-mono">
                                {entry.entry?.bib_number || '-'}
                              </td>
                              <td className="px-4 py-2 font-medium">
                                {entry.athlete
                                  ? `${entry.athlete.first_name} ${entry.athlete.last_name}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-500 font-mono">
                                {formatTime(entry.seed_time_ms)}
                              </td>
                              <td className="px-4 py-2 text-right font-mono">
                                {entry.status === 'DNS' && (
                                  <span className="text-gray-400">DNS</span>
                                )}
                                {entry.status === 'DNF' && (
                                  <span className="text-gray-400">DNF</span>
                                )}
                                {entry.status === 'DQ' && (
                                  <span className="text-red-600">DQ</span>
                                )}
                                {entry.status === 'finished' && formatTime(entry.result_time_ms)}
                                {entry.status === 'scheduled' && '-'}
                              </td>
                              <td className="px-4 py-2 text-center font-semibold">
                                {entry.result_place || '-'}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {entry.qualification_mark && (
                                  <span className={`font-bold ${
                                    entry.qualification_mark === 'Q'
                                      ? 'text-green-600'
                                      : 'text-blue-600'
                                  }`}>
                                    {entry.qualification_mark}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Heats Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Generate Heats</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Lanes
                </label>
                <select
                  value={numLanes}
                  onChange={(e) => setNumLanes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={4}>4 lanes</option>
                  <option value={6}>6 lanes</option>
                  <option value={8}>8 lanes</option>
                  <option value={10}>10 lanes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seeding Method
                </label>
                <select
                  value={seedingMethod}
                  onChange={(e) => setSeedingMethod(e.target.value as typeof seedingMethod)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="serpentine">Serpentine (even distribution)</option>
                  <option value="fastest_last">Fastest in Final Heat</option>
                  <option value="random">Random</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {seedingMethod === 'serpentine' && 'Distributes talent evenly across all heats'}
                  {seedingMethod === 'fastest_last' && 'Puts fastest athletes in the last heat'}
                  {seedingMethod === 'random' && 'Random assignment regardless of seed time'}
                </p>
              </div>

              {/* Lane Assignment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                <strong>Lane Priority:</strong> Center lanes (4, 5, 3, 6...) are assigned first to faster athletes.
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                <strong>Note:</strong> This will{heats.length > 0 ? ' delete existing heats and' : ''} create {Math.ceil(totalEntries / numLanes)} new heat{Math.ceil(totalEntries / numLanes) !== 1 ? 's' : ''} for {totalEntries} entries.
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateHeats}
                disabled={generating || totalEntries === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
