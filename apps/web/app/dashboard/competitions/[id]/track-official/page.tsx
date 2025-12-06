'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Timer,
  Download,
  AlertCircle,
  Layers,
  LayoutGrid,
  Info,
  Trash2,
} from 'lucide-react';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntriesByEvent } from '@/lib/actions/entries';
import { generateSeeding, clearSeeding, getSeedingStatus } from '@/lib/actions/seeding';
import {
  getAllPresets,
  getRecommendedPreset,
  type SeedingPresetId,
  type LaneCount,
} from '@/lib/seeding';
import { TIMING_SYSTEMS, type TimingSystemId } from '@/lib/constants/timing-systems';

interface Competition {
  id: string;
  name: string;
  date: string;
  status: string;
  competition_type?: string;
  settings?: {
    venue_type?: string;
    timing_system?: TimingSystemId;
    num_lanes?: number;
  } | null;
}

interface Event {
  id: string;
  name: string;
  event_type: string;
  event_code: string;
  status: string;
  scheduled_time: string | null;
  round: string;
  gender: string;
  age_group: string | null;
  num_lanes?: number;
  has_heats?: boolean;
}

interface Entry {
  id: string;
  athlete_id: string;
  bib_number: string | null;
  seed_mark: string | null;
  seed_mark_value: number | null;
  heat_number: number | null;
  lane_or_position: number | null;
  status: string;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
    gender: string;
  };
}

interface Heat {
  heatNumber: number;
  entries: Entry[];
}

export default function TrackOfficialPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [heats, setHeats] = useState<Heat[]>([]);

  // Settings - now using presets
  const [numLanes, setNumLanes] = useState<LaneCount>(8);
  const [selectedPreset, setSelectedPreset] = useState<SeedingPresetId>('club_simplified');
  const [heatCount, setHeatCount] = useState<number | undefined>(undefined);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get all available presets
  const presets = getAllPresets();

  const loadData = useCallback(async () => {
    try {
      const [comp, evts] = await Promise.all([
        getCompetition(competitionId),
        getEventsByCompetition(competitionId),
      ]);

      setCompetition(comp as Competition);

      // Filter only track/relay events
      const trackEvents = (evts as Event[]).filter(
        e => e.event_type === 'track' || e.event_type === 'relay'
      );
      setEvents(trackEvents);

      // Set default lanes from competition settings
      if (comp?.settings?.num_lanes) {
        const lanes = comp.settings.num_lanes;
        if (lanes === 6 || lanes === 8 || lanes === 9) {
          setNumLanes(lanes as LaneCount);
        }
      }

      // Set recommended preset based on competition type
      if (comp?.competition_type) {
        setSelectedPreset(getRecommendedPreset(comp.competition_type));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load entries when event is selected
  async function loadEventEntries(eventId: string) {
    const eventEntries = await getEntriesByEvent(eventId);
    setEntries(eventEntries as Entry[]);

    // Group into heats
    const heatMap = new Map<number, Entry[]>();
    for (const entry of eventEntries as Entry[]) {
      if (entry.heat_number) {
        if (!heatMap.has(entry.heat_number)) {
          heatMap.set(entry.heat_number, []);
        }
        heatMap.get(entry.heat_number)!.push(entry);
      }
    }

    // Sort entries within each heat by lane
    const heatArray: Heat[] = Array.from(heatMap.entries())
      .map(([heatNumber, entries]) => ({
        heatNumber,
        entries: entries.sort((a, b) => (a.lane_or_position || 99) - (b.lane_or_position || 99)),
      }))
      .sort((a, b) => a.heatNumber - b.heatNumber);

    setHeats(heatArray);

    // Calculate default heat count
    const activeEntries = (eventEntries as Entry[]).filter(
      e => ['registered', 'confirmed', 'checked_in'].includes(e.status)
    );
    const defaultHeats = Math.ceil(activeEntries.length / numLanes);
    setHeatCount(defaultHeats > 0 ? defaultHeats : undefined);
  }

  // Handle event selection
  function handleEventSelect(event: Event) {
    setSelectedEvent(event);
    loadEventEntries(event.id);
    setMessage(null);
  }

  // Generate heats using new WA seeding module
  async function handleGenerateHeats() {
    if (!selectedEvent) return;

    setProcessing(true);
    setMessage(null);

    try {
      const result = await generateSeeding({
        eventId: selectedEvent.id,
        competitionId,
        presetId: selectedPreset,
        laneCount: numLanes,
        heatCount: heatCount,
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else if (result.data) {
        setMessage({
          type: 'success',
          text: `${result.data.heatsCreated} heat generert med ${result.data.entriesAssigned} utøvere`,
        });
        // Reload entries to get updated data
        await loadEventEntries(selectedEvent.id);
      }
    } catch (err) {
      console.error('Error generating heats:', err);
      setMessage({ type: 'error', text: 'Kunne ikke generere heat' });
    } finally {
      setProcessing(false);
    }
  }

  // Clear heats for selected event
  async function handleClearHeats() {
    if (!selectedEvent) return;
    if (!confirm('Er du sikker på at du vil slette alle heat-tildelinger?')) return;

    setProcessing(true);
    try {
      const result = await clearSeeding(selectedEvent.id, competitionId);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setHeats([]);
        setMessage({ type: 'success', text: 'Heat-tildelinger slettet' });
        await loadEventEntries(selectedEvent.id);
      }
    } catch (err) {
      console.error('Error clearing heats:', err);
      setMessage({ type: 'error', text: 'Kunne ikke slette heat' });
    } finally {
      setProcessing(false);
    }
  }

  // Export heats for timing system
  function generateTimingExport(): string {
    if (!competition || !selectedEvent || heats.length === 0) return '';

    const timingSystem = competition.settings?.timing_system || 'manual';

    // Format based on timing system
    switch (timingSystem) {
      case 'finishlynx':
        return generateFinishLynxExport();
      case 'alge':
        return generateAlgeExport();
      default:
        return generateCSVExport();
    }
  }

  // FinishLynx LIF format
  function generateFinishLynxExport(): string {
    const lines: string[] = [];

    for (const heat of heats) {
      for (const entry of heat.entries) {
        // LIF format: Event,Heat,Lane,ID,LastName,FirstName,Affiliation
        lines.push([
          selectedEvent?.event_code || '',
          heat.heatNumber.toString(),
          (entry.lane_or_position || '').toString(),
          entry.bib_number || '',
          entry.athlete.last_name,
          entry.athlete.first_name,
          entry.athlete.club_name || '',
        ].join(','));
      }
    }

    return lines.join('\n');
  }

  // Alge format
  function generateAlgeExport(): string {
    const lines: string[] = [];

    for (const heat of heats) {
      for (const entry of heat.entries) {
        // Alge format: Bib;Lane;Name;Club;Event;Heat
        lines.push([
          entry.bib_number || '',
          (entry.lane_or_position || '').toString(),
          `${entry.athlete.last_name}, ${entry.athlete.first_name}`,
          entry.athlete.club_name || '',
          selectedEvent?.event_code || '',
          heat.heatNumber.toString(),
        ].join(';'));
      }
    }

    return lines.join('\n');
  }

  // Generic CSV export
  function generateCSVExport(): string {
    const lines: string[] = [
      'Heat,Bane,Startnr,Etternavn,Fornavn,Klubb,Seedtid',
    ];

    for (const heat of heats) {
      for (const entry of heat.entries) {
        lines.push([
          heat.heatNumber.toString(),
          (entry.lane_or_position || '').toString(),
          entry.bib_number || '',
          entry.athlete.last_name,
          entry.athlete.first_name,
          entry.athlete.club_name || '',
          entry.seed_mark || '',
        ].join(','));
      }
    }

    return lines.join('\n');
  }

  // Download export file
  function handleExport() {
    const content = generateTimingExport();
    if (!content) {
      setMessage({ type: 'error', text: 'Ingen data å eksportere' });
      return;
    }

    const timingSystem = competition?.settings?.timing_system || 'manual';
    let filename = `${selectedEvent?.event_code || 'heats'}`;
    let extension = 'csv';

    if (timingSystem === 'finishlynx') {
      extension = 'lif';
    } else if (timingSystem === 'alge') {
      extension = 'alg';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMessage({ type: 'success', text: `Eksportert til ${filename}.${extension}` });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const timingSystemName = competition?.settings?.timing_system
    ? TIMING_SYSTEMS.find(t => t.id === competition.settings?.timing_system)?.name || 'Manuell'
    : 'Manuell';

  const currentPreset = presets.find(p => p.id === selectedPreset);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/competitions/${competitionId}/control`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til kontrollsenter
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Løpskontroll</h1>
              <p className="text-gray-600">{competition?.name}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
            Tidtaking: <span className="font-medium">{timingSystemName}</span>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Oppdater
          </button>
        </div>
      </div>

      {/* Message */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Løpsøvelser ({events.length})</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {events.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Ingen løpsøvelser funnet</p>
                </div>
              ) : (
                events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => handleEventSelect(event)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedEvent?.id === event.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{event.name}</p>
                        <p className="text-sm text-gray-500">
                          {event.gender === 'M' ? 'Menn' : event.gender === 'W' ? 'Kvinner' : 'Mix'}
                          {event.age_group && ` - ${event.age_group}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.has_heats && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Heat
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            event.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : event.status === 'in_progress'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {event.status === 'completed'
                            ? 'Ferdig'
                            : event.status === 'in_progress'
                            ? 'Pågår'
                            : 'Planlagt'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Heat Management */}
        <div className="lg:col-span-2">
          {selectedEvent ? (
            <div className="space-y-4">
              {/* Event Header */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedEvent.name}</h2>
                    <p className="text-gray-600">
                      {entries.filter(e => ['registered', 'confirmed', 'checked_in'].includes(e.status)).length} utøvere - {heats.length} heat
                    </p>
                  </div>
                </div>

                {/* Seeding Preset Selection */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900">Seeding-innstillinger (WA-regler)</h3>
                      {currentPreset && (
                        <p className="text-sm text-blue-700 mt-1">{currentPreset.descriptionNo}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seeding-type
                    </label>
                    <select
                      value={selectedPreset}
                      onChange={e => setSelectedPreset(e.target.value as SeedingPresetId)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {presets.map(preset => (
                        <option key={preset.id} value={preset.id}>
                          {preset.nameNo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Antall baner
                    </label>
                    <select
                      value={numLanes}
                      onChange={e => setNumLanes(parseInt(e.target.value) as LaneCount)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value={6}>6 baner</option>
                      <option value={8}>8 baner</option>
                      <option value={9}>9 baner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Antall heat
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={heatCount || ''}
                      onChange={e => setHeatCount(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Auto"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateHeats}
                      disabled={processing || entries.filter(e => ['registered', 'confirmed', 'checked_in'].includes(e.status)).length === 0}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Layers className="w-4 h-4" />
                      Generer heat
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleClearHeats}
                    disabled={processing || heats.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Slett heat
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={heats.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Eksporter til tidtaker
                  </button>
                </div>
              </div>

              {/* Entries without heats */}
              {entries.filter(e => !e.heat_number && ['registered', 'confirmed', 'checked_in'].includes(e.status)).length > 0 && (
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    Utøvere uten heat ({entries.filter(e => !e.heat_number && ['registered', 'confirmed', 'checked_in'].includes(e.status)).length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {entries.filter(e => !e.heat_number && ['registered', 'confirmed', 'checked_in'].includes(e.status)).map(entry => (
                      <div
                        key={entry.id}
                        className="bg-white rounded-lg p-2 text-sm flex justify-between items-center"
                      >
                        <span>
                          {entry.bib_number && <span className="font-mono mr-2">{entry.bib_number}</span>}
                          {entry.athlete.last_name}, {entry.athlete.first_name}
                        </span>
                        <span className="text-gray-500">
                          {entry.seed_mark || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Heats */}
              {heats.length > 0 && (
                <div className="space-y-4">
                  {heats.map(heat => (
                    <div
                      key={heat.heatNumber}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          Heat {heat.heatNumber}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {heat.entries.length} utøvere
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                              <th className="px-4 py-2 text-left">Bane</th>
                              <th className="px-4 py-2 text-left">Startnr</th>
                              <th className="px-4 py-2 text-left">Navn</th>
                              <th className="px-4 py-2 text-left">Klubb</th>
                              <th className="px-4 py-2 text-right">Seedtid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {heat.entries.map(entry => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono font-bold text-lg text-center">
                                  {entry.lane_or_position}
                                </td>
                                <td className="px-4 py-2 font-mono">
                                  {entry.bib_number || '-'}
                                </td>
                                <td className="px-4 py-2 font-medium">
                                  {entry.athlete.last_name}, {entry.athlete.first_name}
                                </td>
                                <td className="px-4 py-2 text-gray-600">
                                  {entry.athlete.club_name || '-'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {entry.seed_mark || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No heats yet */}
              {heats.length === 0 && entries.filter(e => ['registered', 'confirmed', 'checked_in'].includes(e.status)).length > 0 && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                  <LayoutGrid className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Ingen heat generert ennå
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Velg seeding-type og antall baner, deretter klikk &quot;Generer heat&quot; for å fordele utøverne.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Timer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Velg en øvelse</h3>
              <p className="text-gray-600">
                Velg en løpsøvelse fra listen for å administrere heat og banetildelinger.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
