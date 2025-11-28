import Link from 'next/link';
import { Plus, Trophy, Users, Calendar, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back!
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your athletics competitions and results
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/competitions/new">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-900" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">New Competition</p>
                <p className="text-sm text-gray-500">Create a new event</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/athletes/new">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Add Athlete</p>
                <p className="text-sm text-gray-500">Register a new athlete</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/organizations">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Organizations</p>
                <p className="text-sm text-gray-500">Manage your clubs</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/competitions">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">All Competitions</p>
                <p className="text-sm text-gray-500">View all events</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent competitions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Competitions</h2>
          <Link
            href="/dashboard/competitions"
            className="text-sm text-blue-900 hover:underline inline-flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="py-12">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No competitions yet
              </h3>
              <p className="text-gray-500 mb-6">
                Get started by creating your first competition
              </p>
              <Link
                href="/dashboard/competitions/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Competition
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Getting started guide */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white rounded-lg">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Getting Started with MiniMeet</h3>
              <p className="text-white/80">
                Learn how to set up competitions, manage entries, and enter results.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-3 bg-white text-blue-900 font-semibold rounded-md hover:bg-gray-100 transition-colors shrink-0">
              View Guide
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
