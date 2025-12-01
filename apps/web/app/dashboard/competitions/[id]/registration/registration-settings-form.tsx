'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertRegistrationSettings, type RegistrationSettings } from '@/lib/actions/registrations';
import { Save, Loader2, Info } from 'lucide-react';

type RegistrationMode = 'disabled' | 'organizer_only' | 'self_service' | 'hybrid';

interface RegistrationSettingsFormProps {
  competitionId: string;
  initialSettings: RegistrationSettings | null;
  competitionDate: string;
}

export function RegistrationSettingsForm({
  competitionId,
  initialSettings,
  competitionDate,
}: RegistrationSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [mode, setMode] = useState<RegistrationMode>(initialSettings?.mode || 'disabled');
  const [registrationOpensAt, setRegistrationOpensAt] = useState(
    initialSettings?.registration_opens_at
      ? new Date(initialSettings.registration_opens_at).toISOString().slice(0, 16)
      : ''
  );
  const [registrationClosesAt, setRegistrationClosesAt] = useState(
    initialSettings?.registration_closes_at
      ? new Date(initialSettings.registration_closes_at).toISOString().slice(0, 16)
      : ''
  );
  const [requireLicenseNumber, setRequireLicenseNumber] = useState(initialSettings?.require_license_number || false);
  const [requirePb, setRequirePb] = useState(initialSettings?.require_pb || false);
  const [requireSb, setRequireSb] = useState(initialSettings?.require_sb || false);
  const [requireDateOfBirth, setRequireDateOfBirth] = useState(initialSettings?.require_date_of_birth ?? true);
  const [requireClub, setRequireClub] = useState(initialSettings?.require_club || false);
  const [maxEntriesPerAthlete, setMaxEntriesPerAthlete] = useState(initialSettings?.max_entries_per_athlete || 3);
  const [welcomeMessage, setWelcomeMessage] = useState(initialSettings?.welcome_message || '');
  const [termsAndConditions, setTermsAndConditions] = useState(initialSettings?.terms_and_conditions || '');
  const [contactEmail, setContactEmail] = useState(initialSettings?.contact_email || '');
  const [autoApprove, setAutoApprove] = useState(initialSettings?.auto_approve || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await upsertRegistrationSettings({
        competition_id: competitionId,
        mode,
        registration_opens_at: registrationOpensAt ? new Date(registrationOpensAt).toISOString() : null,
        registration_closes_at: registrationClosesAt ? new Date(registrationClosesAt).toISOString() : null,
        require_license_number: requireLicenseNumber,
        require_pb: requirePb,
        require_sb: requireSb,
        require_date_of_birth: requireDateOfBirth,
        require_club: requireClub,
        max_entries_per_athlete: maxEntriesPerAthlete,
        welcome_message: welcomeMessage || null,
        terms_and_conditions: termsAndConditions || null,
        contact_email: contactEmail || null,
        auto_approve: autoApprove,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Registration Mode */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className={`relative flex cursor-pointer rounded-lg border p-4 ${mode === 'disabled' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input
              type="radio"
              name="mode"
              value="disabled"
              checked={mode === 'disabled'}
              onChange={() => setMode('disabled')}
              className="sr-only"
            />
            <div>
              <span className="block text-sm font-medium text-gray-900">Disabled</span>
              <span className="block text-sm text-gray-500 mt-1">No online registration</span>
            </div>
          </label>
          <label className={`relative flex cursor-pointer rounded-lg border p-4 ${mode === 'organizer_only' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input
              type="radio"
              name="mode"
              value="organizer_only"
              checked={mode === 'organizer_only'}
              onChange={() => setMode('organizer_only')}
              className="sr-only"
            />
            <div>
              <span className="block text-sm font-medium text-gray-900">Organizer Only</span>
              <span className="block text-sm text-gray-500 mt-1">Only you can add entries</span>
            </div>
          </label>
          <label className={`relative flex cursor-pointer rounded-lg border p-4 ${mode === 'self_service' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input
              type="radio"
              name="mode"
              value="self_service"
              checked={mode === 'self_service'}
              onChange={() => setMode('self_service')}
              className="sr-only"
            />
            <div>
              <span className="block text-sm font-medium text-gray-900">Self-Service</span>
              <span className="block text-sm text-gray-500 mt-1">Athletes register online</span>
            </div>
          </label>
          <label className={`relative flex cursor-pointer rounded-lg border p-4 ${mode === 'hybrid' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input
              type="radio"
              name="mode"
              value="hybrid"
              checked={mode === 'hybrid'}
              onChange={() => setMode('hybrid')}
              className="sr-only"
            />
            <div>
              <span className="block text-sm font-medium text-gray-900">Hybrid</span>
              <span className="block text-sm text-gray-500 mt-1">Both online and manual</span>
            </div>
          </label>
        </div>
      </div>

      {mode !== 'disabled' && mode !== 'organizer_only' && (
        <>
          {/* Deadlines */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Opens
                </label>
                <input
                  type="datetime-local"
                  value={registrationOpensAt}
                  onChange={(e) => setRegistrationOpensAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">Leave empty to open immediately</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Closes
                </label>
                <input
                  type="datetime-local"
                  value={registrationClosesAt}
                  onChange={(e) => setRegistrationClosesAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">Competition date: {new Date(competitionDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Required Fields */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Fields</h3>
            <p className="text-sm text-gray-600 mb-4">Select which fields athletes must provide when registering</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requireDateOfBirth}
                  onChange={(e) => setRequireDateOfBirth(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Date of Birth</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requireClub}
                  onChange={(e) => setRequireClub(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Club Name</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requireLicenseNumber}
                  onChange={(e) => setRequireLicenseNumber(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">License Number</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requirePb}
                  onChange={(e) => setRequirePb(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Personal Best (PB)</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requireSb}
                  onChange={(e) => setRequireSb(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Season Best (SB)</span>
              </label>
            </div>
          </div>

          {/* Limits */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Entry Limits</h3>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Events per Athlete
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxEntriesPerAthlete}
                onChange={(e) => setMaxEntriesPerAthlete(parseInt(e.target.value) || 3)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">How many events can one athlete register for?</p>
            </div>
          </div>

          {/* Approval Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Settings</h3>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Auto-approve registrations</span>
                <p className="text-sm text-gray-500">
                  Registrations will be automatically approved and entries created.
                  Disable this to manually review each registration.
                </p>
              </div>
            </label>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Page Content</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Welcome to our competition! Please complete the form below to register..."
                />
                <p className="mt-1 text-sm text-gray-500">Shown at the top of the registration page</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms and Conditions
                </label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="By registering, you agree to..."
                />
                <p className="mt-1 text-sm text-gray-500">Athletes must accept these terms to register</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contact@example.com"
                />
                <p className="mt-1 text-sm text-gray-500">Displayed on the registration page for questions</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        {success && (
          <p className="text-green-600 text-sm">Settings saved successfully!</p>
        )}
      </div>
    </form>
  );
}
