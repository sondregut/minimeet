'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  createRelayTeam,
  deleteRelayTeam,
  getRelayTeamsForEvent,
  assignLegAthlete,
  updateRelayTeam,
  checkInRelayTeam,
  scratchRelayTeam,
  type RelayTeam,
  type RelayTeamLeg,
} from '@/lib/actions/relay-teams';
import { getAthletesWithBibs } from '@/lib/actions/entries';

interface RelayTeamManagerProps {
  eventId: string;
  competitionId: string;
  eventCode: string;
}

type AthleteWithBib = {
  athlete_id: string;
  first_name: string;
  last_name: string;
  club_name: string | null;
  bib_number: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  registered: { label: 'Registrert', color: 'bg-gray-100 text-gray-700', icon: Clock },
  confirmed: { label: 'Bekreftet', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  checked_in: { label: 'Sjekket inn', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  DNS: { label: 'DNS', color: 'bg-orange-100 text-orange-700', icon: XCircle },
  scratched: { label: 'Strøket', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function getLegCount(eventCode: string): number {
  if (eventCode.startsWith('3x')) return 3;
  if (eventCode.startsWith('4x')) return 4;
  if (eventCode.startsWith('8x')) return 8;
  if (eventCode === 'donaldstafett') return 4;
  if (eventCode.startsWith('hurricane_')) return 3;
  return 4;
}

export default function RelayTeamManager({
  eventId,
  competitionId,
  eventCode,
}: RelayTeamManagerProps) {
  const [teams, setTeams] = useState<RelayTeam[]>([]);
  const [athletes, setAthletes] = useState<AthleteWithBib[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeam, setNewTeam] = useState({ club_name: '', team_name: '', seed_time: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const legCount = getLegCount(eventCode);

  useEffect(() => {
    loadData();
  }, [eventId, competitionId]);

  async function loadData() {
    setLoading(true);
    try {
      const [teamsData, athletesData] = await Promise.all([
        getRelayTeamsForEvent(eventId),
        getAthletesWithBibs(competitionId),
      ]);
      setTeams(teamsData);
      setAthletes(athletesData as AthleteWithBib[]);
    } catch (err) {
      console.error('Error loading relay data:', err);
    }
    setLoading(false);
  }

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await createRelayTeam({
      event_id: eventId,
      competition_id: competitionId,
      club_name: newTeam.club_name,
      team_name: newTeam.team_name || `${newTeam.club_name} Lag 1`,
      seed_time: newTeam.seed_time || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setNewTeam({ club_name: '', team_name: '', seed_time: '' });
      setShowAddForm(false);
      await loadData();
    }
    setSaving(false);
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm('Er du sikker på at du vil slette dette stafettlaget?')) return;

    const result = await deleteRelayTeam(teamId);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
  }

  async function handleAssignAthlete(teamId: string, legNumber: number, athleteId: string | null) {
    const result = await assignLegAthlete({
      relay_team_id: teamId,
      leg_number: legNumber,
      athlete_id: athleteId,
    });

    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
  }

  async function handleCheckIn(teamId: string) {
    const result = await checkInRelayTeam(teamId);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
  }

  async function handleScratch(teamId: string) {
    const result = await scratchRelayTeam(teamId);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
  }

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add Team Button / Form */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Legg til stafettlag
        </button>
      ) : (
        <form
          onSubmit={handleAddTeam}
          className="bg-white rounded-lg border border-gray-200 p-4 space-y-4"
        >
          <h3 className="font-semibold text-gray-900">Nytt stafettlag</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Klubbnavn *
              </label>
              <input
                type="text"
                value={newTeam.club_name}
                onChange={(e) => setNewTeam({ ...newTeam, club_name: e.target.value })}
                placeholder="F.eks. BUL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lagnavn
              </label>
              <input
                type="text"
                value={newTeam.team_name}
                onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })}
                placeholder="F.eks. BUL Lag 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seedtid
              </label>
              <input
                type="text"
                value={newTeam.seed_time}
                onChange={(e) => setNewTeam({ ...newTeam, seed_time: e.target.value })}
                placeholder="F.eks. 45.32"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Lagrer...' : 'Legg til lag'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewTeam({ club_name: '', team_name: '', seed_time: '' });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      )}

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ingen stafettlag ennå
          </h3>
          <p className="text-gray-500">
            Legg til stafettlag for denne øvelsen
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const isExpanded = expandedTeam === team.id;
            const statusConfig = STATUS_CONFIG[team.status] || STATUS_CONFIG.registered;
            const assignedLegs = team.legs?.filter((l) => l.athlete_id) || [];
            const allLegsAssigned = assignedLegs.length === legCount;

            return (
              <div
                key={team.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Team Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(team.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-900" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{team.team_name}</h3>
                      <p className="text-sm text-gray-600">
                        {team.club_name}
                        {team.seed_time && ` - Seedtid: ${team.seed_time}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {assignedLegs.length}/{legCount} løpere
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {/* Leg Assignments */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Etapper
                      </h4>
                      <div className="space-y-2">
                        {Array.from({ length: legCount }, (_, i) => i + 1).map((legNum) => {
                          const leg = team.legs?.find((l) => l.leg_number === legNum);
                          const assignedAthlete = leg?.athlete;

                          return (
                            <div
                              key={legNum}
                              className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
                                {legNum}
                              </div>
                              <div className="flex-1">
                                <select
                                  value={leg?.athlete_id || ''}
                                  onChange={(e) =>
                                    handleAssignAthlete(
                                      team.id,
                                      legNum,
                                      e.target.value || null
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  <option value="">Velg løper...</option>
                                  {athletes
                                    .filter(
                                      (a) =>
                                        !a.club_name ||
                                        a.club_name
                                          .toLowerCase()
                                          .includes(team.club_name.toLowerCase())
                                    )
                                    .map((athlete) => (
                                      <option key={athlete.athlete_id} value={athlete.athlete_id}>
                                        {athlete.first_name} {athlete.last_name}
                                        {athlete.club_name && ` (${athlete.club_name})`}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              {assignedAthlete && (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                      {team.status === 'registered' && allLegsAssigned && (
                        <button
                          onClick={() => handleCheckIn(team.id)}
                          className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Sjekk inn
                        </button>
                      )}
                      {team.status !== 'scratched' && (
                        <button
                          onClick={() => handleScratch(team.id)}
                          className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors text-sm"
                        >
                          Stryk lag
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Slett
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {teams.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>{teams.length}</strong> stafettlag påmeldt
            {' - '}
            <strong>{teams.filter((t) => t.status === 'checked_in').length}</strong> sjekket inn
            {' - '}
            <strong>
              {teams.filter((t) => (t.legs?.filter((l) => l.athlete_id) || []).length === legCount).length}
            </strong>{' '}
            med alle etapper tildelt
          </p>
        </div>
      )}
    </div>
  );
}
