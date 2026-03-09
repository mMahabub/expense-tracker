'use client';

import { motion } from 'framer-motion';
import { CurrencyCode } from '@/types/expense';
import { CURRENCIES } from '@/lib/constants';

interface CurrencySelectorProps {
  currency: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
}

export function CurrencySelector({ currency, onChange }: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Object.values(CURRENCIES).map((c) => {
        const isActive = currency === c.code;
        return (
          <motion.button
            key={c.code}
            whileTap={{ scale: 0.93 }}
            onClick={() => onChange(c.code as CurrencyCode)}
            className="relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
            }}
            title={c.name}
          >
            {c.symbol} {c.code}
          </motion.button>
        );
      })}
    </div>
  );
}
