import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentOfficialSession } from '@/lib/actions/access-codes';
import { Activity, Timer, Target, Zap, LogOut, ChevronRight, Users, ClipboardList } from 'lucide-react';
import LogoutButton from './LogoutButton';

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'track':
    case 'relay':
      return <Timer className="w-6 h-6" />;
    case 'field_vertical':
      return <Target className="w-6 h-6" />;
    case 'field_horizontal':
      return <Zap className="w-6 h-6" />;
    default:
      return <ClipboardList className="w-6 h-6" />;
  }
}

function getEventTypeLabel(type: string) {
  switch (type) {
    case 'track':
      return 'Lop';
    case 'relay':
      return 'Stafett';
    case 'field_vertical':
      return 'Hopp (vertikal)';
    case 'field_horizontal':
      return 'Kast/Lengde';
    default:
      return 'Ovelse';
  }
}

function getEventTypeColor(type: string) {
  switch (type) {
    case 'track':
    case 'relay':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'field_vertical':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'field_horizontal':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export default async function OfficialDashboardPage() {
  const session = await getCurrentOfficialSession();

  if (!session) {
    redirect('/official');
  }

  // Group events by type
  const eventsByType = session.events.reduce((acc, event) => {
    const type = event.event_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(event);
    return acc;
  }, {} as Record<string, typeof session.events>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-7 h-7 text-emerald-500" />
              <span className="text-xl font-bold">MiniMeet</span>
            </div>
            <LogoutButton />
          </div>

          <div className="mt-6">
            <p className="text-slate-400 text-sm">Funksjonaerpanel</p>
            <h1 className="text-2xl font-bold mt-1">Dine tildelte ovelser</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {session.events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-700">Ingen ovelser tildelt</h2>
            <p className="text-slate-500 mt-2">
              Kontakt stevnearrangor for a fa tildelt ovelser.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{session.events.length}</p>
                    <p className="text-sm text-slate-500">Ovelse{session.events.length !== 1 ? 'r' : ''}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{Object.keys(eventsByType).length}</p>
                    <p className="text-sm text-slate-500">Type{Object.keys(eventsByType).length !== 1 ? 'r' : ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Events list */}
            <div className="space-y-6">
              {Object.entries(eventsByType).map(([type, events]) => (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getEventTypeColor(type)}`}>
                      {getEventTypeIcon(type)}
                      {getEventTypeLabel(type)}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({events.length} ovelse{events.length !== 1 ? 'r' : ''})
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {events.map((event) => (
                      <Link
                        key={event.id}
                        href={`/official/event/${event.id}`}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getEventTypeColor(event.event_type)}`}>
                            {getEventTypeIcon(event.event_type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-900">{event.name}</h3>
                            <p className="text-sm text-slate-500">{getEventTypeLabel(event.event_type)}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick link to results */}
            <div className="bg-slate-100 rounded-xl p-4">
              <p className="text-sm text-slate-600 mb-2">
                Du kan ogsa se resultatene for hele stevnet:
              </p>
              <Link
                href="/results"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
              >
                Ga til resultatliste
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
