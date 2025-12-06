import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentOfficialSession, checkEventAccess } from '@/lib/actions/access-codes';
import { getEvent, getEventEntries, getEventHeights } from '@/lib/actions/events';
import { Activity, ArrowLeft, Timer, Target, Zap, Users, AlertTriangle } from 'lucide-react';
import OfficialVerticalRecording from './OfficialVerticalRecording';
import OfficialHorizontalRecording from './OfficialHorizontalRecording';
import OfficialTrackRecording from './OfficialTrackRecording';

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
      return null;
  }
}

function getEventTypeLabel(type: string) {
  switch (type) {
    case 'track':
      return 'Lop';
    case 'relay':
      return 'Stafett';
    case 'field_vertical':
      return 'Hoyde/Stav';
    case 'field_horizontal':
      return 'Kast/Lengde';
    default:
      return 'Ovelse';
  }
}

export default async function OfficialEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Check session
  const session = await getCurrentOfficialSession();
  if (!session) {
    redirect('/official');
  }

  // Check event access
  const hasAccess = await checkEventAccess(eventId);
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-7 h-7 text-emerald-500" />
                <span className="text-xl font-bold">MiniMeet</span>
              </div>
              <Link
                href="/official/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Tilbake
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Ingen tilgang</h1>
            <p className="text-slate-600 mb-6">
              Du har ikke tilgang til denne ovelsen. Kontakt stevnearrangor hvis du mener dette er feil.
            </p>
            <Link
              href="/official/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Ga til mine ovelser
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Load event data
  const event = await getEvent(eventId);
  if (!event) {
    notFound();
  }

  // Load entries
  const entries = await getEventEntries(eventId);

  // Load heights for vertical events
  const heights = event.event_type === 'field_vertical' ? await getEventHeights(eventId) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/official/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Mine ovelser
              </Link>
              <div className="h-6 w-px bg-slate-700"></div>
              <div className="flex items-center gap-3">
                {getEventTypeIcon(event.event_type)}
                <div>
                  <h1 className="font-bold">{event.name}</h1>
                  <p className="text-sm text-slate-400">{getEventTypeLabel(event.event_type)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users className="w-4 h-4" />
                {entries.length} deltager{entries.length !== 1 ? 'e' : ''}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                event.status === 'in_progress'
                  ? 'bg-red-500/20 text-red-300'
                  : event.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-500/20 text-slate-300'
              }`}>
                {event.status === 'in_progress' ? 'Pagar' : event.status === 'completed' ? 'Ferdig' : 'Planlagt'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Recording Interface */}
      <main className="max-w-6xl mx-auto">
        {event.event_type === 'field_vertical' && (
          <OfficialVerticalRecording
            event={event}
            entries={entries}
            heights={heights}
          />
        )}
        {event.event_type === 'field_horizontal' && (
          <OfficialHorizontalRecording
            event={event}
            entries={entries}
          />
        )}
        {(event.event_type === 'track' || event.event_type === 'relay') && (
          <OfficialTrackRecording
            event={event}
            entries={entries}
          />
        )}
      </main>
    </div>
  );
}
