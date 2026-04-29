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

  // Editorial pill: mono kicker, paper-toned background, no rounded-full.
  const isCompact = variant === 'compact';
  const sizeClasses = isCompact
    ? 'px-2.5 py-1 text-[10px]'
    : 'px-3.5 py-1.5 text-[11px]';
  const baseClasses = `inline-flex items-center gap-1.5 font-mono uppercase tracking-kicker transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/60 ${sizeClasses}`;

  if (!mounted) {
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
    stateClasses = 'border border-forest/40 bg-forest/10 text-forest';
  } else if (cartFull) {
    label = `Cart full · ${MAX_ITEMS}`;
    stateClasses = 'border border-rule bg-paper-dark/40 text-ink-faint cursor-not-allowed';
    disabled = true;
  } else {
    label = '+ Compare';
    stateClasses =
      'border border-ink/30 bg-paper text-ink-soft hover:bg-ink hover:text-paper hover:border-ink';
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
