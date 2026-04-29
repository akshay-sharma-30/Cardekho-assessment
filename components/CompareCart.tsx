'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { read, subscribe } from '@/lib/compare-store';

export default function CompareCart() {
  // Gate render until after mount so SSR (which sees no localStorage) and the
  // first client paint agree. Without this, the pill would flash for users
  // with a non-empty cart.
  const [mounted, setMounted] = useState(false);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    setIds(read());
    const unsub = subscribe((next) => setIds(next));
    return unsub;
  }, []);

  if (!mounted) return null;
  if (ids.length === 0) return null;

  return (
    <Link
      href="/compare"
      className="group inline-flex items-baseline gap-2 border-b border-accent text-accent hover:border-ink hover:text-ink transition-colors duration-300 focus-visible:outline-none"
      aria-label={`Compare ${ids.length} cars`}
    >
      <span className="font-mono text-[10px] uppercase tracking-kicker">Compare</span>
      <span className="font-display italic text-base leading-none tabular-nums">
        ({String(ids.length).padStart(2, '0')})
      </span>
      <span aria-hidden="true" className="font-display text-base transition-transform duration-300 group-hover:translate-x-0.5">→</span>
    </Link>
  );
}
