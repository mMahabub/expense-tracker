'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export function QuickAddFAB() {
  const pathname = usePathname();

  // Hide on add/edit pages
  if (pathname.includes('/add') || pathname.includes('/edit')) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
    >
      <Link
        href="/expenses/add"
        className="flex items-center justify-center w-14 h-14 rounded-2xl text-white shadow-xl transition-all duration-200 hover:shadow-2xl active:scale-90"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
        }}
      >
        <svg width={24} height={24} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </motion.div>
  );
}
