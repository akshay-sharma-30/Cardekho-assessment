'use client';

import { useEffect, useState } from 'react';
import { add, MAX_ITEMS, read, remove, subscribe } from '@/lib/compare-store';

interface Props {
  carId: string;
  variant?: 'compact' | 'inline';
}

export default function CompareButton({ carId, variant = 'inline' }: Props) {
  const [mounted, setMounted] = useState(false);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    setIds(read());
    const unsub = subscribe((next) => setIds(next));
    return unsub;
  }, []);

  const inCart = ids.includes(carId);
  const cartFull = ids.length >= MAX_ITEMS && !inCart;

  // Reserve layout pre-mount so server-rendered card heights match client.
  // We render an invisible placeholder of approximately the right size.
  const isCompact = variant === 'compact';
  const sizeClasses = isCompact ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm';
  const baseClasses = `inline-flex items-center gap-1 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${sizeClasses}`;

  if (!mounted) {
    // Invisible placeholder to keep layout stable across hydration.
    return (
      <span
        aria-hidden="true"
        className={`${baseClasses} invisible border border-transparent`}
      >
        + Compare
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Critical when this button lives inside a parent <Link> (the CarCard).
    e.stopPropagation();
    e.preventDefault();
    if (inCart) {
      remove(carId);
    } else {
      add(carId);
    }
  };

  let label: string;
  let stateClasses: string;
  let disabled = false;

  if (inCart) {
    label = '✓ In compare';
    stateClasses =
      'border border-black/10 bg-ink-soft/5 text-ink-soft hover:bg-ink-soft/10';
  } else if (cartFull) {
    label = `Cart full (${MAX_ITEMS})`;
    stateClasses =
      'border border-black/10 bg-neutral-100 text-ink-muted cursor-not-allowed opacity-70';
    disabled = true;
  } else {
    label = '+ Compare';
    stateClasses =
      'border border-accent text-accent bg-white hover:bg-accent hover:text-white';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={inCart}
      className={`${baseClasses} ${stateClasses}`}
    >
      {label}
    </button>
  );
}
