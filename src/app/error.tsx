'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div
          className="text-8xl font-heading font-bold mb-4"
          style={{ color: 'var(--accent-coral)' }}
        >
          500
        </div>
        <h1
          className="text-2xl font-heading font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Something went wrong
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-transform hover:scale-105"
          style={{ background: 'var(--accent-primary)' }}
        >
          <svg
            width={18}
            height={18}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
          Try Again
        </button>
      </motion.div>
    </div>
  );
}
