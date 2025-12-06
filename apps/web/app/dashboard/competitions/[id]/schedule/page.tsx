'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Users,
  Info,
  ChevronDown,
  ChevronRight,
  Calendar,
  Save,
  X,
} from 'lucide-react';

// Types
interface Event {
  id: string;
  name: string;
  event_code: string;
  event_type: string;
  gender: string;
  age_group: string;
  scheduled_time: string | null;
  status: string;
}

// Time estimation functions based on the algorithm
function estimateFieldEventTime(
  entryCount: number,
  eventType: string
): { minutes: number; breakdown: string } {
  if (entryCount === 0) return { minutes: 0, breakdown: 'Ingen deltakere' };

  // Horizontal jumps and throws
  if (['long_jump', 'triple_jump', 'shot_put', 'discus', 'javelin', 'hammer'].includes(eventType)) {
    const firstRounds = entryCount * 3;
    const lastRounds = Math.min(entryCount, 8) * 3;
    const totalAttempts = firstRounds + lastRounds;
    const reorderTime = 3;
    const minutes = totalAttempts + reorderTime;
    return {
      minutes,
      breakdown: `${entryCount} utøvere × 6 forsøk = ${totalAttempts} fors. + ${reorderTime} min`,
    };
  }

  // High jump
  if (eventType === 'high_jump') {
    const attemptsPerAthlete = 8;
    const totalAttempts = entryCount * attemptsPerAthlete;
    const winnerTime = 10;
    const minutes = totalAttempts + winnerTime;
    return {
      minutes,
      breakdown: `${entryCount} × ${attemptsPerAthlete} fors. + ${winnerTime} min`,
    };
  }

  // Pole vault
  if (eventType === 'pole_vault') {
    const attemptsPerAthlete = 8;
    const totalAttempts = entryCount * attemptsPerAthlete;
    const minutesPerAttempt = 1.5;
    const winnerTime = 10;
    const minutes = Math.ceil(totalAttempts * minutesPerAttempt) + winnerTime;
    return {
      minutes,
      breakdown: `${entryCount} × ${attemptsPerAthlete} × 1.5 min + ${winnerTime} min`,
    };
  }

  // Default field event
  const minutes = entryCount * 6 + 5;
  return {
    minutes,
    breakdown: `${entryCount} utøvere × 6 forsøk + 5 min`,
  };
}

function estimateTrackEventTime(
  entryCount: number,
  eventCode: string
): { minutes: number; breakdown: string; heats: number } {
  if (entryCount === 0) return { minutes: 0, breakdown: 'Ingen deltakere', heats: 0 };

  const lanesPerHeat = 6;
  const heats = Math.ceil(entryCount / lanesPerHeat);
  const distance = parseInt(eventCode.replace(/\D/g, '')) || 100;

  if (distance <= 400) {
    const minutes = heats * 5;
    return { minutes, breakdown: `${heats} heat × 5 min`, heats };
  } else {
    let expectedTime = 5;
    if (distance <= 800) expectedTime = 3;
    else if (distance <= 1500) expectedTime = 5;
    else if (distance <= 3000) expectedTime = 12;
    else if (distance <= 5000) expectedTime = 20;
    else expectedTime = 40;

    const minutesPerHeat = 5 + expectedTime;
    const minutes = heats * minutesPerHeat;
    return { minutes, breakdown: `${heats} heat × ${minutesPerHeat} min`, heats };
  }
}

function getEventTypeFromCode(eventCode: string): string {
  const code = eventCode.toLowerCase();
  if (code.includes('lengde') || code === 'lj') return 'long_jump';
  if (code.includes('tresteg') || code === 'tj') return 'triple_jump';
  if (code.includes('høyde') || code === 'hj') return 'high_jump';
  if (code.includes('stav') || code === 'pv') return 'pole_vault';
  if (code.includes('kule') || code === 'sp') return 'shot_put';
  if (code.includes('diskos') || code === 'dt') return 'discus';
  if (code.includes('spyd') || code === 'jt') return 'javelin';
  if (code.includes('slegge') || code === 'ht') return 'hammer';
  return 'track';
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours}t ${mins}m`;
}

// Extract time (HH:MM) from various datetime formats
function extractTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return '';

  // Try to find HH:MM pattern in the string
  const timeMatch = dateTimeStr.match(/(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }

  // Fallback: try substring if it looks like ISO format
  if (dateTimeStr.length >= 16 && dateTimeStr.includes('T')) {
    return dateTimeStr.substring(11, 16);
  }

  return '';
}

// Standard event categories
const TRACK_EVENTS = ['60m', '80m', '100m', '150m', '200m', '300m', '400m', '600m', '800m', '1000m', '1500m', '3000m'];
const FIELD_EVENTS = ['Lengde', 'Høyde', 'Stav', 'Tresteg', 'Kule', 'Diskos', 'Spyd', 'Slegge', 'Liten ball'];
const HURDLE_EVENTS = ['60m hk', '80m hk', '100m hk', '110m hk', '200m hk', '300m hk', '400m hk'];

// Age group mappings
const AGE_GROUP_ORDER = ['10', '11', '12', '13', '14', '15', '16', '17', 'Junior', 'Senior'];

function normalizeAgeGroup(ageGroup: string, gender: string): string {
  const lower = ageGroup.toLowerCase();

  // Check for senior first
  if (lower.includes('senior')) {
    return gender === 'M' ? 'MS' : gender === 'F' ? 'KS' : 'Senior';
  }

  // Check for junior (U20, U23, etc.) before extracting numbers
  if (lower.includes('junior') || lower.includes('u20') || lower.includes('u23')) {
    return gender === 'M' ? 'MJ' : gender === 'F' ? 'KJ' : 'Junior';
  }

  // Extract age number (e.g., "10 år" -> "10")
  const match = lower.match(/(\d+)\s*år/);
  if (match) {
    const prefix = gender === 'M' ? 'G' : gender === 'F' ? 'J' : '';
    return `${prefix}${match[1]}`;
  }

  // Fallback: try to extract any number that looks like an age (10-17)
  const ageMatch = lower.match(/\b(1[0-7])\b/);
  if (ageMatch) {
    const prefix = gender === 'M' ? 'G' : gender === 'F' ? 'J' : '';
    return `${prefix}${ageMatch[1]}`;
  }

  return ageGroup;
}

function normalizeEventName(name: string): string {
  // Normalize event names for matching - handle Norwegian characters
  return name
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/å/g, 'a')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHurdleEvent(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('hk') || lower.includes('hekk') || lower.includes('hurdle');
}

function matchEventToCategory(eventName: string, categories: string[]): string | null {
  const normalized = normalizeEventName(eventName);
  const eventIsHurdle = isHurdleEvent(eventName);

  for (const cat of categories) {
    const catNorm = normalizeEventName(cat);
    const catIsHurdle = isHurdleEvent(cat);

    // Hurdles should only match hurdles, non-hurdles should only match non-hurdles
    if (eventIsHurdle !== catIsHurdle) {
      continue;
    }

    if (normalized === catNorm) {
      return cat;
    }
    // Match event codes like "60m" in "60m G12"
    if (normalized.startsWith(catNorm + ' ') || normalized.startsWith(catNorm)) {
      return cat;
    }
  }
  return null;
}

export default function SchedulePage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'track' | 'field' | 'hurdles' | null>('track');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const eventsRes = await fetch(`/api/competitions/${competitionId}/events`);
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData);
        }

        const entriesRes = await fetch(`/api/competitions/${competitionId}/entry-counts`);
        if (entriesRes.ok) {
          const entriesData = await entriesRes.json();
          setEntryCounts(entriesData);
        }
      } catch (error) {
        console.error('Error loading schedule data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [competitionId]);

  // Get unique age groups that exist in this competition
  const existingAgeGroups = useMemo(() => {
    const groups = new Set<string>();
    events.forEach((event) => {
      const normalized = normalizeAgeGroup(event.age_group, event.gender);
      groups.add(normalized);
    });

    // Sort by gender then age
    return Array.from(groups).sort((a, b) => {
      // Boys (G/M) first, then girls (J/K)
      const aIsBoy = a.startsWith('G') || a.startsWith('M');
      const bIsBoy = b.startsWith('G') || b.startsWith('M');
      if (aIsBoy && !bIsBoy) return -1;
      if (!aIsBoy && bIsBoy) return 1;

      // Then by age/type
      const aNum = parseInt(a.replace(/\D/g, '')) || (a.includes('J') || a.includes('M') ? 18 : 99);
      const bNum = parseInt(b.replace(/\D/g, '')) || (b.includes('J') || b.includes('M') ? 18 : 99);
      return aNum - bNum;
    });
  }, [events]);

  // Build event matrix: eventCategory -> ageGroup -> event data
  const eventMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { event: Event; count: number } | null>> = {};

    events.forEach((event) => {
      const ageGroup = normalizeAgeGroup(event.age_group, event.gender);
      const eventName = event.event_code || event.name;

      // Try to match to a category
      let category = matchEventToCategory(eventName, [...TRACK_EVENTS, ...FIELD_EVENTS, ...HURDLE_EVENTS]);
      if (!category) {
        // Use the event name as-is
        category = eventName;
      }

      if (!matrix[category]) {
        matrix[category] = {};
      }

      matrix[category][ageGroup] = {
        event,
        count: entryCounts[event.id] || 0,
      };
    });

    return matrix;
  }, [events, entryCounts]);

  // Get event categories that exist in this competition
  const existingCategories = useMemo(() => {
    return Object.keys(eventMatrix);
  }, [eventMatrix]);

  // Time estimates
  const timeEstimates = useMemo(() => {
    const estimates: Record<string, { minutes: number; breakdown: string; heats?: number }> = {};

    events.forEach((event) => {
      const count = entryCounts[event.id] || 0;
      const eventType = getEventTypeFromCode(event.event_code || event.name);

      if (eventType === 'track' || event.event_type === 'track') {
        estimates[event.id] = estimateTrackEventTime(count, event.event_code || event.name);
      } else {
        estimates[event.id] = estimateFieldEventTime(count, eventType);
      }
    });

    return estimates;
  }, [events, entryCounts]);

  // Save time for an event
  const saveEventTime = useCallback(async (eventId: string, time: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/competitions/${competitionId}/events/${eventId}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_time: time }),
      });

      if (response.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, scheduled_time: time ? `2024-01-01T${time}:00` : null }
              : e
          )
        );
      }
    } catch (error) {
      console.error('Error saving time:', error);
    } finally {
      setSaving(false);
      setEditingCell(null);
      setEditTime('');
    }
  }, [competitionId]);

  const handleCellClick = (eventId: string, currentTime: string | null) => {
    setEditingCell(eventId);
    setEditTime(extractTime(currentTime));
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent, eventId: string) => {
    if (e.key === 'Enter') {
      saveEventTime(eventId, editTime);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditTime('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  const renderMatrix = (eventCategories: string[], title: string, sectionKey: 'track' | 'field' | 'hurdles') => {
    // Filter to show ONLY categories that actually exist in the competition
    const relevantCategories = eventCategories.filter((cat) => {
      const normalizedCat = normalizeEventName(cat);
      const catIsHurdle = isHurdleEvent(cat);

      // Check if this category has any events in the matrix
      return existingCategories.some((existing) => {
        const normalizedExisting = normalizeEventName(existing);
        const existingIsHurdle = isHurdleEvent(existing);

        // Hurdles should only match hurdles, non-hurdles should only match non-hurdles
        if (catIsHurdle !== existingIsHurdle) {
          return false;
        }

        // Must be a close match
        return normalizedExisting === normalizedCat ||
               normalizedExisting.startsWith(normalizedCat + ' ') ||
               normalizedExisting.startsWith(normalizedCat) && normalizedCat.length >= 3;
      });
    });

    if (relevantCategories.length === 0) return null;

    const isExpanded = expandedSection === sectionKey;

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]">
                    Øvelse
                  </th>
                  {existingAgeGroups.map((age) => (
                    <th
                      key={age}
                      className="px-2 py-3 text-center font-semibold text-gray-700 min-w-[80px] border-l border-gray-100"
                    >
                      <div>{age}</div>
                      <div className="text-xs font-normal text-gray-400">Ant. / Tid</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {relevantCategories.map((category) => {
                  // Find matching events for this category
                  const normalizedCat = normalizeEventName(category);
                  const catIsHurdle = isHurdleEvent(category);
                  const matchingCategory = existingCategories.find((existing) => {
                    const normalizedExisting = normalizeEventName(existing);
                    const existingIsHurdle = isHurdleEvent(existing);

                    // Hurdles should only match hurdles
                    if (catIsHurdle !== existingIsHurdle) {
                      return false;
                    }

                    return normalizedExisting === normalizedCat ||
                           normalizedExisting.startsWith(normalizedCat + ' ') ||
                           normalizedExisting.startsWith(normalizedCat) && normalizedCat.length >= 3;
                  });

                  const eventRow = matchingCategory ? eventMatrix[matchingCategory] : {};

                  return (
                    <tr key={category} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white px-4 py-2 font-medium text-gray-900 border-r border-gray-200">
                        {category}
                      </td>
                      {existingAgeGroups.map((age) => {
                        const cell = eventRow?.[age];
                        const hasEvent = !!cell;
                        const hasEntries = cell && cell.count > 0;
                        const cellKey = cell?.event.id || `${category}-${age}`;
                        const isEditing = editingCell === cell?.event.id;

                        return (
                          <td
                            key={age}
                            className={`px-2 py-2 text-center border-l border-gray-100 ${
                              hasEntries
                                ? 'bg-blue-50'
                                : hasEvent
                                ? 'bg-gray-50'
                                : 'bg-gray-100'
                            }`}
                          >
                            {hasEvent ? (
                              <div className="space-y-1">
                                <Link
                                  href={`/dashboard/competitions/${competitionId}/events/${cell.event.id}`}
                                  className={`block font-semibold ${
                                    hasEntries ? 'text-blue-900' : 'text-gray-400'
                                  } hover:underline`}
                                >
                                  {hasEntries ? cell.count : '-'}
                                </Link>

                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="time"
                                      value={editTime}
                                      onChange={(e) => setEditTime(e.target.value)}
                                      onKeyDown={(e) => handleTimeKeyDown(e, cell.event.id)}
                                      className="w-20 text-xs px-1 py-0.5 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => saveEventTime(cell.event.id, editTime)}
                                      className="p-0.5 text-green-600 hover:text-green-700"
                                      disabled={saving}
                                    >
                                      <Save className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCell(null);
                                        setEditTime('');
                                      }}
                                      className="p-0.5 text-gray-400 hover:text-gray-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleCellClick(cell.event.id, cell.event.scheduled_time)}
                                    className={`text-xs px-1 py-0.5 rounded hover:bg-blue-100 ${
                                      cell.event.scheduled_time
                                        ? 'text-blue-700 font-medium'
                                        : 'text-gray-400'
                                    }`}
                                  >
                                    {cell.event.scheduled_time
                                      ? extractTime(cell.event.scheduled_time) || 'Sett tid'
                                      : 'Sett tid'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til stevnet
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tidsskjema</h1>
            <p className="text-gray-600">
              Klikk på «Sett tid» for å angi klokkeslett for øvelsene
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              <p className="text-sm text-gray-500">Øvelser</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(entryCounts).reduce((sum, c) => sum + c, 0)}
              </p>
              <p className="text-sm text-gray-500">Påmeldinger totalt</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(
                  Object.values(timeEstimates).reduce((sum, e) => sum + e.minutes, 0)
                )}
              </p>
              <p className="text-sm text-gray-500">Estimert total tid</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{existingAgeGroups.length}</p>
              <p className="text-sm text-gray-500">Klasser i stevnet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Matrix by Category */}
      <div className="space-y-4">
        {renderMatrix(TRACK_EVENTS, 'Løp', 'track')}
        {renderMatrix(FIELD_EVENTS, 'Tekniske øvelser', 'field')}
        {renderMatrix(HURDLE_EVENTS, 'Hekk', 'hurdles')}
      </div>

      {/* Time Estimates Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Estimert tid per øvelse</h3>
          <p className="text-sm text-gray-500 mt-1">
            Sortert etter planlagt tid, deretter etter øvelsesnavn
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Øvelse</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Klasse</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Deltakere</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Est. tid</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Beregning</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Planlagt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events
                .filter((event) => (entryCounts[event.id] || 0) > 0)
                .sort((a, b) => {
                  if (a.scheduled_time && b.scheduled_time) {
                    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
                  }
                  if (a.scheduled_time) return -1;
                  if (b.scheduled_time) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((event) => {
                  const estimate = timeEstimates[event.id];
                  const count = entryCounts[event.id] || 0;

                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/competitions/${competitionId}/events/${event.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {event.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {normalizeAgeGroup(event.age_group, event.gender)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">
                        {formatTime(estimate?.minutes || 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {estimate?.breakdown}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {event.scheduled_time ? (
                          <span className="text-gray-900 font-medium">
                            {extractTime(event.scheduled_time) || '-'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {events.filter((event) => (entryCounts[event.id] || 0) > 0).length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              Ingen øvelser med deltakere ennå.
            </div>
          )}
        </div>
      </div>

      {/* Algorithm Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5" />
          Om tidsberegningen
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Hopp og kast:</strong> 3 første omganger for alle + 3 siste for topp 8.
            Ca. 1 minutt per forsøk + 3 min for omorganisering.
          </p>
          <p>
            <strong>Høyde:</strong> 8 forsøk per utøver × 1 minutt + 10 min for vinner.
          </p>
          <p>
            <strong>Stav:</strong> 8 forsøk per utøver × 1.5 minutt + 10 min for vinner.
          </p>
          <p>
            <strong>Sprint (≤400m):</strong> 5 minutter per heat (6 baner).
          </p>
          <p>
            <strong>Distanse (&gt;400m):</strong> 5 minutter + forventet løpstid per heat.
          </p>
        </div>
      </div>
    </div>
  );
}
