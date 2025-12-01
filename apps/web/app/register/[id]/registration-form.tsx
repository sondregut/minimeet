'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitRegistration, type RegistrationSettings } from '@/lib/actions/registrations';
import { Check, Loader2, User, Mail, Phone, Calendar, Trophy, AlertCircle, CheckCircle } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  event_type: string;
  gender: string;
  age_group: string;
  scheduled_time: string | null;
  event_registration_settings?: Array<{
    registration_enabled: boolean;
    max_participants: number | null;
    min_standard: number | null;
    max_standard: number | null;
    min_age: number | null;
    max_age: number | null;
    registration_notes: string | null;
  }> | null;
}

interface RegistrationFormProps {
  competitionId: string;
  events: Event[];
  settings: RegistrationSettings;
  competitionDate: string;
}

interface EventSelection {
  eventId: string;
  pbMark: string;
  sbMark: string;
}

export function RegistrationForm({ competitionId, events, settings, competitionDate }: RegistrationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'M' | 'W' | 'X'>('M');
  const [nationality, setNationality] = useState('NOR');
  const [clubName, setClubName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [athleteMessage, setAthleteMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Event selections
  const [selectedEvents, setSelectedEvents] = useState<EventSelection[]>([]);

  const toggleEvent = (eventId: string) => {
    const exists = selectedEvents.find(e => e.eventId === eventId);
    if (exists) {
      setSelectedEvents(selectedEvents.filter(e => e.eventId !== eventId));
    } else {
      if (selectedEvents.length >= (settings.max_entries_per_athlete || 3)) {
        setError(`You can only register for up to ${settings.max_entries_per_athlete || 3} events`);
        return;
      }
      setSelectedEvents([...selectedEvents, { eventId, pbMark: '', sbMark: '' }]);
    }
    setError(null);
  };

  const updateEventMark = (eventId: string, field: 'pbMark' | 'sbMark', value: string) => {
    setSelectedEvents(selectedEvents.map(e =>
      e.eventId === eventId ? { ...e, [field]: value } : e
    ));
  };

  const isEventSelected = (eventId: string) => selectedEvents.some(e => e.eventId === eventId);

  // Group events by type
  const eventsByType = events.reduce<Record<string, Event[]>>((acc, event) => {
    const type = event.event_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(event);
    return acc;
  }, {});

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      track: 'Track',
      field_vertical: 'Vertical Jumps',
      field_horizontal: 'Horizontal Jumps',
      throw: 'Throws',
      relay: 'Relays',
      combined: 'Combined Events',
      road: 'Road Running',
    };
    return labels[type] || type;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (settings.require_date_of_birth && !dateOfBirth) {
      setError('Date of birth is required');
      return;
    }
    if (settings.require_club && !clubName.trim()) {
      setError('Club name is required');
      return;
    }
    if (settings.require_license_number && !licenseNumber.trim()) {
      setError('License number is required');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Please select at least one event');
      return;
    }
    if (settings.require_pb && selectedEvents.some(e => !e.pbMark)) {
      setError('Personal best is required for all selected events');
      return;
    }
    if (settings.require_sb && selectedEvents.some(e => !e.sbMark)) {
      setError('Season best is required for all selected events');
      return;
    }
    if (settings.terms_and_conditions && !termsAccepted) {
      setError('You must accept the terms and conditions');
      return;
    }

    startTransition(async () => {
      const result = await submitRegistration({
        competition_id: competitionId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        gender,
        nationality,
        club_name: clubName || null,
        license_number: licenseNumber || null,
        athlete_message: athleteMessage || null,
        terms_accepted: termsAccepted,
        events: selectedEvents.map(e => ({
          event_id: e.eventId,
          pb_mark: e.pbMark || null,
          sb_mark: e.sbMark || null,
        })),
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
        <p className="text-gray-600 mb-4">
          {settings.auto_approve
            ? 'Your registration has been approved. You will receive a confirmation email shortly.'
            : 'Your registration is pending approval. You will be notified once it has been reviewed.'}
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
          <h3 className="font-semibold text-gray-900 mb-2">Registration Summary</h3>
          <p className="text-sm text-gray-600">
            <strong>Name:</strong> {firstName} {lastName}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Events:</strong> {selectedEvents.length}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth {settings.require_date_of_birth && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required={settings.require_date_of_birth}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'M' | 'W' | 'X')}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="M">Male</option>
              <option value="W">Female</option>
              <option value="X">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Club {settings.require_club && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              required={settings.require_club}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your athletics club"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Number {settings.require_license_number && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              required={settings.require_license_number}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., NOR12345"
            />
          </div>
        </div>
      </div>

      {/* Event Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Select Events
          <span className="text-sm font-normal text-gray-500">
            (max {settings.max_entries_per_athlete || 3}, selected: {selectedEvents.length})
          </span>
        </h2>

        {Object.entries(eventsByType).map(([type, typeEvents]) => (
          <div key={type} className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {getEventTypeLabel(type)}
            </h3>
            <div className="space-y-2">
              {typeEvents.map((event) => {
                const isSelected = isEventSelected(event.id);
                const eventSettings = event.event_registration_settings?.[0];
                const isDisabled = eventSettings?.registration_enabled === false;

                return (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isDisabled
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isDisabled && toggleEvent(event.id)}
                        disabled={isDisabled}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{event.name}</span>
                          <span className="text-sm text-gray-500">
                            {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} / {event.age_group}
                          </span>
                        </div>
                        {event.scheduled_time && (
                          <p className="text-sm text-gray-500 mt-1">
                            Scheduled: {new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                        {eventSettings?.registration_notes && (
                          <p className="text-sm text-blue-600 mt-1">{eventSettings.registration_notes}</p>
                        )}
                        {isDisabled && (
                          <p className="text-sm text-red-600 mt-1">Registration closed for this event</p>
                        )}

                        {/* PB/SB inputs when selected */}
                        {isSelected && (settings.require_pb || settings.require_sb) && (
                          <div className="flex gap-4 mt-3">
                            {settings.require_pb && (
                              <div className="flex-1">
                                <label className="block text-xs text-gray-600 mb-1">
                                  Personal Best {settings.require_pb && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                  type="text"
                                  value={selectedEvents.find(e => e.eventId === event.id)?.pbMark || ''}
                                  onChange={(e) => updateEventMark(event.id, 'pbMark', e.target.value)}
                                  placeholder="e.g., 10.50 or 2.05"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            )}
                            {settings.require_sb && (
                              <div className="flex-1">
                                <label className="block text-xs text-gray-600 mb-1">
                                  Season Best {settings.require_sb && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                  type="text"
                                  value={selectedEvents.find(e => e.eventId === event.id)?.sbMark || ''}
                                  onChange={(e) => updateEventMark(event.id, 'sbMark', e.target.value)}
                                  placeholder="e.g., 10.75 or 1.95"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Message to Organizer */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
        <textarea
          value={athleteMessage}
          onChange={(e) => setAthleteMessage(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Any additional information for the organizers..."
        />
      </div>

      {/* Terms and Conditions */}
      {settings.terms_and_conditions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms and Conditions</h2>
          <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-40 overflow-y-auto text-sm text-gray-700">
            {settings.terms_and_conditions}
          </div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I have read and accept the terms and conditions <span className="text-red-500">*</span>
            </span>
          </label>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isPending || selectedEvents.length === 0}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Submit Registration
            </>
          )}
        </button>
      </div>
    </form>
  );
}
