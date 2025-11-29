'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Zap, List, Copy, Check, Loader2, CheckCircle2, X } from 'lucide-react';
import {
  EVENT_TEMPLATES,
  EVENTS_BY_CATEGORY,
  COMMON_EVENTS,
  AGE_GROUPS,
  GENDERS,
  generateEventName,
  getTemplateByCode,
  type EventTemplate,
} from '@/lib/event-templates';
import { bulkCreateEvents, copyEventsFromCompetition, getCompetitionsForCopy, getEventsByCompetition } from '@/lib/actions/events';

type Tab = 'quick' | 'bulk' | 'copy';

type ExistingEvent = {
  event_code: string;
  gender: string;
  age_group: string;
  name: string;
};

export default function QuickAddEventsPage() {
  const params = useParams();
  const competitionId = params.id as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('quick');
  const [selectedGender, setSelectedGender] = useState<'M' | 'W' | 'X'>('M');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('Senior');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Track existing events in this competition
  const [existingEvents, setExistingEvents] = useState<ExistingEvent[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  // Bulk add state
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  // Copy state
  const [competitions, setCompetitions] = useState<{ id: string; name: string; date: string }[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [sourceEvents, setSourceEvents] = useState<{ name: string; event_code: string }[]>([]);

  // Load existing events for this competition
  const loadExistingEvents = async () => {
    const events = await getEventsByCompetition(competitionId);
    setExistingEvents(events.map(e => ({
      event_code: e.event_code,
      gender: e.gender,
      age_group: e.age_group,
      name: e.name,
    })));
  };

  useEffect(() => {
    if (competitionId) {
      getCompetitionsForCopy(competitionId).then(setCompetitions);
      loadExistingEvents();
    }
  }, [competitionId]);

  // Check if an event already exists for the current gender/age group
  const isEventAdded = (eventCode: string) => {
    return existingEvents.some(
      e => e.event_code === eventCode && e.gender === selectedGender && e.age_group === selectedAgeGroup
    );
  };

  // Get unique key for tracking recently added
  const getEventKey = (eventCode: string) => `${eventCode}-${selectedGender}-${selectedAgeGroup}`;

  useEffect(() => {
    if (selectedCompetition) {
      getEventsByCompetition(selectedCompetition).then(events => {
        setSourceEvents(events.map(e => ({ name: e.name, event_code: e.event_code })));
      });
    }
  }, [selectedCompetition]);

  const handleQuickAdd = async (template: EventTemplate) => {
    // Don't add if already exists
    if (isEventAdded(template.event_code)) return;

    setIsLoading(true);
    setMessage(null);

    const eventName = generateEventName(template, selectedGender, selectedAgeGroup);
    const eventKey = getEventKey(template.event_code);

    try {
      const result = await bulkCreateEvents({
        competition_id: competitionId,
        events: [{
          event_code: template.event_code,
          name: eventName,
          event_type: template.event_type,
          gender: selectedGender,
          age_group: selectedAgeGroup,
          settings: template.defaultSettings,
        }],
      });

      setIsLoading(false);

      if (result?.success) {
        // Add to recently added for animation
        setRecentlyAdded(prev => new Set(prev).add(eventKey));
        // Refresh existing events list
        await loadExistingEvents();
        setMessage({ type: 'success', text: `Added: ${eventName}` });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to add event' });
      }
    } catch (error) {
      setIsLoading(false);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to add event' });
    }
  };

  const handleBulkAdd = async () => {
    if (selectedEvents.size === 0) return;

    setIsLoading(true);
    setMessage(null);

    // Filter out already existing events
    const eventsToAdd = Array.from(selectedEvents)
      .filter(code => !isEventAdded(code))
      .map(code => {
        const template = getTemplateByCode(code)!;
        return {
          event_code: template.event_code,
          name: generateEventName(template, selectedGender, selectedAgeGroup),
          event_type: template.event_type,
          gender: selectedGender,
          age_group: selectedAgeGroup,
          settings: template.defaultSettings,
        };
      });

    if (eventsToAdd.length === 0) {
      setIsLoading(false);
      setMessage({ type: 'error', text: 'All selected events already exist' });
      return;
    }

    try {
      const result = await bulkCreateEvents({
        competition_id: competitionId,
        events: eventsToAdd,
      });

      setIsLoading(false);

      if (result?.success) {
        // Mark all as recently added
        const newRecentlyAdded = new Set(recentlyAdded);
        eventsToAdd.forEach(e => newRecentlyAdded.add(getEventKey(e.event_code)));
        setRecentlyAdded(newRecentlyAdded);
        // Refresh existing events
        await loadExistingEvents();
        setMessage({ type: 'success', text: `Added ${result.count} events` });
        setSelectedEvents(new Set());
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to add events' });
      }
    } catch (error) {
      setIsLoading(false);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to add events' });
    }
  };

  const handleCopyEvents = async () => {
    if (!selectedCompetition) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await copyEventsFromCompetition(selectedCompetition, competitionId);

      setIsLoading(false);

      if (result?.success) {
        // Refresh existing events
        await loadExistingEvents();
        setMessage({ type: 'success', text: `Copied ${result.count} events` });
        setSelectedCompetition('');
        setSourceEvents([]);
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to copy events' });
      }
    } catch (error) {
      setIsLoading(false);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to copy events' });
    }
  };

  const toggleEvent = (code: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedEvents(newSelected);
  };

  const selectAllInCategory = (category: keyof typeof EVENTS_BY_CATEGORY) => {
    const newSelected = new Set(selectedEvents);
    EVENTS_BY_CATEGORY[category].forEach(e => newSelected.add(e.event_code));
    setSelectedEvents(newSelected);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/competitions/${competitionId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Competition
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Quick Add Events</h1>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Gender & Age Group Selection */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setSelectedGender(g.value as 'M' | 'W' | 'X')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedGender === g.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
            <select
              value={selectedAgeGroup}
              onChange={e => setSelectedAgeGroup(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {AGE_GROUPS.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>
          {/* Events count for current selection */}
          <div className="ml-auto text-right">
            <div className="text-sm text-gray-500">Events for {selectedGender === 'M' ? 'Men' : selectedGender === 'W' ? 'Women' : 'Mixed'} {selectedAgeGroup}</div>
            <div className="text-2xl font-bold text-green-600">
              {existingEvents.filter(e => e.gender === selectedGender && e.age_group === selectedAgeGroup).length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'quick'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            Quick Add
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'bulk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
            Bulk Add
          </button>
          <button
            onClick={() => setActiveTab('copy')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'copy'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Copy className="w-4 h-4" />
            Copy from Competition
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'quick' && (
        <div className="space-y-6">
          <p className="text-gray-600">Click an event to add it instantly with the selected gender and age group.</p>

          {/* Common Events */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Common Events</h3>
            <div className="flex flex-wrap gap-2">
              {COMMON_EVENTS.map(code => {
                const template = getTemplateByCode(code);
                if (!template) return null;
                const added = isEventAdded(code);
                const recentKey = getEventKey(code);
                const isRecent = recentlyAdded.has(recentKey);
                return (
                  <button
                    key={code}
                    onClick={() => handleQuickAdd(template)}
                    disabled={isLoading || added}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      added
                        ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                    } ${isRecent ? 'animate-pulse' : ''}`}
                  >
                    {added && <CheckCircle2 className="w-4 h-4" />}
                    {template.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Events by Category */}
          {Object.entries(EVENTS_BY_CATEGORY).map(([category, events]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                {category === 'sprint' ? 'Sprints' :
                 category === 'middle' ? 'Middle Distance' :
                 category === 'long' ? 'Long Distance' :
                 category === 'hurdles' ? 'Hurdles' :
                 category === 'jumps' ? 'Jumps' :
                 category === 'throws' ? 'Throws' :
                 'Relays'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {events.map(template => {
                  const added = isEventAdded(template.event_code);
                  const recentKey = getEventKey(template.event_code);
                  const isRecent = recentlyAdded.has(recentKey);
                  return (
                    <button
                      key={template.event_code}
                      onClick={() => handleQuickAdd(template)}
                      disabled={isLoading || added}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                        added
                          ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                      } ${isRecent ? 'animate-pulse' : ''}`}
                    >
                      {added && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {template.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Select multiple events, then click Add Selected.</p>
            <button
              onClick={handleBulkAdd}
              disabled={isLoading || selectedEvents.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Add Selected ({selectedEvents.size})
            </button>
          </div>

          {/* Events by Category with Checkboxes */}
          {Object.entries(EVENTS_BY_CATEGORY).map(([category, events]) => (
            <div key={category} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  {category === 'sprint' ? 'Sprints' :
                   category === 'middle' ? 'Middle Distance' :
                   category === 'long' ? 'Long Distance' :
                   category === 'hurdles' ? 'Hurdles' :
                   category === 'jumps' ? 'Jumps' :
                   category === 'throws' ? 'Throws' :
                   'Relays'}
                </h3>
                <button
                  onClick={() => selectAllInCategory(category as keyof typeof EVENTS_BY_CATEGORY)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {events.map(template => {
                  const added = isEventAdded(template.event_code);
                  return (
                    <label
                      key={template.event_code}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        added
                          ? 'bg-green-50 border-green-200 border cursor-default'
                          : selectedEvents.has(template.event_code)
                          ? 'bg-blue-50 border-blue-200 border cursor-pointer'
                          : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                      }`}
                    >
                      {added ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">{template.name}</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="checkbox"
                            checked={selectedEvents.has(template.event_code)}
                            onChange={() => toggleEvent(template.event_code)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium">{template.name}</span>
                        </>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'copy' && (
        <div className="space-y-6">
          <p className="text-gray-600">Copy all events from a previous competition as a template.</p>

          <div className="bg-white rounded-lg border p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Competition to Copy From
                </label>
                <select
                  value={selectedCompetition}
                  onChange={e => setSelectedCompetition(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a competition...</option>
                  {competitions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({new Date(c.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {sourceEvents.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Events to Copy ({sourceEvents.length})
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <ul className="text-sm text-gray-600 space-y-1">
                      {sourceEvents.map((e, i) => (
                        <li key={i}>{e.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <button
                onClick={handleCopyEvents}
                disabled={isLoading || !selectedCompetition}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copy All Events
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
