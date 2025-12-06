import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompetition } from '@/lib/actions/competitions';
import { getEventsByCompetition } from '@/lib/actions/events';
import { getEntryCountsByEvent } from '@/lib/actions/entries';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Plus,
  Trophy,
  Clock,
  Users,
  Settings,
  Zap,
  FileText,
  ClipboardList,
  CheckCircle2,
  Circle,
  Hash,
  UserCheck,
  LayoutDashboard,
  Play,
  Key,
} from 'lucide-react';
import {
  WORKFLOW_PHASES,
  type WorkflowPhase,
} from '@/lib/constants/workflow-phases';

// Determine which phase the competition is in based on its state
function determineCurrentPhase(
  competition: { status: string; date: string },
  eventsCount: number,
  totalEntries: number
): WorkflowPhase {
  const now = new Date();
  const competitionDate = new Date(competition.date);
  const hoursUntilStart = (competitionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // If competition has ended
  if (competition.status === 'completed') {
    return 5;
  }

  // If competition is active/in progress
  if (competition.status === 'active' || competition.status === 'in_progress') {
    return 4;
  }

  // If competition starts within 24 hours
  if (hoursUntilStart <= 24 && hoursUntilStart > 0) {
    return 3;
  }

  // If we have events set up, move to planning phase
  if (eventsCount > 0) {
    return 2;
  }

  // Default: Setup phase
  return 1;
}

// Check what's completed in each phase
function getPhaseProgress(
  eventsCount: number,
  totalEntries: number,
  competition: { status: string }
) {
  return {
    phase1: {
      hasEvents: eventsCount > 0,
      isComplete: eventsCount > 0,
    },
    phase2: {
      hasEntries: totalEntries > 0,
      isComplete: totalEntries > 0,
    },
    phase3: {
      isReady: totalEntries > 0,
      isComplete: competition.status === 'active' || competition.status === 'in_progress' || competition.status === 'completed',
    },
    phase4: {
      isActive: competition.status === 'active' || competition.status === 'in_progress',
      isComplete: competition.status === 'completed',
    },
    phase5: {
      isComplete: false, // Manual completion
    },
  };
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competition = await getCompetition(id);

  if (!competition) {
    notFound();
  }

  const [events, entryCounts] = await Promise.all([
    getEventsByCompetition(id),
    getEntryCountsByEvent(id),
  ]);

  const totalEntries = Object.values(entryCounts).reduce((sum, count) => sum + count, 0);
  const currentPhase = determineCurrentPhase(competition, events.length, totalEntries);
  const progress = getPhaseProgress(events.length, totalEntries, competition);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/competitions"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til stevner
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{competition.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(competition.date).toLocaleDateString('no-NO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {competition.location}
                {competition.venue && ` · ${competition.venue}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/competitions/${id}/access-codes`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Key className="w-4 h-4" />
              Tilgangskoder
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/settings`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Innstillinger
            </Link>
          </div>
        </div>
      </div>

      {/* Phase Progress Indicator */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Stevnefaser</h2>
          <span className="text-sm text-gray-500">
            Fase {currentPhase} av 5
          </span>
        </div>

        <div className="flex items-center justify-between">
          {WORKFLOW_PHASES.map((phase, index) => {
            const isActive = phase.phase === currentPhase;
            const isCompleted = phase.phase < currentPhase;
            const isFuture = phase.phase > currentPhase;

            return (
              <div key={phase.phase} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-900 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      phase.phase
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {phase.nameNo}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 text-center max-w-[100px]">
                    {phase.descriptionNo}
                  </span>
                </div>
                {index < WORKFLOW_PHASES.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded ${
                      phase.phase < currentPhase ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Phase Actions */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-blue-900 text-white px-6 py-4">
          <h2 className="text-lg font-semibold">
            {WORKFLOW_PHASES[currentPhase - 1].nameNo}: {WORKFLOW_PHASES[currentPhase - 1].descriptionNo}
          </h2>
        </div>

        <div className="p-6">
          {/* Phase 1: Setup */}
          {currentPhase === 1 && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Sett opp stevnet ditt ved å legge til øvelser og konfigurere innstillinger.
              </p>

              {/* Setup Checklist */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  {progress.phase1.hasEvents ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Legg til øvelser</p>
                    <p className="text-sm text-gray-500">
                      {events.length} øvelse{events.length !== 1 ? 'r' : ''} lagt til
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/competitions/${id}/events/quick-add`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-semibold rounded-md hover:bg-amber-600 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Hurtiglegg til
                  </Link>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Circle className="w-6 h-6 text-gray-300" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Konfigurer påmeldingsinnstillinger</p>
                    <p className="text-sm text-gray-500">Sett opp online påmelding</p>
                  </div>
                  <Link
                    href={`/dashboard/competitions/${id}/registration`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Innstillinger
                  </Link>
                </div>

              </div>

              {/* Move to next phase */}
              {progress.phase1.isComplete && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">Klar for neste fase!</p>
                      <p className="text-sm text-green-600">
                        Du har lagt til øvelser. Åpne for påmeldinger for å gå videre til planleggingsfasen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 2: Planning */}
          {currentPhase === 2 && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Håndter påmeldinger, tildel startnummer og lag tidsskjema.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href={`/dashboard/competitions/${id}/entries`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-900" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Påmeldinger</p>
                    <p className="text-sm text-gray-500">{totalEntries} påmeldt</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>

                <Link
                  href={`/dashboard/competitions/${id}/bibs`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Hash className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Startnummer</p>
                    <p className="text-sm text-gray-500">Tildel startnummer</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>

                <Link
                  href={`/dashboard/competitions/${id}/schedule`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Tidsskjema</p>
                    <p className="text-sm text-gray-500">Matrise og tidsberegning</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>

                <Link
                  href={`/dashboard/competitions/${id}/registration/import`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Importer påmeldinger</p>
                    <p className="text-sm text-gray-500">Last opp CSV-fil</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>

                <Link
                  href={`/dashboard/competitions/${id}/lists`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Lister</p>
                    <p className="text-sm text-gray-500">Startlister og utskrifter</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>

                <Link
                  href={`/dashboard/competitions/${id}/check-in`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Avkrysningskontroll</p>
                    <p className="text-sm text-gray-500">Kryss ut de som ikke møter</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>
              </div>

              {/* Quick access to control center */}
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-800">Start resultatregistrering</p>
                    <p className="text-sm text-red-600">
                      Gå til kontrollsenteret for å styre øvelser og registrere resultater.
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/competitions/${id}/control`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Kontrollsenter
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Phase 3: Pre-Competition */}
          {currentPhase === 3 && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Kryss av utøvere, ferdigstill startlister og skriv ut materiell.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href={`/dashboard/competitions/${id}/check-in`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Avkrysningskontroll</p>
                    <p className="text-sm text-gray-500">Kryss ut de som ikke møter</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>

                <Link
                  href={`/dashboard/competitions/${id}/lists`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Lister og utskrifter</p>
                    <p className="text-sm text-gray-500">Startlister, klubblister m.m.</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-800">Klar til start?</p>
                    <p className="text-sm text-blue-600">
                      Når stevnet starter, gå til kontrollsenteret for å styre øvelsene.
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/competitions/${id}/control`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start stevne
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Phase 4: Live Competition */}
          {currentPhase === 4 && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Stevnet pågår! Registrer resultater og publiser live oppdateringer.
              </p>

              <Link
                href={`/dashboard/competitions/${id}/control`}
                className="flex items-center gap-4 p-6 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <div className="w-16 h-16 rounded-lg bg-red-600 flex items-center justify-center">
                  <LayoutDashboard className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold text-red-900">Kontrollsenter</p>
                  <p className="text-red-700">Styr øvelser og registrer resultater live</p>
                </div>
                <ArrowRight className="w-6 h-6 text-red-400" />
              </Link>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{events.length}</p>
                  <p className="text-sm text-gray-500">Øvelser</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {events.filter(e => e.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-gray-500">Pågår</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {events.filter(e => e.status === 'completed').length}
                  </p>
                  <p className="text-sm text-gray-500">Fullført</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase 5: Post-Competition */}
          {currentPhase === 5 && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Stevnet er ferdig. Kontroller resultater og generer rapporter.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href={`/dashboard/competitions/${id}/reports/results`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Resultater</p>
                    <p className="text-sm text-gray-500">Se og eksporter resultater</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>

                <Link
                  href={`/dashboard/competitions/${id}/reports`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Rapporter</p>
                    <p className="text-sm text-gray-500">Generer alle rapporter</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events List - Always visible but simplified */}
      {events.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Øvelser ({events.length})
            </h2>
            <Link
              href={`/dashboard/competitions/${id}/events/quick-add`}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 text-white font-medium rounded-md hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Legg til
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {events.slice(0, 10).map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/competitions/${id}/events/${event.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-sm text-gray-500">
                    {event.gender === 'M' ? 'Gutter' : event.gender === 'W' ? 'Jenter' : 'Blandet'} · {event.age_group}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {entryCounts[event.id] || 0} påmeldt
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      event.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : event.status === 'in_progress'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {event.status === 'scheduled' ? 'Planlagt' :
                     event.status === 'in_progress' ? 'Pågår' :
                     event.status === 'completed' ? 'Ferdig' : event.status}
                  </span>
                </div>
              </Link>
            ))}
            {events.length > 10 && (
              <div className="px-6 py-3 text-center">
                <Link
                  href={`/dashboard/competitions/${id}/control`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Se alle {events.length} øvelser →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Settings - Collapsed */}
      <details className="bg-white rounded-lg border border-gray-200">
        <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
          <span className="font-medium text-gray-700">Avanserte innstillinger</span>
          <Settings className="w-5 h-5 text-gray-400" />
        </summary>
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Link
              href={`/dashboard/competitions/${id}/settings`}
              className="text-sm text-gray-600 hover:text-blue-600 font-medium"
            >
              Stevneinnstillinger
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/entries`}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Alle påmeldinger
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/bibs`}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Startnummer
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/schedule`}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Tidsskjema
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/lists`}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Lister
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/reports`}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Rapporter
            </Link>
            <Link
              href={`/dashboard/competitions/${id}/records`}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Rekorder
            </Link>
          </div>
        </div>
      </details>
    </div>
  );
}
