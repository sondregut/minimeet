import { notFound } from 'next/navigation';
import { getPublicCompetition } from '@/lib/actions/public';
import { getRegistrationSettings, getEventsForRegistration } from '@/lib/actions/registrations';
import { Calendar, MapPin, Clock, Mail, AlertTriangle } from 'lucide-react';
import { RegistrationForm } from './registration-form';

export default async function PublicRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get competition (public access)
  const competition = await getPublicCompetition(id);
  if (!competition) {
    notFound();
  }

  // Get registration settings
  const settings = await getRegistrationSettings(id);

  // Check if registration is enabled
  if (!settings || settings.mode === 'disabled' || settings.mode === 'organizer_only') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Not Available</h1>
            <p className="text-gray-600">
              Online registration is not currently available for this competition.
              Please contact the organizer for more information.
            </p>
            {settings?.contact_email && (
              <a
                href={`mailto:${settings.contact_email}`}
                className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-800"
              >
                <Mail className="w-4 h-4" />
                {settings.contact_email}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Check registration period
  const now = new Date();
  const opensAt = settings.registration_opens_at ? new Date(settings.registration_opens_at) : null;
  const closesAt = settings.registration_closes_at ? new Date(settings.registration_closes_at) : null;

  if (opensAt && now < opensAt) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Opens Soon</h1>
            <p className="text-gray-600">
              Registration for <span className="font-semibold">{competition.name}</span> will open on:
            </p>
            <p className="text-xl font-semibold text-blue-600 mt-2">
              {opensAt.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (closesAt && now > closesAt) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Closed</h1>
            <p className="text-gray-600">
              Registration for <span className="font-semibold">{competition.name}</span> has closed.
            </p>
            <p className="text-gray-500 mt-2">
              Deadline was: {closesAt.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            {settings.contact_email && (
              <p className="mt-4 text-sm text-gray-600">
                For late registration inquiries, contact:{' '}
                <a href={`mailto:${settings.contact_email}`} className="text-blue-600 hover:text-blue-800">
                  {settings.contact_email}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Get available events
  const events = await getEventsForRegistration(id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Competition Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{competition.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(competition.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {competition.location}
              {competition.venue && ` - ${competition.venue}`}
            </span>
          </div>
          {settings.welcome_message && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-blue-800">
              {settings.welcome_message}
            </div>
          )}
          {closesAt && (
            <div className="mt-4 flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Registration closes: {closesAt.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <RegistrationForm
          competitionId={id}
          events={events}
          settings={settings}
          competitionDate={competition.date}
        />

        {/* Contact Info */}
        {settings.contact_email && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Questions? Contact us at{' '}
            <a href={`mailto:${settings.contact_email}`} className="text-blue-600 hover:text-blue-800">
              {settings.contact_email}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
