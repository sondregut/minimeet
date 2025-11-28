import Link from 'next/link';
import { Plus, Users, Search, Upload } from 'lucide-react';
import { getAthletes } from '@/lib/actions/athletes';

export default async function AthletesPage() {
  const athletes = await getAthletes();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Athletes</h1>
          <p className="text-gray-600">
            Manage your athlete database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/athletes/import"
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/dashboard/athletes/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Athlete
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          placeholder="Search athletes by name..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Athletes list */}
      {athletes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="py-12">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No athletes yet
              </h3>
              <p className="text-gray-500 mb-6">
                Add athletes to your database to register them for competitions
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/dashboard/athletes/import"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import from File
                </Link>
                <Link
                  href="/dashboard/athletes/new"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Athlete
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              {athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">Club</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">Gender</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">DOB</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">Nationality</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3">License</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {athletes.map((athlete) => (
                  <tr key={athlete.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {athlete.first_name} {athlete.last_name}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{athlete.club_name || '-'}</td>
                    <td className="px-4 py-4 text-gray-600">
                      {athlete.gender === 'M' ? 'Male' : athlete.gender === 'W' ? 'Female' : 'Other'}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {athlete.date_of_birth || '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{athlete.nationality}</td>
                    <td className="px-4 py-4 text-gray-600">{athlete.license_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
