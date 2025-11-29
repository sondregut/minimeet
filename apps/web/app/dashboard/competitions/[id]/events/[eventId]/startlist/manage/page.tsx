'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Users,
  Zap,
  Shuffle,
  RotateCcw,
  Printer,
  GripVertical,
  ArrowUpDown,
  Ban,
  Check,
  X,
  AlertCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getEntriesByEvent,
  generateHeats,
  generateFlights,
  clearHeatAssignments,
  updateHeatAssignment,
  bulkUpdateEntryStatus,
  swapEntryPositions,
  bulkUpdateLaneAssignments,
} from '@/lib/actions/entries';
import { getEvent } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';

interface Entry {
  id: string;
  bib_number: string | null;
  heat_number: number | null;
  lane_or_position: number | null;
  seed_mark: string | null;
  seed_mark_value: number | null;
  status: string;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
    nationality: string;
    gender: string;
  } | null;
}

export default function StartListManagePage() {
  const params = useParams();
  const competitionId = params.id as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [event, setEvent] = useState<{ name: string; event_type: string; gender: string; age_group: string } | null>(null);
  const [competition, setCompetition] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // UI state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [expandedHeats, setExpandedHeats] = useState<Set<number>>(new Set());
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ heat: number; lane: number } | null>(null);

  // Generate settings
  const [lanesPerHeat, setLanesPerHeat] = useState(8);
  const [seedingMethod, setSeedingMethod] = useState<'seeded' | 'random' | 'serpentine'>('seeded');

  const isTrackEvent = event?.event_type === 'track' || event?.event_type === 'relay';
  const termHeat = isTrackEvent ? 'Heat' : 'Flight';
  const termLane = isTrackEvent ? 'Lane' : 'Position';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, eventData, compData] = await Promise.all([
        getEntriesByEvent(eventId),
        getEvent(eventId),
        getCompetition(competitionId),
      ]);
      setEntries(entriesData as Entry[]);
      setEvent(eventData);
      setCompetition(compData);

      // Expand all heats by default
      const heats = new Set<number>();
      entriesData.forEach((e: Entry) => {
        if (e.heat_number) heats.add(e.heat_number);
      });
      setExpandedHeats(heats);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [eventId, competitionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  // Auto-generate heats/flights
  const handleGenerate = async () => {
    setSaving(true);
    try {
      const result = isTrackEvent
        ? await generateHeats(eventId, competitionId, lanesPerHeat, seedingMethod)
        : await generateFlights(eventId, competitionId, lanesPerHeat, seedingMethod === 'serpentine' ? 'seeded' : seedingMethod);

      if (result.error) {
        showMessage(result.error, true);
      } else {
        showMessage(`${termHeat}s generated successfully!`);
        setShowGenerateModal(false);
        await loadData();
      }
    } catch (err) {
      showMessage('Failed to generate', true);
    } finally {
      setSaving(false);
    }
  };

  // Clear all assignments
  const handleClearAll = async () => {
    if (!confirm(`Are you sure you want to clear all ${termHeat.toLowerCase()} and ${termLane.toLowerCase()} assignments?`)) {
      return;
    }
    setSaving(true);
    try {
      const result = await clearHeatAssignments(eventId, competitionId);
      if (result.error) {
        showMessage(result.error, true);
      } else {
        showMessage('Assignments cleared');
        await loadData();
      }
    } catch (err) {
      showMessage('Failed to clear assignments', true);
    } finally {
      setSaving(false);
    }
  };

  // Bulk mark as DNS
  const handleBulkDNS = async () => {
    const ids = Array.from(selectedEntries);
    if (ids.length === 0) {
      showMessage('Select entries first', true);
      return;
    }
    if (!confirm(`Mark ${ids.length} selected entries as DNS?`)) {
      return;
    }
    setSaving(true);
    try {
      const result = await bulkUpdateEntryStatus(ids, 'DNS', competitionId, eventId);
      if (result.error) {
        showMessage(result.error, true);
      } else {
        showMessage(`${ids.length} entries marked as DNS`);
        setSelectedEntries(new Set());
        await loadData();
      }
    } catch (err) {
      showMessage('Failed to update entries', true);
    } finally {
      setSaving(false);
    }
  };

  // Bulk mark as checked in
  const handleBulkCheckIn = async () => {
    const ids = Array.from(selectedEntries);
    if (ids.length === 0) {
      showMessage('Select entries first', true);
      return;
    }
    setSaving(true);
    try {
      const result = await bulkUpdateEntryStatus(ids, 'checked_in', competitionId, eventId);
      if (result.error) {
        showMessage(result.error, true);
      } else {
        showMessage(`${ids.length} entries checked in`);
        setSelectedEntries(new Set());
        await loadData();
      }
    } catch (err) {
      showMessage('Failed to update entries', true);
    } finally {
      setSaving(false);
    }
  };

  // Mark unassigned as DNS
  const handleUnassignedDNS = async () => {
    const unassignedIds = entries
      .filter(e => !e.heat_number && e.status !== 'DNS' && e.status !== 'scratched')
      .map(e => e.id);

    if (unassignedIds.length === 0) {
      showMessage('No unassigned entries to mark', true);
      return;
    }

    if (!confirm(`Mark ${unassignedIds.length} unassigned entries as DNS?`)) {
      return;
    }

    setSaving(true);
    try {
      const result = await bulkUpdateEntryStatus(unassignedIds, 'DNS', competitionId, eventId);
      if (result.error) {
        showMessage(result.error, true);
      } else {
        showMessage(`${unassignedIds.length} entries marked as DNS`);
        await loadData();
      }
    } catch (err) {
      showMessage('Failed to update entries', true);
    } finally {
      setSaving(false);
    }
  };

  // Update individual lane assignment
  const handleLaneChange = async (entryId: string, newLane: number | null) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      await updateHeatAssignment(entryId, entry.heat_number, newLane, competitionId, eventId);
      setEntries(prev => prev.map(e =>
        e.id === entryId ? { ...e, lane_or_position: newLane } : e
      ));
    } catch (err) {
      showMessage('Failed to update lane', true);
    }
  };

  // Update individual heat assignment
  const handleHeatChange = async (entryId: string, newHeat: number | null) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      await updateHeatAssignment(entryId, newHeat, entry.lane_or_position, competitionId, eventId);
      setEntries(prev => prev.map(e =>
        e.id === entryId ? { ...e, heat_number: newHeat } : e
      ));
    } catch (err) {
      showMessage('Failed to update heat', true);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (entryId: string) => {
    setDraggedEntry(entryId);
  };

  const handleDragOver = (e: React.DragEvent, heat: number, lane: number) => {
    e.preventDefault();
    setDragOverTarget({ heat, lane });
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (targetEntryId: string) => {
    if (!draggedEntry || draggedEntry === targetEntryId) {
      setDraggedEntry(null);
      setDragOverTarget(null);
      return;
    }

    setSaving(true);
    try {
      const result = await swapEntryPositions(draggedEntry, targetEntryId, competitionId, eventId);
      if (result.error) {
        showMessage(result.error, true);
      } else {
        await loadData();
      }
    } catch (err) {
      showMessage('Failed to swap positions', true);
    } finally {
      setDraggedEntry(null);
      setDragOverTarget(null);
      setSaving(false);
    }
  };

  // Toggle entry selection
  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  // Select all / none
  const selectAll = () => {
    setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
  };

  const selectNone = () => {
    setSelectedEntries(new Set());
  };

  // Toggle heat expansion
  const toggleHeat = (heat: number) => {
    setExpandedHeats(prev => {
      const next = new Set(prev);
      if (next.has(heat)) {
        next.delete(heat);
      } else {
        next.add(heat);
      }
      return next;
    });
  };

  // Filter entries
  const filteredEntries = entries.filter(e => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unassigned') return !e.heat_number;
    if (filterStatus === 'assigned') return !!e.heat_number;
    return e.status === filterStatus;
  });

  // Group entries by heat
  const entriesByHeat: Record<number, Entry[]> = {};
  const unassigned: Entry[] = [];

  filteredEntries.forEach(entry => {
    if (entry.heat_number) {
      if (!entriesByHeat[entry.heat_number]) {
        entriesByHeat[entry.heat_number] = [];
      }
      entriesByHeat[entry.heat_number].push(entry);
    } else {
      unassigned.push(entry);
    }
  });

  // Sort entries within each heat by lane
  Object.values(entriesByHeat).forEach(heatEntries => {
    heatEntries.sort((a, b) => (a.lane_or_position || 99) - (b.lane_or_position || 99));
  });

  const heatNumbers = Object.keys(entriesByHeat).map(Number).sort((a, b) => a - b);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      registered: 'bg-gray-100 text-gray-700',
      confirmed: 'bg-blue-100 text-blue-700',
      checked_in: 'bg-green-100 text-green-700',
      DNS: 'bg-orange-100 text-orange-700',
      scratched: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading start list...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href={`/dashboard/competitions/${competitionId}/events/${eventId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Start List Management
              </h1>
              <p className="text-gray-600 mt-1">
                {event?.name} - {competition?.name}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => loadData()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <Link
                href={`/dashboard/competitions/${competitionId}/events/${eventId}/startlist`}
                className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1"
              >
                <Printer className="h-4 w-4" />
                Print View
              </Link>
              <button
                onClick={handleClearAll}
                disabled={saving}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Clear All
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Auto-Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green-50 text-green-600 flex items-center gap-2">
              <Check className="h-4 w-4" />
              {success}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left side - Stats & Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{entries.length} entries</span>
                {heatNumbers.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{heatNumbers.length} {termHeat.toLowerCase()}s</span>
                  </>
                )}
                {unassigned.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-orange-600">{unassigned.length} unassigned</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All entries</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="registered">Registered</option>
                  <option value="checked_in">Checked In</option>
                  <option value="DNS">DNS</option>
                  <option value="scratched">Scratched</option>
                </select>
              </div>
            </div>

            {/* Right side - Bulk Actions */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedEntries.size > 0 && `${selectedEntries.size} selected`}
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
              <div className="h-4 w-px bg-gray-300" />
              <button
                onClick={handleBulkCheckIn}
                disabled={selectedEntries.size === 0 || saving}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Check In
              </button>
              <button
                onClick={handleBulkDNS}
                disabled={selectedEntries.size === 0 || saving}
                className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 flex items-center gap-1"
              >
                <Ban className="h-3 w-3" />
                DNS
              </button>
              {unassigned.length > 0 && (
                <button
                  onClick={handleUnassignedDNS}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                >
                  DNS All Unassigned
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {entries.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Entries</h3>
            <p className="text-gray-500">
              Add athletes to this event first.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Heats */}
            {heatNumbers.map(heatNum => (
              <div key={heatNum} className="bg-white rounded-lg border overflow-hidden">
                <div
                  className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleHeat(heatNum)}
                >
                  <div className="flex items-center gap-3">
                    {expandedHeats.has(heatNum) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                    <h3 className="font-semibold text-gray-900">
                      {termHeat} {heatNum}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {entriesByHeat[heatNum].length} athletes
                    </span>
                  </div>
                </div>

                {expandedHeats.has(heatNum) && (
                  <table className="w-full">
                    <thead>
                      <tr className="border-t border-b bg-gray-50 text-xs text-gray-500 uppercase">
                        <th className="px-2 py-2 w-10"></th>
                        <th className="px-2 py-2 w-8">
                          <ArrowUpDown className="h-3 w-3" />
                        </th>
                        <th className="px-3 py-2 text-left w-20">{termLane}</th>
                        <th className="px-3 py-2 text-left w-20">Bib</th>
                        <th className="px-3 py-2 text-left">Athlete</th>
                        <th className="px-3 py-2 text-left">Club</th>
                        <th className="px-3 py-2 text-left w-24">Seed</th>
                        <th className="px-3 py-2 text-left w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entriesByHeat[heatNum].map((entry) => (
                        <tr
                          key={entry.id}
                          className={`border-b hover:bg-gray-50 ${
                            selectedEntries.has(entry.id) ? 'bg-blue-50' : ''
                          } ${draggedEntry === entry.id ? 'opacity-50' : ''}`}
                          draggable
                          onDragStart={() => handleDragStart(entry.id)}
                          onDragOver={(e) => handleDragOver(e, heatNum, entry.lane_or_position || 0)}
                          onDragLeave={handleDragLeave}
                          onDrop={() => handleDrop(entry.id)}
                        >
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={() => toggleEntrySelection(entry.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2 cursor-grab">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={entry.lane_or_position || ''}
                              onChange={(e) => handleLaneChange(
                                entry.id,
                                e.target.value ? parseInt(e.target.value) : null
                              )}
                              className="w-14 px-2 py-1 text-center border rounded focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold">
                            {entry.bib_number || '-'}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-600 font-mono">
                            {entry.seed_mark || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(entry.status)}`}>
                              {entry.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            {/* Unassigned */}
            {unassigned.length > 0 && (
              <div className="bg-white rounded-lg border overflow-hidden border-orange-200">
                <div className="px-4 py-3 bg-orange-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold text-orange-800">
                      Unassigned ({unassigned.length})
                    </h3>
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-t border-b bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="px-2 py-2 w-10"></th>
                      <th className="px-3 py-2 text-left w-20">{termHeat}</th>
                      <th className="px-3 py-2 text-left w-20">Bib</th>
                      <th className="px-3 py-2 text-left">Athlete</th>
                      <th className="px-3 py-2 text-left">Club</th>
                      <th className="px-3 py-2 text-left w-24">Seed</th>
                      <th className="px-3 py-2 text-left w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassigned.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`border-b hover:bg-gray-50 ${
                          selectedEntries.has(entry.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => toggleEntrySelection(entry.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            value={entry.heat_number || ''}
                            onChange={(e) => handleHeatChange(
                              entry.id,
                              e.target.value ? parseInt(e.target.value) : null
                            )}
                            className="w-14 px-2 py-1 text-center border rounded focus:ring-blue-500 focus:border-blue-500"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold">
                          {entry.bib_number || '-'}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {entry.athlete?.last_name?.toUpperCase()}, {entry.athlete?.first_name}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {entry.athlete?.club_name || entry.athlete?.nationality || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 font-mono">
                          {entry.seed_mark || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(entry.status)}`}>
                            {entry.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Auto-Generate {termHeat}s</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isTrackEvent ? 'Lanes per Heat' : 'Athletes per Flight'}
                </label>
                <select
                  value={lanesPerHeat}
                  onChange={(e) => setLanesPerHeat(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {isTrackEvent ? (
                    <>
                      <option value={4}>4 lanes</option>
                      <option value={6}>6 lanes</option>
                      <option value={8}>8 lanes</option>
                      <option value={10}>10 lanes</option>
                    </>
                  ) : (
                    <>
                      <option value={8}>8 athletes</option>
                      <option value={10}>10 athletes</option>
                      <option value={12}>12 athletes</option>
                      <option value={15}>15 athletes</option>
                    </>
                  )}
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
                  <option value="seeded">Seeded (by PB/SB)</option>
                  <option value="random">Random</option>
                  {isTrackEvent && <option value="serpentine">Serpentine (balanced)</option>}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {seedingMethod === 'seeded' && `Fastest athletes in the last ${termHeat.toLowerCase()}`}
                  {seedingMethod === 'random' && 'Athletes randomly distributed'}
                  {seedingMethod === 'serpentine' && `Balanced ${termHeat.toLowerCase()}s with snake-pattern seeding`}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                <strong>Note:</strong> This will replace any existing {termHeat.toLowerCase()} assignments.
                {entries.length > 0 && ` ${Math.ceil(entries.length / lanesPerHeat)} ${termHeat.toLowerCase()}${Math.ceil(entries.length / lanesPerHeat) !== 1 ? 's' : ''} will be created.`}
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
                onClick={handleGenerate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4" />
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
