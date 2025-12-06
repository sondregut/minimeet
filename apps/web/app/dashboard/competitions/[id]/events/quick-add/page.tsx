'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, CheckCircle2, Users, Home, Sun, Route } from 'lucide-react';
import {
  EVENTS,
  EVENT_AVAILABILITY,
  AGE_CLASSES,
  isEventAvailableForVenue,
  type AgeClass,
  type Gender,
  type VenueType,
} from '@/lib/constants/norwegian-athletics';
import { bulkCreateEvents, getEventsByCompetition } from '@/lib/actions/events';
import { getCompetition } from '@/lib/actions/competitions';

type Step = 'gender' | 'age' | 'events';

// Group events by type for display
const EVENT_GROUPS = {
  sprint: { name: 'Sprint', events: ['40m', '60m', '80m', '100m', '150m', '200m', '300m', '400m_strek', '400m'] },
  middleDistance: { name: 'Mellomdistanse', events: ['600m', '800m', '1000m', '1500m', '1609m'] },
  longDistance: { name: 'Langdistanse', events: ['2000m', '3000m', '3218m', '5000m', '10000m'] },
  hurdles: { name: 'Hekk', events: ['60mH', '80mH', '100mH', '110mH', '200mH', '300mH', '400mH'] },
  steeplechase: { name: 'Hinder', events: ['200_400mH_20cm', '800mH_50cm', '1500mSC', '2000mSC', '3000mSC'] },
  raceWalk: { name: 'Kappgang', events: ['kappgang_400_800m', 'kappgang_600_1000m', 'kappgang_1000m', 'kappgang_1500m', 'kappgang_2000m', 'kappgang_3000m', 'kappgang_5000m', 'kappgang_10000m'] },
  jumps: { name: 'Hopp', events: ['hoyde', 'hoyde_uten', 'lengde', 'lengde_uten', 'stav', 'tresteg'] },
  throws: { name: 'Kast', events: ['kule', 'diskos', 'slegge', 'spyd', 'liten_ball', 'slengball'] },
  combined: { name: 'Mangekamp', events: ['mangekamp', 'trekamp'] },
  relay: { name: 'Stafett', events: ['stafett_40_600m', '4x100m', '4x200m', '4x400m'] },
};

export default function QuickAddEventsPage() {
  const params = useParams();
  const competitionId = params.id as string;
  const router = useRouter();

  const [step, setStep] = useState<Step>('gender');
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [selectedAgeClasses, setSelectedAgeClasses] = useState<Set<AgeClass>>(new Set());
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [existingEvents, setExistingEvents] = useState<Set<string>>(new Set());
  const [allEvents, setAllEvents] = useState<Array<{
    id: string;
    event_code: string;
    name: string;
    gender: string;
    age_group: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [competition, setCompetition] = useState<{ settings?: { venue_type?: string } } | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load competition and existing events
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [comp, events] = await Promise.all([
        getCompetition(competitionId),
        getEventsByCompetition(competitionId),
      ]);
      setCompetition(comp);
      setAllEvents(events);

      // Track existing event combinations
      const existing = new Set<string>();
      events.forEach(e => {
        existing.add(`${e.event_code}-${e.gender}-${e.age_group}`);
      });
      setExistingEvents(existing);
      setIsLoading(false);
    }
    load();
  }, [competitionId]);

  // Get venue type from competition settings
  const venueType: VenueType = (competition?.settings?.venue_type as VenueType) || 'outdoor';

  // Get venue type label in Norwegian
  const getVenueTypeLabel = (type: VenueType) => {
    switch (type) {
      case 'indoor': return 'Innendørs';
      case 'outdoor': return 'Utendørs';
      case 'road': return 'Utenfor bane';
      default: return 'Utendørs';
    }
  };

  // Get venue type icon
  const VenueIcon = venueType === 'indoor' ? Home : venueType === 'road' ? Route : Sun;

  // Check if an event is available for a specific age class
  const isEventAvailableForAge = (eventCode: string, ageClass: AgeClass): boolean => {
    if (!selectedGender) return false;
    const availability = EVENT_AVAILABILITY[eventCode];
    if (!availability) return false;
    const ageClasses = selectedGender === 'male' ? availability.male : availability.female;
    return ageClasses.includes(ageClass) && isEventAvailableForVenue(eventCode, venueType);
  };

  // Get available events for ANY of the selected age classes
  const getAvailableEvents = () => {
    if (!selectedGender || selectedAgeClasses.size === 0) return [];

    const available: string[] = [];
    Object.entries(EVENT_AVAILABILITY).forEach(([eventCode, availability]) => {
      const ageClasses = selectedGender === 'male' ? availability.male : availability.female;
      // Check if event is available for at least one selected age class
      const isAvailableForAny = Array.from(selectedAgeClasses).some(
        selectedAge => ageClasses.includes(selectedAge) && isEventAvailableForVenue(eventCode, venueType)
      );
      if (isAvailableForAny) {
        available.push(eventCode);
      }
    });
    return available;
  };

  // Check if event already exists for a specific age class
  const isEventExistingForAge = (eventCode: string, ageClass: AgeClass) => {
    if (!selectedGender) return false;
    const genderCode = selectedGender === 'male' ? 'M' : 'W';
    const ageGroupName = AGE_CLASSES.find(a => a.code === ageClass)?.name || ageClass;
    return existingEvents.has(`${eventCode}-${genderCode}-${ageGroupName}`);
  };

  // Check if event is fully existing (exists for all selected age classes where it's available)
  const isEventFullyExisting = (eventCode: string) => {
    if (!selectedGender) return false;
    const availableAges = Array.from(selectedAgeClasses).filter(age => isEventAvailableForAge(eventCode, age));
    return availableAges.length > 0 && availableAges.every(age => isEventExistingForAge(eventCode, age));
  };

  // Check if event is partially existing
  const isEventPartiallyExisting = (eventCode: string) => {
    if (!selectedGender) return false;
    const availableAges = Array.from(selectedAgeClasses).filter(age => isEventAvailableForAge(eventCode, age));
    return availableAges.some(age => isEventExistingForAge(eventCode, age)) && !isEventFullyExisting(eventCode);
  };

  // Get count of how many age classes this event will be created for
  const getEventCreationCount = (eventCode: string) => {
    return Array.from(selectedAgeClasses).filter(
      age => isEventAvailableForAge(eventCode, age) && !isEventExistingForAge(eventCode, age)
    ).length;
  };

  // Toggle age class selection
  const toggleAgeClass = (ageClass: AgeClass) => {
    const newSelected = new Set(selectedAgeClasses);
    if (newSelected.has(ageClass)) {
      newSelected.delete(ageClass);
    } else {
      newSelected.add(ageClass);
    }
    setSelectedAgeClasses(newSelected);
  };

  // Select all age classes
  const selectAllAgeClasses = () => {
    setSelectedAgeClasses(new Set(AGE_CLASSES.map(a => a.code)));
  };

  // Clear all age class selections
  const clearAgeClassSelections = () => {
    setSelectedAgeClasses(new Set());
  };

  // Toggle event selection
  const toggleEvent = (eventCode: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventCode)) {
      newSelected.delete(eventCode);
    } else {
      newSelected.add(eventCode);
    }
    setSelectedEvents(newSelected);
  };

  // Select all events in a group
  const selectAllInGroup = (groupEvents: string[]) => {
    const available = getAvailableEvents();
    const newSelected = new Set(selectedEvents);
    groupEvents.forEach(code => {
      if (available.includes(code) && !isEventFullyExisting(code)) {
        newSelected.add(code);
      }
    });
    setSelectedEvents(newSelected);
  };

  // Map event types to database event types
  const mapEventType = (type: string): 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'combined' | 'relay' | 'road' => {
    switch (type) {
      case 'sprint':
      case 'middle_distance':
      case 'long_distance':
      case 'hurdles':
      case 'steeplechase':
      case 'race_walk':
        return 'track';
      case 'high_jump':
      case 'pole_vault':
        return 'field_vertical';
      case 'long_jump':
      case 'triple_jump':
        return 'field_horizontal';
      case 'shot_put':
      case 'discus':
      case 'hammer':
      case 'javelin':
      case 'ball_throw':
        return 'throw';
      case 'combined':
        return 'combined';
      case 'relay':
        return 'relay';
      case 'road_race':
        return 'road';
      default:
        return 'track';
    }
  };

  // Calculate total events to be created
  const getTotalEventsToCreate = () => {
    let total = 0;
    selectedEvents.forEach(eventCode => {
      total += getEventCreationCount(eventCode);
    });
    return total;
  };

  // Reload existing events after saving
  const reloadExistingEvents = async () => {
    const events = await getEventsByCompetition(competitionId);
    setAllEvents(events);
    const existing = new Set<string>();
    events.forEach(e => {
      existing.add(`${e.event_code}-${e.gender}-${e.age_group}`);
    });
    setExistingEvents(existing);
  };

  // Group events by event name for summary display
  const getGroupedEvents = () => {
    const grouped: Record<string, { name: string; entries: Array<{ gender: string; age_group: string }> }> = {};

    allEvents.forEach(event => {
      if (!grouped[event.event_code]) {
        grouped[event.event_code] = {
          name: event.name,
          entries: [],
        };
      }
      grouped[event.event_code].entries.push({
        gender: event.gender,
        age_group: event.age_group,
      });
    });

    // Sort entries within each event
    Object.values(grouped).forEach(group => {
      group.entries.sort((a, b) => {
        if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
        return a.age_group.localeCompare(b.age_group);
      });
    });

    return grouped;
  };

  // Save selected events
  const handleSave = async () => {
    if (!selectedGender || selectedAgeClasses.size === 0 || selectedEvents.size === 0) return;

    setIsSaving(true);
    const genderCode = selectedGender === 'male' ? 'M' : 'W';

    // Create events for each combination of age class and event
    const eventsToCreate: Array<{
      event_code: string;
      name: string;
      gender: 'M' | 'W' | 'X';
      age_group: string;
      event_type: 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'combined' | 'relay' | 'road';
    }> = [];

    selectedEvents.forEach(eventCode => {
      const eventDef = EVENTS.find(e => e.code === eventCode);

      selectedAgeClasses.forEach(ageClass => {
        // Only create if event is available for this age class and doesn't already exist
        if (isEventAvailableForAge(eventCode, ageClass) && !isEventExistingForAge(eventCode, ageClass)) {
          const ageGroupInfo = AGE_CLASSES.find(a => a.code === ageClass);
          eventsToCreate.push({
            event_code: eventCode,
            name: eventDef?.name || eventCode,
            gender: genderCode as 'M' | 'W' | 'X',
            age_group: ageGroupInfo?.name || ageClass,
            event_type: mapEventType(eventDef?.type || 'sprint'),
          });
        }
      });
    });

    if (eventsToCreate.length === 0) {
      setIsSaving(false);
      return;
    }

    const result = await bulkCreateEvents({
      competition_id: competitionId,
      events: eventsToCreate,
    });
    setIsSaving(false);

    if (result.success) {
      // Show success message and reload existing events
      setSavedCount(eventsToCreate.length);
      setShowSuccess(true);
      setSelectedEvents(new Set());
      await reloadExistingEvents();

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  // Get age class display name
  const getAgeClassName = (code: AgeClass) => {
    return AGE_CLASSES.find(a => a.code === code)?.name || code;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til stevnet
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Legg til øvelser</h1>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            venueType === 'indoor' ? 'bg-purple-100 text-purple-700' :
            venueType === 'road' ? 'bg-orange-100 text-orange-700' :
            'bg-green-100 text-green-700'
          }`}>
            <VenueIcon className="w-4 h-4" />
            {getVenueTypeLabel(venueType)}
          </div>
        </div>
        <p className="text-gray-500 mt-1">
          Viser kun øvelser som er gyldige for {getVenueTypeLabel(venueType).toLowerCase()} stevner
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step === 'gender' ? 'text-blue-600' : selectedGender ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'gender' ? 'bg-blue-600 text-white' : selectedGender ? 'bg-green-500 text-white' : 'bg-gray-200'
          }`}>
            {selectedGender ? <Check className="w-5 h-5" /> : '1'}
          </div>
          <span className="font-medium">Kjønn</span>
        </div>
        <div className="flex-1 h-1 bg-gray-200 rounded">
          <div className={`h-full rounded transition-all ${selectedGender ? 'bg-green-500 w-full' : 'w-0'}`} />
        </div>
        <div className={`flex items-center gap-2 ${step === 'age' ? 'text-blue-600' : selectedAgeClasses.size > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'age' ? 'bg-blue-600 text-white' : selectedAgeClasses.size > 0 ? 'bg-green-500 text-white' : 'bg-gray-200'
          }`}>
            {selectedAgeClasses.size > 0 ? <Check className="w-5 h-5" /> : '2'}
          </div>
          <span className="font-medium">Aldersklasser</span>
        </div>
        <div className="flex-1 h-1 bg-gray-200 rounded">
          <div className={`h-full rounded transition-all ${selectedAgeClasses.size > 0 ? 'bg-green-500 w-full' : 'w-0'}`} />
        </div>
        <div className={`flex items-center gap-2 ${step === 'events' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'events' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
          <span className="font-medium">Øvelser</span>
        </div>
      </div>

      {/* Step 1: Select Gender */}
      {step === 'gender' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Velg kjønn</h2>
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            <button
              onClick={() => {
                setSelectedGender('male');
                setStep('age');
              }}
              className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-10 h-10 text-blue-600" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Gutter</span>
            </button>
            <button
              onClick={() => {
                setSelectedGender('female');
                setStep('age');
              }}
              className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-gray-200 hover:border-pink-500 hover:bg-pink-50 transition-all"
            >
              <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center">
                <Users className="w-10 h-10 text-pink-600" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Jenter</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Age Classes (Multi-select) */}
      {step === 'age' && selectedGender && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Velg aldersklasser for {selectedGender === 'male' ? 'gutter' : 'jenter'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Du kan velge flere klasser samtidig</p>
            </div>
            <button
              onClick={() => {
                setStep('gender');
                setSelectedGender(null);
                setSelectedAgeClasses(new Set());
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Endre kjønn
            </button>
          </div>

          {/* Quick select buttons */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={selectAllAgeClasses}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Velg alle
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearAgeClassSelections}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Fjern alle
            </button>
            {selectedAgeClasses.size > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-600">
                  {selectedAgeClasses.size} valgt
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {AGE_CLASSES.map((ageClass) => {
              const isSelected = selectedAgeClasses.has(ageClass.code);
              return (
                <button
                  key={ageClass.code}
                  onClick={() => toggleAgeClass(ageClass.code)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-semibold block ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {ageClass.name}
                      </span>
                      <span className="text-sm text-gray-500">{ageClass.ageRange}</span>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Continue button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                setSelectedEvents(new Set());
                setStep('events');
              }}
              disabled={selectedAgeClasses.size === 0}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Velg øvelser
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Events */}
      {step === 'events' && selectedGender && selectedAgeClasses.size > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">
                  {selectedGender === 'male' ? 'Gutter' : 'Jenter'}
                </span>
                <span className="text-gray-500 ml-2">
                  ({selectedAgeClasses.size} klasse{selectedAgeClasses.size !== 1 ? 'r' : ''}: {
                    Array.from(selectedAgeClasses).slice(0, 3).map(code => getAgeClassName(code)).join(', ')
                  }{selectedAgeClasses.size > 3 ? ` +${selectedAgeClasses.size - 3} til` : ''})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setStep('age');
                    setSelectedEvents(new Set());
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Endre klasser
                </button>
              </div>
            </div>
          </div>

          {/* Event Groups */}
          <div className="space-y-4">
            {Object.entries(EVENT_GROUPS).map(([groupKey, group]) => {
              const availableEvents = getAvailableEvents();
              const groupAvailable = group.events.filter(code => availableEvents.includes(code));

              if (groupAvailable.length === 0) return null;

              return (
                <div key={groupKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <button
                      onClick={() => selectAllInGroup(groupAvailable)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Velg alle
                    </button>
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {groupAvailable.map(eventCode => {
                      const eventDef = EVENTS.find(e => e.code === eventCode);
                      const isFullyExisting = isEventFullyExisting(eventCode);
                      const isPartiallyExisting = isEventPartiallyExisting(eventCode);
                      const isSelected = selectedEvents.has(eventCode);
                      const creationCount = getEventCreationCount(eventCode);

                      return (
                        <button
                          key={eventCode}
                          onClick={() => !isFullyExisting && toggleEvent(eventCode)}
                          disabled={isFullyExisting}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isFullyExisting
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium block">{eventDef?.name || eventCode}</span>
                              {isSelected && creationCount > 0 && (
                                <span className="text-xs text-blue-600">
                                  {creationCount} klasse{creationCount !== 1 ? 'r' : ''}
                                </span>
                              )}
                              {isPartiallyExisting && !isSelected && (
                                <span className="text-xs text-amber-600">
                                  Delvis lagt til
                                </span>
                              )}
                            </div>
                            {isFullyExisting && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {isSelected && !isFullyExisting && <Check className="w-4 h-4" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 font-medium">
                {savedCount} øvelse{savedCount !== 1 ? 'r' : ''} ble lagt til! Du kan fortsette å legge til flere.
              </span>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
            <span className="text-gray-600">
              {selectedEvents.size} øvelse{selectedEvents.size !== 1 ? 'r' : ''} valgt
              {getTotalEventsToCreate() > 0 && (
                <span className="text-blue-600 ml-1">
                  ({getTotalEventsToCreate()} vil bli opprettet)
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/competitions/${competitionId}`}
                className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900"
              >
                Ferdig
              </Link>
              <button
                onClick={handleSave}
                disabled={selectedEvents.size === 0 || getTotalEventsToCreate() === 0 || isSaving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Lagrer...
                  </>
                ) : (
                  <>
                    Lagre og fortsett
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary of added events */}
      {allEvents.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Øvelser i stevnet ({allEvents.length})
              </h3>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(getGroupedEvents()).map(([eventCode, group]) => (
                <div key={eventCode} className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-gray-900 mb-2">{group.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.entries.map((entry, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          entry.gender === 'M'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {entry.gender === 'M' ? 'G' : 'J'} {entry.age_group}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
