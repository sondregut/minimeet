import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompetition } from '@/lib/actions/competitions';
import { getRecordSettings, getRecordBreaks, getCompetitionRecordsSummary } from '@/lib/actions/records';
import { ArrowLeft, Settings, Trophy, Star, Award, Medal } from 'lucide-react';
import { RecordSettingsForm } from './record-settings-form';
import { RecordBreaksList } from './record-breaks-list';
import { RecordDefinitionsManager } from './record-definitions-manager';

export default async function RecordsPage({
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

  const settingsResult = await getRecordSettings(id);
  const settings = settingsResult.data;

  const summaryResult = await getCompetitionRecordsSummary(id);
  const summary = summaryResult.data;

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
            <h1 className="text-2xl font-bold text-gray-900">Records Management</h1>
            <p className="text-gray-600 mt-1">{competition.name}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalRecords || 0}</p>
              <p className="text-sm text-gray-500">Total Records</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.byType?.MR || 0}</p>
              <p className="text-sm text-gray-500">Meeting Records</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.byType?.CR || 0}</p>
              <p className="text-sm text-gray-500">Championship Records</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Medal className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{(summary?.byType?.PB || 0) + (summary?.byType?.SB || 0)}</p>
              <p className="text-sm text-gray-500">Personal/Season Bests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <Link
            href={`/dashboard/competitions/${id}/records?tab=settings`}
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
            href={`/dashboard/competitions/${id}/records?tab=definitions`}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              tab === 'definitions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Records to Beat
          </Link>
          <Link
            href={`/dashboard/competitions/${id}/records?tab=breaks`}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              tab === 'breaks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            Records Broken
            {(summary?.totalRecords || 0) > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                {summary?.totalRecords}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'settings' && (
        <RecordSettingsForm
          competitionId={id}
          initialSettings={settings || null}
        />
      )}
      {tab === 'definitions' && (
        <RecordDefinitionsManager
          competitionId={id}
        />
      )}
      {tab === 'breaks' && (
        <RecordBreaksList
          competitionId={id}
          recordBreaks={summary?.recentBreaks || []}
        />
      )}
    </div>
  );
}
