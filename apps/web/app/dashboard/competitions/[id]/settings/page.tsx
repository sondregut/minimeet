'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Home, Sun, Route, Timer, ChevronDown, Save, Loader2 } from 'lucide-react';
import { updateCompetition } from '@/lib/actions/competitions';
import { TIMING_SYSTEMS, type TimingSystemId } from '@/lib/constants/timing-systems';

type VenueType = 'indoor' | 'outdoor' | 'road';

interface Competition {
  id: string;
  name: string;
  date: string;
  location: string;
  venue: string | null;
  description: string | null;
  settings: {
    venue_type?: VenueType;
    timing_system?: TimingSystemId;
  } | null;
}

export default function CompetitionSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [venueType, setVenueType] = useState<VenueType>('outdoor');
  const [timingSystem, setTimingSystem] = useState<TimingSystemId>('manual');

  useEffect(() => {
    async function loadCompetition() {
      try {
        const res = await fetch(`/api/competitions/${competitionId}`);
        if (!res.ok) throw new Error('Kunne ikke laste stevne');
        const data = await res.json();
        setCompetition(data);

        // Populate form
        setName(data.name || '');
        setDate(data.date || '');
        setLocation(data.location || '');
        setVenue(data.venue || '');
        setDescription(data.description || '');
        setVenueType(data.settings?.venue_type || 'outdoor');
        setTimingSystem(data.settings?.timing_system || 'manual');
      } catch (err) {
        setError('Kunne ikke laste stevne');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadCompetition();
  }, [competitionId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.set('name', name);
    formData.set('date', date);
    formData.set('location', location);
    formData.set('venue', venue);
    formData.set('description', description);
    formData.set('venue_type', venueType);
    formData.set('timing_system', timingSystem);

    const result = await updateCompetition(competitionId, formData);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="p-6 text-center text-red-600">
        Stevne ikke funnet
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til stevnet
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Stevneinnstillinger</h1>
        <p className="text-gray-600 mt-1">
          Rediger grunnleggende informasjon om stevnet
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm">
            Endringene er lagret!
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Competition Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Stevnenavn <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Venue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type stevne <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setVenueType('indoor')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  venueType === 'indoor'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Home className="w-8 h-8" />
                <span className="font-medium">Innendørs</span>
                <span className="text-xs text-center">Friidrettshall</span>
              </button>
              <button
                type="button"
                onClick={() => setVenueType('outdoor')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  venueType === 'outdoor'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Sun className="w-8 h-8" />
                <span className="font-medium">Utendørs</span>
                <span className="text-xs text-center">Friidrettsbane</span>
              </button>
              <button
                type="button"
                onClick={() => setVenueType('road')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  venueType === 'road'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Route className="w-8 h-8" />
                <span className="font-medium">Utenfor bane</span>
                <span className="text-xs text-center">Gateløp, terreng</span>
              </button>
            </div>
          </div>

          {/* Timing System */}
          <div>
            <label htmlFor="timing_system" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Tidtakeranlegg
              </span>
            </label>
            <div className="relative">
              <select
                id="timing_system"
                value={timingSystem}
                onChange={(e) => setTimingSystem(e.target.value as TimingSystemId)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white pr-10"
              >
                {TIMING_SYSTEMS.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              {TIMING_SYSTEMS.find(s => s.id === timingSystem)?.description}
            </p>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Dato <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Sted <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              id="location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Venue */}
          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
              Arena/Anlegg
            </label>
            <input
              id="venue"
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder={
                venueType === 'indoor' ? 'f.eks. Bærum Idrettspark' :
                venueType === 'outdoor' ? 'f.eks. Bislett Stadion' :
                'f.eks. Sentrum'
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Beskrivelse
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Legg til detaljer om stevnet..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/dashboard/competitions/${competitionId}`}
            className="px-5 py-3 text-gray-700 font-medium hover:text-gray-900 transition-colors"
          >
            Avbryt
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Lagrer...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lagre endringer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
