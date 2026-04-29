'use client';

import { useEffect, useRef } from 'react';

interface Props {
  carId: string;
  personaId?: string | null;
}

// Fires a single POST /api/views on mount. Lives client-side so RSC prefetches
// and CDN warmups don't inflate the counter. Failure is silent — analytics
// must never break the page.
export default function RecordView({ carId, personaId }: Props) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId, personaId: personaId ?? undefined }),
      keepalive: true,
    }).catch(() => {});
  }, [carId, personaId]);
  return null;
}
