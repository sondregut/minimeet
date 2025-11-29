'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { searchPublicAthletes } from '@/lib/actions/public';

type Athlete = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string;
  nationality: string;
  club_name: string | null;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function getYearFromDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return new Date(dateStr).getFullYear();
}

function getGenderLabel(gender: string): string {
  switch (gender) {
    case 'M': return 'Men';
    case 'W': return 'Women';
    case 'X': return 'Mixed';
    default: return gender;
  }
}

export default function AthleteSearchPage() {
  const [query, setQuery] = useState('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const searchAthletes = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setAthletes([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchPublicAthletes(searchQuery);
      setAthletes(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching athletes:', error);
      setAthletes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    searchAthletes(debouncedQuery);
  }, [debouncedQuery, searchAthletes]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/results" className="text-blue-200 hover:text-white text-sm mb-2 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Link>
          <h1 className="text-3xl font-bold mb-2">Athlete Search</h1>
          <p className="text-blue-200">
            Find athletes and view their competition history
          </p>
        </div>
      </header>

      {/* Search Section */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by athlete name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-sm text-gray-500 mt-2">Type at least 2 characters to search</p>
          )}
        </div>
      </div>

      {/* Results */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {hasSearched && athletes.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No athletes found for &quot;{debouncedQuery}&quot;</p>
            <p className="text-sm text-gray-400 mt-1">Try a different name or check the spelling</p>
          </div>
        )}

        {athletes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-4">
              Found {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
            </p>
            {athletes.map((athlete) => (
              <Link
                key={athlete.id}
                href={`/results/athletes/${athlete.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {athlete.last_name.toUpperCase()}, {athlete.first_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      {athlete.date_of_birth && (
                        <span>{getYearFromDate(athlete.date_of_birth)}</span>
                      )}
                      {athlete.nationality && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {athlete.nationality}
                        </span>
                      )}
                      {athlete.gender && (
                        <span className="text-xs">{getGenderLabel(athlete.gender)}</span>
                      )}
                      {athlete.club_name && (
                        <span className="text-gray-400">|</span>
                      )}
                      {athlete.club_name && (
                        <span>{athlete.club_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Start typing to search for athletes</p>
            <p className="text-sm text-gray-400 mt-1">Search by first name or last name</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          Powered by <span className="font-semibold">MiniMeet</span>
        </div>
      </footer>
    </div>
  );
}
