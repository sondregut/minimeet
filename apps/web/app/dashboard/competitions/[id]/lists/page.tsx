'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Building2,
  Calendar,
  Clock,
  FileText,
  Printer,
  Download,
  ClipboardList,
  ClipboardCheck,
} from 'lucide-react';
import { getCompetition } from '@/lib/actions/competitions';

interface Competition {
  id: string;
  name: string;
  date: string;
}

const LIST_TYPES = [
  {
    id: 'by-club',
    title: 'Klubbvise lister',
    description: 'Alle utøvere gruppert etter klubb',
    icon: Building2,
    color: 'blue',
  },
  {
    id: 'by-event',
    title: 'Øvelseslister',
    description: 'Deltakere per øvelse med startnummer',
    icon: Users,
    color: 'green',
  },
  {
    id: 'club-schedule',
    title: 'Klubblister med tidsskjema',
    description: 'Hver klubbs utøvere med øvelse og starttid',
    icon: Calendar,
    color: 'purple',
  },
  {
    id: 'schedule-by-age',
    title: 'Tidsskjema etter aldersgruppe',
    description: 'Alle øvelser sortert på aldersgruppe og tid',
    icon: Clock,
    color: 'orange',
  },
  {
    id: 'schedule-by-event',
    title: 'Tidsskjema etter øvelse',
    description: 'Kronologisk oversikt over alle øvelser',
    icon: FileText,
    color: 'red',
  },
  {
    id: 'manual-sheets',
    title: 'Manuelle resultatskjemaer',
    description: 'Utskriftsvennlige skjemaer for manuell føring av tekniske øvelser',
    icon: ClipboardList,
    color: 'indigo',
  },
  {
    id: 'check-in',
    title: 'Avkrysningslister',
    description: 'Lister for utøvere til å krysse av oppmøte og årsbeste',
    icon: ClipboardCheck,
    color: 'teal',
  },
];

export default function ListsPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const comp = await getCompetition(competitionId);
        setCompetition(comp);
      } catch (error) {
        console.error('Error loading competition:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [competitionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', hover: 'hover:bg-blue-100' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', hover: 'hover:bg-green-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', hover: 'hover:bg-purple-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', hover: 'hover:bg-orange-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', hover: 'hover:bg-red-100' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', hover: 'hover:bg-indigo-100' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', hover: 'hover:bg-teal-100' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til {competition?.name || 'stevnet'}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lister og rapporter</h1>
            <p className="text-gray-600 mt-1">
              Generer ulike lister for utskrift eller publisering
            </p>
          </div>
        </div>
      </div>

      {/* List Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LIST_TYPES.map((listType) => {
          const Icon = listType.icon;
          const colors = colorClasses[listType.color];

          return (
            <Link
              key={listType.id}
              href={`/dashboard/competitions/${competitionId}/lists/${listType.id}`}
              className={`block p-6 bg-white rounded-lg border border-gray-200 shadow-sm ${colors.hover} transition-colors`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{listType.title}</h3>
                  <p className="text-sm text-gray-500">{listType.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Printer className="w-5 h-5 text-gray-500" />
          Om utskrift
        </h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            Alle lister er optimalisert for utskrift. Bruk nettleserens utskriftsfunksjon (Ctrl+P / Cmd+P)
            for å skrive ut eller lagre som PDF.
          </p>
          <p>
            Listene kan også kopieres og limes inn i andre programmer, eller deles som lenker.
          </p>
        </div>
      </div>
    </div>
  );
}
