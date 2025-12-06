'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, Clock, ChevronRight, X, Timer, Target, Zap, Building2 } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  status: string;
  gender: string;
  age_group: string;
  event_type: string;
  scheduled_time?: string;
  entry_count?: number;
  round?: string;
  clubs?: string[];
}

interface EventFiltersProps {
  events: Event[];
  ageGroups: string[];
  eventTypes: string[];
  clubs: string[];
  competitionId: string;
}

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'scheduled';

// Helper functions moved into client component
function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'in_progress':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'checkin':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'scheduled':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'completed':
      return 'Offisiell';
    case 'in_progress':
      return 'Pågår';
    case 'checkin':
      return 'Innsjekk';
    case 'scheduled':
    default:
      return 'Planlagt';
  }
}

function getGenderText(gender: string) {
  switch (gender) {
    case 'M':
      return 'Menn';
    case 'W':
      return 'Kvinner';
    case 'X':
      return 'Blandet';
    default:
      return gender;
  }
}

function getEventTypeText(type: string) {
  switch (type) {
    case 'track':
      return 'Løp';
    case 'relay':
      return 'Stafett';
    case 'field_vertical':
      return 'Hopp (vertikal)';
    case 'field_horizontal':
      return 'Hopp/Kast';
    default:
      return type;
  }
}

export default function EventFilters({
  events,
  ageGroups,
  eventTypes,
  clubs,
  competitionId,
}: EventFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.name.toLowerCase().includes(query) ||
          event.age_group?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'scheduled' && event.status !== 'scheduled' && event.status !== 'checkin') {
          return false;
        } else if (statusFilter !== 'scheduled' && event.status !== statusFilter) {
          return false;
        }
      }

      // Gender filter
      if (genderFilter !== 'all' && event.gender !== genderFilter) {
        return false;
      }

      // Age group filter
      if (ageGroupFilter !== 'all' && event.age_group !== ageGroupFilter) {
        return false;
      }

      // Event type filter
      if (eventTypeFilter !== 'all' && event.event_type !== eventTypeFilter) {
        return false;
      }

      // Club filter
      if (clubFilter !== 'all') {
        if (!event.clubs || !event.clubs.includes(clubFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [events, searchQuery, statusFilter, genderFilter, ageGroupFilter, eventTypeFilter, clubFilter]);

  // Group filtered events by status for display
  const liveEvents = filteredEvents.filter(e => e.status === 'in_progress');
  const completedEvents = filteredEvents.filter(e => e.status === 'completed');
  const upcomingEvents = filteredEvents.filter(e => e.status === 'scheduled' || e.status === 'checkin');

  const hasActiveFilters = statusFilter !== 'all' || genderFilter !== 'all' || ageGroupFilter !== 'all' || eventTypeFilter !== 'all' || clubFilter !== 'all' || searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setGenderFilter('all');
    setAgeGroupFilter('all');
    setEventTypeFilter('all');
    setClubFilter('all');
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'track':
      case 'relay':
        return <Timer className="w-4 h-4" />;
      case 'field_vertical':
        return <Target className="w-4 h-4" />;
      case 'field_horizontal':
        return <Zap className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Søk etter øvelse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filter</span>
          {hasActiveFilters && (
            <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5">
              Aktiv
            </span>
          )}
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Alle</option>
                <option value="in_progress">Pågår</option>
                <option value="completed">Offisielle</option>
                <option value="scheduled">Kommende</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Kjønn</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Alle</option>
                <option value="M">Menn</option>
                <option value="W">Kvinner</option>
                <option value="X">Blandet</option>
              </select>
            </div>

            {/* Age Group Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Klasse</label>
              <select
                value={ageGroupFilter}
                onChange={(e) => setAgeGroupFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Alle</option>
                {ageGroups.map((ag) => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Øvelsestype</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Alle</option>
                {eventTypes.map((et) => (
                  <option key={et} value={et}>{getEventTypeText(et)}</option>
                ))}
              </select>
            </div>

            {/* Club Filter */}
            {clubs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Klubb
                </label>
                <select
                  value={clubFilter}
                  onChange={(e) => setClubFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Alle klubber</option>
                  {clubs.map((club) => (
                    <option key={club} value={club}>{club}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                {filteredEvents.length} av {events.length} øvelser
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Nullstill filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Alle ({events.length})
        </button>
        {events.some(e => e.status === 'in_progress') && (
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              statusFilter === 'in_progress'
                ? 'bg-red-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
            Pågår ({events.filter(e => e.status === 'in_progress').length})
          </button>
        )}
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'completed'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Offisielle ({events.filter(e => e.status === 'completed').length})
        </button>
        <button
          onClick={() => setStatusFilter('scheduled')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'scheduled'
              ? 'bg-slate-700 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Kommende ({events.filter(e => e.status === 'scheduled' || e.status === 'checkin').length})
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-8">
        {/* Live Events */}
        {liveEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              Pågår nå
            </h2>
            <div className="grid gap-3">
              {liveEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  competitionId={competitionId}
                  getEventTypeIcon={getEventTypeIcon}
                  isLive
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed Events */}
        {completedEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Offisielle resultater</h2>
            <div className="grid gap-3">
              {completedEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  competitionId={competitionId}
                  getEventTypeIcon={getEventTypeIcon}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Kommende øvelser
            </h2>
            <div className="grid gap-3">
              {upcomingEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  competitionId={competitionId}
                  getEventTypeIcon={getEventTypeIcon}
                />
              ))}
            </div>
          </section>
        )}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Ingen øvelser funnet</h3>
            <p className="text-slate-500 mb-4">
              Prøv å endre søket eller filterne dine
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Nullstill alle filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  competitionId: string;
  getEventTypeIcon: (type: string) => React.ReactNode;
  isLive?: boolean;
}

function EventCard({
  event,
  competitionId,
  getEventTypeIcon,
  isLive,
}: EventCardProps) {
  return (
    <Link
      href={`/results/${competitionId}/${event.id}`}
      className={`group bg-white rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-md ${
        isLive
          ? 'border-2 border-red-200 hover:border-red-300'
          : 'border border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Event Type Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isLive
            ? 'bg-red-50 text-red-600'
            : event.status === 'completed'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-slate-50 text-slate-500'
        }`}>
          {getEventTypeIcon(event.event_type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(event.status)}`}>
              {getStatusText(event.status)}
            </span>
            <span className="text-sm text-slate-500">
              {getGenderText(event.gender)} &bull; {event.age_group}
            </span>
            {event.round && event.round !== 'final' && (
              <span className="text-sm text-slate-400">
                &bull; {event.round === 'heats' ? 'Innledende' : event.round === 'semi' ? 'Semi' : event.round}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
            {event.name}
          </h3>
          {event.scheduled_time && (
            <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(event.scheduled_time).toLocaleTimeString('nb-NO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {event.entry_count !== undefined && event.entry_count > 0 && (
          <span className="text-sm text-slate-500 hidden sm:block">
            {event.entry_count} deltager{event.entry_count !== 1 ? 'e' : ''}
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
