import Link from 'next/link';
import { getPublicCompetitions } from '@/lib/actions/public';
import { Calendar, MapPin, ChevronRight, Trophy, Search, Users } from 'lucide-react';

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Completed</span>;
    case 'active':
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full animate-pulse">Live</span>;
    case 'published':
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Upcoming</span>;
    default:
      return null;
  }
}

export default async function PublicResultsPage() {
  const competitions = await getPublicCompetitions();

  // Separate by status
  const liveCompetitions = competitions.filter(c => c.status === 'active');
  const upcomingCompetitions = competitions.filter(c => c.status === 'published');
  const pastCompetitions = competitions.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/" className="text-blue-200 hover:text-white text-sm mb-2 inline-block">
            &larr; Home
          </Link>
          <h1 className="text-3xl font-bold mb-2">Competition Results</h1>
          <p className="text-blue-200">
            View live results and standings from athletics competitions
          </p>

          {/* Quick Actions */}
          <div className="mt-6 flex gap-4">
            <Link
              href="/results/athletes"
              className="inline-flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              Search Athletes
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Live Competitions */}
        {liveCompetitions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              Live Now
            </h2>
            <div className="grid gap-4">
              {liveCompetitions.map(competition => (
                <Link
                  key={competition.id}
                  href={`/results/${competition.id}`}
                  className="bg-white border-2 border-red-200 rounded-lg p-5 hover:border-red-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(competition.status)}
                        {competition.organization && (
                          <span className="text-sm text-gray-500">{competition.organization.name}</span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{competition.name}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {competition.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(competition.date).toLocaleDateString()}
                          </div>
                        )}
                        {competition.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {competition.venue}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Competitions */}
        {upcomingCompetitions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Upcoming
            </h2>
            <div className="grid gap-4">
              {upcomingCompetitions.map(competition => (
                <Link
                  key={competition.id}
                  href={`/results/${competition.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(competition.status)}
                        {competition.organization && (
                          <span className="text-sm text-gray-500">{competition.organization.name}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{competition.name}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {competition.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(competition.date).toLocaleDateString()}
                          </div>
                        )}
                        {competition.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {competition.venue}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Past Competitions */}
        {pastCompetitions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-600" />
              Past Results
            </h2>
            <div className="grid gap-3">
              {pastCompetitions.map(competition => (
                <Link
                  key={competition.id}
                  href={`/results/${competition.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(competition.status)}
                        {competition.organization && (
                          <span className="text-sm text-gray-500">{competition.organization.name}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">{competition.name}</h3>
                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        {competition.date && (
                          <span>{new Date(competition.date).toLocaleDateString()}</span>
                        )}
                        {competition.venue && <span>{competition.venue}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {competitions.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No public competitions available yet.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          Powered by <span className="font-semibold">MiniMeet</span>
        </div>
      </footer>
    </div>
  );
}
