'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
      <div className="text-center px-4 max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-gray-600 mb-8">
          We encountered an unexpected error. Don&apos;t worry, our team has been notified and is working on a fix.
        </p>
        {error.message && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-mono">{error.message}</p>
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Home className="mr-2 h-5 w-5" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
