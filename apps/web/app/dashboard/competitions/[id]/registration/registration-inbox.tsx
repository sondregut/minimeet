'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveRegistration,
  rejectRegistration,
  bulkApproveRegistrations,
  bulkRejectRegistrations,
  type Registration,
} from '@/lib/actions/registrations';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Trophy,
  Filter,
  Download,
} from 'lucide-react';

interface RegistrationInboxProps {
  competitionId: string;
  registrations: Registration[];
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'waitlist';

export function RegistrationInbox({ competitionId, registrations }: RegistrationInboxProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Filter registrations
  const filteredRegistrations = registrations.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const handleApprove = async (registrationId: string) => {
    startTransition(async () => {
      await approveRegistration(registrationId);
      router.refresh();
    });
  };

  const handleReject = async (registrationId: string) => {
    startTransition(async () => {
      await rejectRegistration(registrationId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      router.refresh();
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      await bulkApproveRegistrations(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      await bulkRejectRegistrations(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllPending = () => {
    const pendingIds = registrations
      .filter(r => r.status === 'pending')
      .map(r => r.id);
    setSelectedIds(new Set(pendingIds));
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
      waitlist: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <AlertCircle className="w-3 h-3" /> },
      withdrawn: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-3 h-3" /> },
    };
    const style = styles[status] || styles.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {status}
      </span>
    );
  };

  if (registrations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations yet</h3>
        <p className="text-gray-500">
          Registrations will appear here when athletes sign up for your competition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All ({registrations.length})</option>
              <option value="pending">Pending ({registrations.filter(r => r.status === 'pending').length})</option>
              <option value="approved">Approved ({registrations.filter(r => r.status === 'approved').length})</option>
              <option value="rejected">Rejected ({registrations.filter(r => r.status === 'rejected').length})</option>
              <option value="waitlist">Waitlist ({registrations.filter(r => r.status === 'waitlist').length})</option>
            </select>
          </div>

          {/* Selection Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkApprove}
                disabled={isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve All
              </button>
              <button
                onClick={handleBulkReject}
                disabled={isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject All
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={selectAllPending}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Select all pending
          </button>
        </div>
      </div>

      {/* Registration List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredRegistrations.map((registration) => (
          <div key={registration.id} className="border-b border-gray-100 last:border-0">
            {/* Main Row */}
            <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedIds.has(registration.id)}
                onChange={() => toggleSelection(registration.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />

              {/* Expand/Collapse */}
              <button
                onClick={() => setExpandedId(expandedId === registration.id ? null : registration.id)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {expandedId === registration.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {/* Athlete Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {registration.first_name} {registration.last_name}
                  </span>
                  {getStatusBadge(registration.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {registration.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {registration.email}
                    </span>
                  )}
                  {registration.club_name && (
                    <span>{registration.club_name}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {registration.registration_events?.length || 0} events
                  </span>
                </div>
              </div>

              {/* Date */}
              <div className="text-sm text-gray-500">
                {new Date(registration.created_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              {registration.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(registration.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(rejectingId === registration.id ? null : registration.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>

            {/* Reject Reason Input */}
            {rejectingId === registration.id && (
              <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-red-800 mb-1">
                      Rejection Reason (optional)
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g., Does not meet qualification standards"
                      className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <button
                    onClick={() => handleReject(registration.id)}
                    disabled={isPending}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 text-gray-600 text-sm hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expanded Details */}
            {expandedId === registration.id && (
              <div className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Personal Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Personal Information</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Gender:</dt>
                        <dd className="text-gray-900">{registration.gender === 'M' ? 'Male' : registration.gender === 'W' ? 'Female' : 'Other'}</dd>
                      </div>
                      {registration.date_of_birth && (
                        <div className="flex">
                          <dt className="text-gray-500 w-24">DOB:</dt>
                          <dd className="text-gray-900">{new Date(registration.date_of_birth).toLocaleDateString()}</dd>
                        </div>
                      )}
                      {registration.nationality && (
                        <div className="flex">
                          <dt className="text-gray-500 w-24">Nationality:</dt>
                          <dd className="text-gray-900">{registration.nationality}</dd>
                        </div>
                      )}
                      {registration.phone && (
                        <div className="flex">
                          <dt className="text-gray-500 w-24">Phone:</dt>
                          <dd className="text-gray-900">{registration.phone}</dd>
                        </div>
                      )}
                      {registration.license_number && (
                        <div className="flex">
                          <dt className="text-gray-500 w-24">License:</dt>
                          <dd className="text-gray-900">{registration.license_number}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Events */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Registered Events</h4>
                    {registration.registration_events && registration.registration_events.length > 0 ? (
                      <ul className="space-y-2">
                        {registration.registration_events.map((re) => (
                          <li key={re.id} className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded border">
                            <span className="font-medium text-gray-900">
                              {re.event?.name || 'Unknown Event'}
                            </span>
                            <div className="flex items-center gap-2 text-gray-500">
                              {re.pb_mark && <span>PB: {re.pb_mark}</span>}
                              {re.sb_mark && <span>SB: {re.sb_mark}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No events selected</p>
                    )}
                  </div>

                  {/* Messages & Notes */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                    {registration.athlete_message ? (
                      <div className="bg-white p-3 rounded border text-sm">
                        <p className="text-gray-600 text-xs mb-1">Message from athlete:</p>
                        <p className="text-gray-900">{registration.athlete_message}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No message from athlete</p>
                    )}
                    {registration.rejection_reason && (
                      <div className="bg-red-50 p-3 rounded border border-red-200 text-sm mt-2">
                        <p className="text-red-600 text-xs mb-1">Rejection reason:</p>
                        <p className="text-red-900">{registration.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
