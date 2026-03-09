'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/formatCurrency';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: boolean;
}

export function AnimatedNumber({ value, className, format = true }: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    prevValue.current = end;

    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span className={className}>
      {format ? formatCurrency(displayed) : Math.round(displayed).toString()}
    </span>
  );
}
