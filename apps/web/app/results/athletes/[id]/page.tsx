import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Calendar, MapPin, Medal, Trophy, Wind } from 'lucide-react';
import { getPublicAthleteProfile } from '@/lib/actions/public';

type Props = {
  params: Promise<{ id: string }>;
};

type PersonalBest = {
  mark: string;
  value: number;
  date: string;
  competition: string;
  wind?: number;
};

function getYearFromDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return new Date(dateStr).getFullYear();
}

function getGenderLabel(gender: string): string {
  switch (gender) {
    case 'M': return 'Men';
    case 'W': return 'Women';
    case 'X': return 'Mixed';
    default: return gender;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getResultDisplay(result: any, eventType: string): { mark: string; status?: string } {
  if (!result) return { mark: '-', status: undefined };

  if (eventType === 'track' || eventType === 'relay') {
    if (result.status === 'DNS') return { mark: 'DNS', status: 'DNS' };
    if (result.status === 'DNF') return { mark: 'DNF', status: 'DNF' };
    if (result.status === 'DQ') return { mark: 'DQ', status: 'DQ' };
    return { mark: result.time_display || '-' };
  }

  if (eventType === 'field_vertical') {
    if (result.status === 'NH') return { mark: 'NH', status: 'NH' };
    if (result.best_height) return { mark: `${result.best_height.toFixed(2)}m` };
    return { mark: '-' };
  }

  if (eventType === 'field_horizontal' || eventType === 'throw') {
    if (result.status === 'NM') return { mark: 'NM', status: 'NM' };
    if (result.best_mark) return { mark: `${result.best_mark.toFixed(2)}m` };
    return { mark: '-' };
  }

  return { mark: '-' };
}

function getPlaceDisplay(place: number | null): string {
  if (!place) return '-';
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}

function getPlaceClass(place: number | null): string {
  if (!place) return 'text-gray-400';
  if (place === 1) return 'text-yellow-600 font-bold';
  if (place === 2) return 'text-gray-500 font-semibold';
  if (place === 3) return 'text-amber-700 font-semibold';
  return 'text-gray-600';
}

export default async function AthleteProfilePage({ params }: Props) {
  const { id } = await params;
  const athlete = await getPublicAthleteProfile(id);

  if (!athlete) {
    notFound();
  }

  const birthYear = getYearFromDate(athlete.date_of_birth);
  const personalBests: Record<string, PersonalBest> = athlete.personalBests || {};
  const pbEntries = Object.entries(personalBests) as [string, PersonalBest][];

  // Group results by competition
  const resultsByCompetition = athlete.results.reduce((acc: Record<string, any[]>, r: any) => {
    const compId = r.event?.competition?.id;
    if (compId) {
      if (!acc[compId]) {
        acc[compId] = [];
      }
      acc[compId].push(r);
    }
    return acc;
  }, {});

  const competitionGroups = Object.values(resultsByCompetition);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/results/athletes" className="text-blue-200 hover:text-white text-sm mb-4 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>

          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
              {athlete.profile_image_url ? (
                <img
                  src={athlete.profile_image_url}
                  alt={`${athlete.first_name} ${athlete.last_name}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-blue-300" />
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {athlete.last_name.toUpperCase()}, {athlete.first_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-blue-200">
                {birthYear && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Born {birthYear}
                  </span>
                )}
                {athlete.nationality && (
                  <span className="bg-blue-800 px-2 py-0.5 rounded text-sm">
                    {athlete.nationality}
                  </span>
                )}
                {athlete.gender && (
                  <span>{getGenderLabel(athlete.gender)}</span>
                )}
              </div>
              {athlete.club_name && (
                <p className="text-blue-100 mt-2">{athlete.club_name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Personal Bests Section */}
        {pbEntries.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-yellow-500" />
              Personal Bests
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Event</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Mark</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Wind</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Competition</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pbEntries.map(([eventCode, pb]) => (
                    <tr key={eventCode} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{eventCode}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-blue-600">{pb.mark}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">
                        {pb.wind !== undefined && pb.wind !== null ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Wind className="w-3 h-3" />
                            {pb.wind > 0 ? '+' : ''}{pb.wind.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{pb.competition}</td>
                      <td className="py-3 px-4 text-gray-500 text-sm">{formatDate(pb.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Competition History */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-600" />
            Competition History
          </h2>

          {competitionGroups.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No competition results found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {competitionGroups.map((results: any[], index) => {
                const competition = results[0]?.event?.competition;
                if (!competition) return null;

                return (
                  <div key={competition.id || index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Competition Header */}
                    <Link
                      href={`/results/${competition.id}`}
                      className="block bg-gray-50 border-b px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900">{competition.name}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                        {competition.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(competition.date)}
                          </span>
                        )}
                        {competition.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {competition.location}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Results Table */}
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b text-xs">
                        <tr>
                          <th className="text-left py-2 px-4 font-semibold text-gray-500">Event</th>
                          <th className="text-center py-2 px-4 font-semibold text-gray-500 w-16">Place</th>
                          <th className="text-right py-2 px-4 font-semibold text-gray-500">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r: any) => {
                          const event = r.event;
                          const resultDisplay = getResultDisplay(r.result, event?.event_type);
                          const place = r.result?.place;
                          const isPB = r.result?.is_pb;
                          const isSB = r.result?.is_sb;

                          return (
                            <tr key={r.entry_id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <Link
                                  href={`/results/${competition.id}/${event?.id}`}
                                  className="hover:text-blue-600"
                                >
                                  <span className="font-medium text-gray-900">{event?.name}</span>
                                  {event?.round && event.round !== 'final' && (
                                    <span className="text-gray-500 text-sm ml-2 capitalize">({event.round})</span>
                                  )}
                                </Link>
                              </td>
                              <td className={`py-3 px-4 text-center ${getPlaceClass(place)}`}>
                                {getPlaceDisplay(place)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={`font-mono ${resultDisplay.status ? 'text-gray-400' : 'font-semibold'}`}>
                                  {resultDisplay.mark}
                                </span>
                                {isPB && (
                                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-semibold">
                                    PB
                                  </span>
                                )}
                                {isSB && !isPB && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                                    SB
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </section>
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
