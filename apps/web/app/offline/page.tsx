import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-blue-900" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Ingen internettforbindelse
        </h1>

        <p className="text-gray-600 mb-8">
          Det ser ut som du er offline. Sjekk internettforbindelsen din og prøv igjen.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Prøv igjen
        </button>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            EasyMeet - Friidrettsstevne
          </p>
        </div>
      </div>
    </div>
  );
}
