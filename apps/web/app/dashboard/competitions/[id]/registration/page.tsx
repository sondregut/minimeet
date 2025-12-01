import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompetition } from '@/lib/actions/competitions';
import { getRegistrationSettings, getRegistrations } from '@/lib/actions/registrations';
import { ArrowLeft, Settings, Users, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { RegistrationSettingsForm } from './registration-settings-form';
import { RegistrationInbox } from './registration-inbox';

export default async function RegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'settings' } = await searchParams;

  const competition = await getCompetition(id);
  if (!competition) {
    notFound();
  }

  const settings = await getRegistrationSettings(id);
  const registrations = await getRegistrations(id);

  // Calculate stats
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    waitlist: registrations.filter(r => r.status === 'waitlist').length,
  };

  // Build public registration URL
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/register/${id}`
    : `/register/${id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competition
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registration Management</h1>
            <p className="text-gray-600 mt-1">{competition.name}</p>
          </div>

          {settings?.mode !== 'disabled' && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-sm text-blue-800">Public Registration URL:</span>
              <code className="text-sm font-mono bg-white px-2 py-1 rounded border">/register/{id.slice(0, 8)}...</code>
              <Link
                href={`/register/${id}`}
                target="_blank"
                className="p-1 hover:bg-blue-100 rounded"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4 text-blue-600" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-sm text-gray-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-sm text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.waitlist}</p>
              <p className="text-sm text-gray-500">Waitlist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <Link
            href={`/dashboard/competitions/${id}/registration?tab=settings`}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              tab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </Link>
          <Link
            href={`/dashboard/competitions/${id}/registration?tab=inbox`}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              tab === 'inbox'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Registration Inbox
            {stats.pending > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                {stats.pending}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'settings' ? (
        <RegistrationSettingsForm
          competitionId={id}
          initialSettings={settings}
          competitionDate={competition.date}
        />
      ) : (
        <RegistrationInbox
          competitionId={id}
          registrations={registrations}
        />
      )}
    </div>
  );
}
