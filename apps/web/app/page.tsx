import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
          MiniMeet
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Athletics event management and live results platform
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-blue-900 rounded-md hover:bg-blue-800 transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-blue-900 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
