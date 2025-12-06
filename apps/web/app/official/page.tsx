'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { validateAccessCode } from '@/lib/actions/access-codes';

export default function OfficialLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await validateAccessCode(code);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.success && result.session) {
        // Redirect to official dashboard
        router.push('/official/dashboard');
      }
    } catch {
      setError('Noe gikk galt. Prøv igjen.');
      setIsLoading(false);
    }
  };

  // Format code as user types (XXXX-XXXX or XX-XXXX-XXXX)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Remove existing dashes to reformat
    const withoutDashes = value.replace(/-/g, '');

    // Check if it starts with 2-3 letter prefix
    if (withoutDashes.length > 0) {
      // Format as either XXXX-XXXX or XX-XXXX-XXXX
      if (withoutDashes.length <= 8) {
        // Standard format: XXXX-XXXX
        if (withoutDashes.length > 4) {
          value = withoutDashes.slice(0, 4) + '-' + withoutDashes.slice(4, 8);
        } else {
          value = withoutDashes;
        }
      } else {
        // With prefix: XX-XXXX-XXXX (up to 3 char prefix + 8 chars)
        const prefixLength = Math.min(3, withoutDashes.length - 8);
        if (prefixLength > 0) {
          const prefix = withoutDashes.slice(0, prefixLength);
          const rest = withoutDashes.slice(prefixLength);
          if (rest.length > 4) {
            value = prefix + '-' + rest.slice(0, 4) + '-' + rest.slice(4, 8);
          } else {
            value = prefix + '-' + rest;
          }
        }
      }
    }

    setCode(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>

      <div className="w-full max-w-md relative">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="w-8 h-8 text-emerald-500" />
            <span className="text-2xl font-bold text-white">MiniMeet</span>
          </div>
          <h1 className="text-xl font-medium text-white">Funksjonaerinngang</h1>
          <p className="text-slate-400 mt-2">
            Skriv inn tilgangskoden du har fatt tildelt
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
                Tilgangskode
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="F.eks. HJ-ABCD-1234"
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl text-lg font-mono tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  maxLength={14}
                  autoComplete="off"
                  autoCapitalize="characters"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={code.length < 8 || isLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logger inn...
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Logg inn
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-slate-400 mt-6">
          Har du ikke en kode? Kontakt stevnearrangor for a fa tildelt en.
        </p>
      </div>
    </div>
  );
}
