import Link from 'next/link';
import { Plus, Trophy, Calendar, MapPin, MoreVertical } from 'lucide-react';
import { getCompetitions } from '@/lib/actions/competitions';

export default async function CompetitionsPage() {
  const competitions = await getCompetitions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitions</h1>
          <p className="text-gray-600">
            Manage your athletics events and competitions
          </p>
        </div>
        <Link
          href="/dashboard/competitions/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Competition
        </Link>
      </div>

      {/* Competitions list */}
      {competitions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="py-12">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No competitions yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first competition to get started
              </p>
              <Link
                href="/dashboard/competitions/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Competition
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {competitions.map((competition) => (
            <Link
              key={competition.id}
              href={`/dashboard/competitions/${competition.id}`}
            >
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-blue-900" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {competition.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            competition.status === 'active'
                              ? 'bg-red-100 text-red-700'
                              : competition.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {competition.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {competition.date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {competition.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
