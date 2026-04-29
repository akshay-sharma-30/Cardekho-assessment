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
      className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-3.5 py-1.5 text-xs font-medium shadow-sm hover:bg-accent/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label={`Compare ${ids.length} cars`}
    >
      <span aria-hidden="true" className="text-sm leading-none">⇄</span>
      <span>Compare ({ids.length})</span>
    </Link>
  );
}
