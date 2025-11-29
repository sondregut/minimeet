import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCompetition, getPublicEvents } from '@/lib/actions/public';
import { Calendar, MapPin, Clock, Trophy, Users, ChevronRight } from 'lucide-react';

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-red-100 text-red-800 animate-pulse';
    case 'checkin':
      return 'bg-yellow-100 text-yellow-800';
    case 'scheduled':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'completed':
      return 'Final';
    case 'in_progress':
      return 'Live';
    case 'checkin':
      return 'Check-in';
    case 'scheduled':
    default:
      return 'Scheduled';
  }
}

export default async function PublicCompetitionPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = await params;

  const [competition, events] = await Promise.all([
    getPublicCompetition(competitionId),
    getPublicEvents(competitionId),
  ]);

  if (!competition) {
    notFound();
  }

  // Group events by status
  const liveEvents = events.filter(e => e.status === 'in_progress');
  const completedEvents = events.filter(e => e.status === 'completed');
  const upcomingEvents = events.filter(e => e.status === 'scheduled' || e.status === 'checkin');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/results" className="text-blue-200 hover:text-white text-sm mb-2 inline-block">
            &larr; All Competitions
          </Link>
          <h1 className="text-3xl font-bold mb-2">{competition.name}</h1>
          {competition.organization && (
            <p className="text-blue-200 mb-4">
              Hosted by {competition.organization.name}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            {competition.date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(competition.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
            {competition.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {competition.venue}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{events.length}</div>
              <div className="text-sm text-gray-500">Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedEvents.length}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            {liveEvents.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{liveEvents.length}</div>
                <div className="text-sm text-gray-500">Live Now</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Live Events */}
        {liveEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              Live Now
            </h2>
            <div className="grid gap-3">
              {liveEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/results/${competitionId}/${event.id}`}
                  className="bg-white border-2 border-red-200 rounded-lg p-4 hover:border-red-400 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} &bull; {event.age_group}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    {event.scheduled_time && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Completed Events */}
        {completedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-600" />
              Results
            </h2>
            <div className="grid gap-3">
              {completedEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/results/${competitionId}/${event.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} &bull; {event.age_group}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Upcoming
            </h2>
            <div className="grid gap-3">
              {upcomingEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/results/${competitionId}/${event.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {event.gender === 'M' ? 'Men' : event.gender === 'W' ? 'Women' : 'Mixed'} &bull; {event.age_group}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    {event.scheduled_time && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.scheduled_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {events.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No events scheduled for this competition yet.
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
