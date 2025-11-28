import Link from 'next/link';
import { Plus, Building2, Users, MoreVertical } from 'lucide-react';

export default function OrganizationsPage() {
  // TODO: Fetch organizations from database
  const organizations: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-600">
            Manage your clubs and federations
          </p>
        </div>
        <Link
          href="/dashboard/organizations/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Organization
        </Link>
      </div>

      {/* Organizations list */}
      {organizations.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="py-12">
            <div className="text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No organizations yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create an organization to start managing competitions
              </p>
              <Link
                href="/dashboard/organizations/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Organization
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/dashboard/organizations/${org.id}`}
            >
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-900" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {org.name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 mt-1">
                          {org.type}
                        </span>
                      </div>
                    </div>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {org.member_count || 0} members
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
