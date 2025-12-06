'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Key,
  Copy,
  Check,
  X,
  Loader2,
  Trash2,
  RefreshCw,
  Timer,
  Target,
  Zap,
  ClipboardList,
} from 'lucide-react';
import {
  createAccessCode,
  deactivateAccessCode,
  reactivateAccessCode,
  type AccessCode,
} from '@/lib/actions/access-codes';

interface Event {
  id: string;
  name: string;
  event_type: string;
  age_group?: string;
  gender?: string;
}

// Format event name with age group for display
function formatEventDisplay(event: { name: string; age_group?: string; gender?: string }): string {
  const parts = [event.name];
  if (event.age_group && event.age_group !== 'Senior') {
    parts.push(event.age_group);
  }
  if (event.gender) {
    parts.push(event.gender === 'M' ? 'Menn' : event.gender === 'F' ? 'Kvinner' : event.gender);
  }
  return parts.join(' - ');
}

interface Props {
  competitionId: string;
  initialCodes: AccessCode[];
  events: Event[];
}

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'track':
    case 'relay':
      return <Timer className="w-4 h-4" />;
    case 'field_vertical':
      return <Target className="w-4 h-4" />;
    case 'field_horizontal':
      return <Zap className="w-4 h-4" />;
    default:
      return <ClipboardList className="w-4 h-4" />;
  }
}

export default function AccessCodesManager({ competitionId, initialCodes, events }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [codes, setCodes] = useState<AccessCode[]>(initialCodes);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [prefix, setPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name || selectedEvents.length === 0) {
      setError('Fyll ut navn og velg minst en ovelse');
      return;
    }

    setIsCreating(true);
    setError('');

    const result = await createAccessCode(competitionId, name, selectedEvents, prefix);

    if (result.error) {
      setError(result.error);
      setIsCreating(false);
      return;
    }

    if (result.code) {
      setCodes([result.code, ...codes]);
    }

    // Reset form
    setName('');
    setSelectedEvents([]);
    setPrefix('');
    setShowCreateForm(false);
    setIsCreating(false);

    startTransition(() => {
      router.refresh();
    });
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeactivate = async (codeId: string) => {
    const result = await deactivateAccessCode(codeId);
    if (result.success) {
      setCodes(codes.map(c => c.id === codeId ? { ...c, is_active: false } : c));
      startTransition(() => router.refresh());
    }
  };

  const handleReactivate = async (codeId: string) => {
    const result = await reactivateAccessCode(codeId);
    if (result.success) {
      setCodes(codes.map(c => c.id === codeId ? { ...c, is_active: true } : c));
      startTransition(() => router.refresh());
    }
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  // Group events by type for selection
  const eventsByType = events.reduce((acc, event) => {
    if (!acc[event.event_type]) acc[event.event_type] = [];
    acc[event.event_type].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Hvordan fungerer tilgangskoder?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Opprett en kode for hver funksjonaer og velg hvilke ovelser de skal ha tilgang til</li>
          <li>2. Del koden med funksjonaeren (f.eks. via SMS eller utskrift)</li>
          <li>3. Funksjonaeren gar til <strong>/official</strong> og logger inn med koden</li>
          <li>4. De far kun tilgang til a registrere resultater for sine tildelte ovelser</li>
        </ul>
      </div>

      {/* Create button */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Opprett ny tilgangskode
        </button>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Opprett tilgangskode</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Navn (for din referanse)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Per Hansen - Hoyde"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prefiks (valgfritt)
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="F.eks. HJ for hoyde"
                maxLength={3}
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Koden blir f.eks. HJ-ABCD-1234
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Velg ovelser denne koden gir tilgang til
              </label>
              <div className="space-y-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {Object.entries(eventsByType).map(([type, typeEvents]) => (
                  <div key={type}>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-1">
                      {getEventTypeIcon(type)}
                      {type === 'track' && 'Lop'}
                      {type === 'relay' && 'Stafett'}
                      {type === 'field_vertical' && 'Hopp (vertikal)'}
                      {type === 'field_horizontal' && 'Kast/Lengde'}
                    </div>
                    <div className="space-y-1 ml-6">
                      {typeEvents.map((event) => (
                        <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedEvents.includes(event.id)}
                            onChange={() => toggleEventSelection(event.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-slate-700">{formatEventDisplay(event)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Ingen ovelser opprettet enna
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                Opprett kode
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setName('');
                  setSelectedEvents([]);
                  setPrefix('');
                  setError('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing codes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-medium text-slate-900">Aktive koder</h3>
        </div>

        {codes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Ingen tilgangskoder opprettet enna
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {codes.map((code) => (
              <div
                key={code.id}
                className={`p-4 ${!code.is_active ? 'bg-slate-50 opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{code.name}</span>
                      {!code.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                          Deaktivert
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono text-sm">
                        {code.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(code.code)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Kopier kode"
                      >
                        {copiedCode === code.code ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {code.events && code.events.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {code.events.map((event) => (
                          <span
                            key={event.id}
                            className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
                          >
                            {formatEventDisplay(event)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {code.is_active ? (
                      <button
                        onClick={() => handleDeactivate(code.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Deaktiver"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(code.id)}
                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                        title="Reaktiver"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
