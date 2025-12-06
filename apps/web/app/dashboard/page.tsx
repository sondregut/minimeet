import Link from 'next/link';
import { Plus, Trophy, Users, Calendar, ArrowRight, MapPin } from 'lucide-react';
import { getCompetitions } from '@/lib/actions/competitions';

export default async function DashboardPage() {
  const competitions = await getCompetitions();
  const recentCompetitions = competitions.slice(0, 5); // Show up to 5 recent competitions

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Velkommen tilbake!
        </h1>
        <p className="text-gray-600 mt-1">
          Administrer dine friidrettsstevner og resultater
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/competitions/new">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-900" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Nytt stevne</p>
                <p className="text-sm text-gray-500">Opprett et stevne</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/athletes/new">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Legg til utøver</p>
                <p className="text-sm text-gray-500">Registrer ny utøver</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/organizations">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Organisasjoner</p>
                <p className="text-sm text-gray-500">Administrer klubber</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/competitions">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Alle stevner</p>
                <p className="text-sm text-gray-500">Se alle stevner</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent competitions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Siste stevner</h2>
          <Link
            href="/dashboard/competitions"
            className="text-sm text-blue-900 hover:underline inline-flex items-center gap-1"
          >
            Se alle
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {recentCompetitions.length === 0 ? (
            <div className="py-12">
              <div className="text-center">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ingen stevner ennå
                </h3>
                <p className="text-gray-500 mb-6">
                  Kom i gang ved å opprette ditt første stevne
                </p>
                <Link
                  href="/dashboard/competitions/new"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Opprett stevne
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCompetitions.map((competition) => (
                <Link
                  key={competition.id}
                  href={`/dashboard/competitions/${competition.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-blue-900" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{competition.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(competition.date).toLocaleDateString('nb-NO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {competition.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {competition.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      competition.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                      competition.status === 'published' ? 'bg-green-100 text-green-700' :
                      competition.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      competition.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {competition.status === 'draft' ? 'Utkast' :
                       competition.status === 'published' ? 'Publisert' :
                       competition.status === 'active' ? 'Pågår' :
                       competition.status === 'completed' ? 'Fullført' :
                       competition.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Getting started guide */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white rounded-lg">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Kom i gang med MiniMeet</h3>
              <p className="text-white/80">
                Lær hvordan du setter opp stevner, håndterer påmeldinger og registrerer resultater.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-3 bg-white text-blue-900 font-semibold rounded-md hover:bg-gray-100 transition-colors shrink-0">
              Se veiledning
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
