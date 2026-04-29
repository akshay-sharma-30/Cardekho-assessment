'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clear as clearStore,
  read,
  remove,
  subscribe,
} from '@/lib/compare-store';
import type { Car, MediaLink } from '@/lib/types';

const FUEL_LABEL: Record<string, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  hybrid: 'Hybrid',
  electric: 'Electric',
};

const TRANSMISSION_LABEL: Record<string, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
};

const BODY_LABEL: Record<string, string> = {
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  muv: 'MUV',
  'compact-suv': 'Compact SUV',
};

interface CarApiResponse {
  car: Car;
  totalViews: number;
  totalLeads: number;
}

function formatPrice(lakh: number): string {
  return `₹${lakh.toFixed(1)} L`;
}

// ─── Spec rows ────────────────────────────────────────────────────────────────
// Each row knows how to render its display text and (optionally) extract a
// numeric value used to pick the "best" car per row. `better` decides whether
// higher or lower wins. If `value` returns undefined for any car, the row is
// skipped from highlighting (gracefully handles missing data).
type SpecRow = {
  label: string;
  render: (c: Car) => string;
  value?: (c: Car) => number | undefined;
  better?: 'high' | 'low';
};

const SPEC_ROWS: SpecRow[] = [
  { label: 'Body', render: (c) => BODY_LABEL[c.body] ?? c.body },
  { label: 'Fuel', render: (c) => FUEL_LABEL[c.fuel] ?? c.fuel },
  {
    label: 'Transmission',
    render: (c) => TRANSMISSION_LABEL[c.transmission] ?? c.transmission,
  },
  { label: 'Seats', render: (c) => `${c.seats}`, value: (c) => c.seats, better: 'high' },
  {
    label: 'FE (kmpl)',
    render: (c) => `${c.fuelEfficiencyKmpl}`,
    value: (c) => c.fuelEfficiencyKmpl,
    better: 'high',
  },
  {
    label: 'Safety (★)',
    render: (c) => `${c.safetyStars}`,
    value: (c) => c.safetyStars,
    better: 'high',
  },
  {
    label: 'Boot (L)',
    render: (c) => `${c.bootLitres}`,
    value: (c) => c.bootLitres,
    better: 'high',
  },
  {
    label: 'Length (mm)',
    render: (c) => `${c.lengthMm}`,
    value: (c) => c.lengthMm,
    better: 'high',
  },
  {
    label: 'Ground (mm)',
    render: (c) => `${c.groundClearanceMm}`,
    value: (c) => c.groundClearanceMm,
    better: 'high',
  },
];

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingState({ count }: { count: number }) {
  return (
    <section className="border border-rule bg-paper-dark/30 p-12 md:p-16">
      <p className="kicker text-center">§ Fetching dossiers …</p>
      <div className="mt-8 flex flex-col items-center gap-3">
        {Array.from({ length: count > 0 ? count : 3 }).map((_, i) => (
          <div
            key={i}
            className="h-px w-48 md:w-72 bg-rule animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Top-review cell ──────────────────────────────────────────────────────────
function TopReview({ media }: { media: MediaLink[] }) {
  const first = media[0];
  if (!first) {
    return (
      <p className="font-display italic text-sm text-ink-muted">
        No reviews on file yet.
      </p>
    );
  }
  if (first.type === 'youtube' && first.youtubeId) {
    return (
      <figure className="space-y-3">
        <div
          className="relative w-full bg-paper-deep/40"
          style={{ aspectRatio: '16 / 9' }}
        >
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${first.youtubeId}`}
            loading="lazy"
            allowFullScreen
            title={first.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
        <figcaption className="space-y-1">
          <p className="kicker">{first.source}</p>
          <p className="font-display italic text-sm text-ink-soft leading-snug">
            {first.title}
          </p>
        </figcaption>
      </figure>
    );
  }
  // article fallback — thin link card with kicker source + italic title + mono cta
  return (
    <a
      href={first.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border border-rule bg-paper p-4 hover:border-ink transition-colors duration-300"
    >
      <p className="kicker">{first.source}</p>
      <p className="mt-2 font-display italic text-sm text-ink leading-snug">
        {first.title}
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-kicker text-accent group-hover:text-accent-deep transition-colors">
        → Read on {first.source}
      </p>
    </a>
  );
}

// ─── Compute "best" car indices per spec row ─────────────────────────────────
// Returns a Map<rowLabel, Set<carIndex>> with the winning indices.
// Returns an empty set for the row when:
//   - any car is missing the value (defensive)
//   - all cars tie
function useBestPerRow(cars: Car[]): Map<string, Set<number>> {
  return useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const row of SPEC_ROWS) {
      if (!row.value || !row.better) {
        map.set(row.label, new Set());
        continue;
      }
      const values = cars.map((c) => row.value!(c));
      if (values.some((v) => v === undefined)) {
        map.set(row.label, new Set());
        continue;
      }
      const nums = values as number[];
      const best = row.better === 'high' ? Math.max(...nums) : Math.min(...nums);
      const winners = nums
        .map((v, i) => (v === best ? i : -1))
        .filter((i) => i >= 0);
      // If all tie, no highlight.
      if (winners.length === cars.length) {
        map.set(row.label, new Set());
      } else {
        map.set(row.label, new Set(winners));
      }
    }
    // Price (lower is better) — handled separately in the column header.
    return map;
  }, [cars]);
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [mounted, setMounted] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [cars, setCars] = useState<Car[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the cars for a given list of ids; preserves the input order.
  const loadCars = useCallback(async (currentIds: string[]) => {
    if (currentIds.length === 0) {
      setCars([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all(
        currentIds.map((id) =>
          fetch(`/api/cars/${id}`).then(async (r) => {
            if (!r.ok) throw new Error(`Failed to load car ${id}`);
            return (await r.json()) as CarApiResponse;
          }),
        ),
      );
      setCars(responses.map((r) => r.car));
    } catch (err) {
      console.error('[/compare] failed to load cars', err);
      setError('Could not load some cars. Please try again.');
      setCars(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const initial = read();
    setIds(initial);
    void loadCars(initial);

    const unsub = subscribe((next) => {
      setIds(next);
      void loadCars(next);
    });
    return unsub;
  }, [loadCars]);

  // Pre-mount placeholder — keeps SSR markup minimal & predictable.
  if (!mounted) {
    return (
      <div className="space-y-20">
        <header className="grid grid-cols-12 gap-x-6 items-end">
          <div className="col-span-12 md:col-span-2">
            <p className="kicker">§ The compare</p>
          </div>
          <div className="col-span-12 md:col-span-9 mt-4 md:mt-0">
            <h1 className="display text-[40px] md:text-[60px] leading-[1.02] tracking-tight text-ink">
              <span className="display-italic">Side</span>-by-side.
            </h1>
          </div>
        </header>
      </div>
    );
  }

  const headerCount = ids.length;
  const carsLoaded = cars && cars.length > 0;

  return (
    <div className="space-y-20">
      {/* ── Page masthead ────────────────────────────────────────────────── */}
      <header className="grid grid-cols-12 gap-x-6 items-end">
        <div className="col-span-12 md:col-span-2">
          <p className="kicker">§ The compare</p>
        </div>
        <div className="col-span-12 md:col-span-10 mt-4 md:mt-0">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 className="display text-[40px] md:text-[60px] leading-[1.02] tracking-tight text-ink">
                <span className="display-italic">Side</span>-by-side.
              </h1>
              <p className="kicker mt-4">
                {headerCount === 0
                  ? 'No cars yet · the deciding factors only'
                  : `${headerCount} car${headerCount === 1 ? '' : 's'} · the deciding factors only`}
              </p>
            </div>
            {headerCount > 0 && (
              <button
                type="button"
                onClick={() => clearStore()}
                aria-label="Clear all cars from comparison"
                className="font-mono text-[10px] uppercase tracking-kicker px-3 py-2 border border-rule bg-paper text-ink-soft hover:border-ink hover:text-ink transition-all duration-300"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="rule" />

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {ids.length === 0 && (
        <section className="border border-rule bg-paper-dark/30 p-10 md:p-16">
          <div className="grid grid-cols-12 gap-x-6">
            <div className="col-span-12 md:col-span-2">
              <p className="kicker">§ Nothing to compare yet</p>
            </div>
            <div className="col-span-12 md:col-span-9 mt-4 md:mt-0">
              <h2 className="display text-3xl md:text-4xl leading-tight">
                Add cars from your{' '}
                <span className="display-italic text-accent">shortlist</span>.
              </h2>
              <p className="mt-5 font-display italic text-lg text-ink-soft max-w-2xl leading-snug">
                Pick any persona, then tap + Compare on a car you&apos;re
                considering — up to three.
              </p>
              <div className="mt-8">
                <Link
                  href="/"
                  className="kicker text-accent border-b border-accent/40 hover:border-accent pb-1 transition-colors duration-300"
                >
                  → Pick a persona
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Loading state ────────────────────────────────────────────────── */}
      {ids.length > 0 && loading && cars === null && (
        <LoadingState count={ids.length} />
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {error && (
        <section className="border border-accent bg-accent-soft/30 p-6">
          <p className="kicker text-accent-deep">§ Something broke</p>
          <p className="mt-2 font-display italic text-base text-ink-soft">
            {error}
          </p>
        </section>
      )}

      {/* ── Comparison body ──────────────────────────────────────────────── */}
      {ids.length > 0 && carsLoaded && cars && (
        <ComparisonBody cars={cars} />
      )}
    </div>
  );
}

// ─── Comparison body — separate so we can call useMemo for "best" hints ─────
function ComparisonBody({ cars }: { cars: Car[] }) {
  const bestPerRow = useBestPerRow(cars);

  // Price (lower is better)
  const bestPrice = useMemo(() => {
    const prices = cars.map((c) => c.priceLakh);
    if (prices.length === 0) return new Set<number>();
    const min = Math.min(...prices);
    const winners = prices
      .map((p, i) => (p === min ? i : -1))
      .filter((i) => i >= 0);
    if (winners.length === cars.length) return new Set<number>();
    return new Set(winners);
  }, [cars]);

  return (
    <>
      {/* ── Mobile: stacked editorial blocks ────────────────────────────── */}
      <div className="md:hidden space-y-px bg-rule border border-rule">
        {cars.map((car, i) => (
          <article key={car.id} className="bg-paper p-6 relative">
            <button
              type="button"
              onClick={() => remove(car.id)}
              aria-label={`Remove ${car.brand} ${car.model} from comparison`}
              className="absolute top-4 right-4 font-mono text-[14px] leading-none text-ink-muted hover:text-accent-deep transition-colors w-7 h-7 inline-flex items-center justify-center border border-rule hover:border-accent-deep"
            >
              ×
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={car.imageUrl}
              alt={`${car.brand} ${car.model} ${car.variant}`}
              className="w-full aspect-[16/10] object-cover bg-paper-deep/40"
            />

            <div className="mt-5 space-y-1">
              <p className="kicker">{car.brand}</p>
              <h2 className="display text-[26px] leading-[1.1] tracking-tight text-ink">
                {car.model}
              </h2>
              <p className="font-display italic text-base text-ink-muted">
                {car.variant}
              </p>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span
                className={`font-mono text-2xl tabular-nums tracking-tight ${
                  bestPrice.has(i) ? 'text-forest' : 'text-ink'
                }`}
              >
                {formatPrice(car.priceLakh)}
              </span>
              <span className="kicker">ex-showroom</span>
            </div>

            <dl className="mt-6 border-t border-rule">
              {SPEC_ROWS.map((row) => {
                const winners = bestPerRow.get(row.label) ?? new Set<number>();
                const isBest = winners.has(i);
                return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-3 border-b border-rule"
                  >
                    <dt className="kicker">{row.label}</dt>
                    <dd
                      className={`font-mono text-sm tabular-nums capitalize ${
                        isBest ? 'text-forest' : 'text-ink'
                      }`}
                    >
                      {row.render(car)}
                    </dd>
                  </div>
                );
              })}
            </dl>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <p className="kicker text-forest">The case for</p>
                <ul className="mt-3 space-y-2">
                  {car.prosCons.pros.slice(0, 3).map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-sm text-ink-soft leading-snug"
                    >
                      <span
                        className="mt-[2px] font-mono text-[10px] text-forest shrink-0"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="kicker text-accent-deep">The case against</p>
                <ul className="mt-3 space-y-2">
                  {car.prosCons.cons.slice(0, 3).map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-2 text-sm text-ink-soft leading-snug"
                    >
                      <span
                        className="mt-[2px] font-mono text-[10px] text-accent-deep shrink-0"
                        aria-hidden="true"
                      >
                        ✗
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6">
              <p className="kicker">§ Top review</p>
              <div className="mt-3">
                <TopReview media={car.media} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ── Desktop: editorial spec sheet (sticky label column) ─────────── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-5 px-5 pb-2">
          <div
            className="grid min-w-fit border border-rule bg-rule"
            style={{
              gridTemplateColumns: `minmax(180px, 220px) repeat(${cars.length}, minmax(280px, 1fr))`,
              gap: '1px',
            }}
          >
            {/* Row: column headers (image, brand kicker, model, variant, price) */}
            <div className="sticky left-0 z-10 bg-paper-dark/40 px-5 py-6 self-stretch flex flex-col justify-end">
              <p className="kicker">§ The contenders</p>
            </div>
            {cars.map((car, i) => (
              <div
                key={`hdr-${car.id}`}
                className="bg-paper p-6 relative"
              >
                <button
                  type="button"
                  onClick={() => remove(car.id)}
                  aria-label={`Remove ${car.brand} ${car.model} from comparison`}
                  className="absolute top-3 right-3 z-10 font-mono text-[14px] leading-none text-ink-muted hover:text-accent-deep transition-colors w-7 h-7 inline-flex items-center justify-center border border-rule hover:border-accent-deep bg-paper"
                >
                  ×
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={car.imageUrl}
                  alt={`${car.brand} ${car.model} ${car.variant}`}
                  className="w-full aspect-[16/10] object-cover bg-paper-deep/40"
                />
                <div className="mt-4 space-y-1">
                  <p className="kicker">{car.brand}</p>
                  <h2 className="display text-[28px] leading-[1.05] tracking-tight text-ink truncate">
                    {car.model}
                  </h2>
                  <p className="font-display italic text-base text-ink-muted truncate">
                    {car.variant}
                  </p>
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <span
                    className={`font-mono text-2xl tabular-nums tracking-tight ${
                      bestPrice.has(i) ? 'text-forest' : 'text-ink'
                    }`}
                  >
                    {formatPrice(car.priceLakh)}
                  </span>
                  <span className="kicker">ex-showroom</span>
                </div>
              </div>
            ))}

            {/* Spec rows */}
            {SPEC_ROWS.map((row, rowIdx) => {
              const winners = bestPerRow.get(row.label) ?? new Set<number>();
              const stripe = rowIdx % 2 === 1;
              return (
                <RowGroup
                  key={row.label}
                  label={row.label}
                  cars={cars}
                  render={row.render}
                  winners={winners}
                  stripe={stripe}
                />
              );
            })}

            {/* Pros — "The case for" */}
            <div className="sticky left-0 z-10 bg-paper-dark/40 px-5 py-5 self-stretch flex items-start">
              <p className="kicker text-forest">The case for</p>
            </div>
            {cars.map((car) => (
              <div key={`pros-${car.id}`} className="bg-paper px-6 py-5">
                <ul className="space-y-2">
                  {car.prosCons.pros.slice(0, 3).map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-sm text-ink-soft leading-snug"
                    >
                      <span
                        className="mt-[2px] font-mono text-[10px] text-forest shrink-0"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Cons — "The case against" */}
            <div className="sticky left-0 z-10 bg-paper-dark/40 px-5 py-5 self-stretch flex items-start">
              <p className="kicker text-accent-deep">The case against</p>
            </div>
            {cars.map((car) => (
              <div key={`cons-${car.id}`} className="bg-paper px-6 py-5">
                <ul className="space-y-2">
                  {car.prosCons.cons.slice(0, 3).map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-2 text-sm text-ink-soft leading-snug"
                    >
                      <span
                        className="mt-[2px] font-mono text-[10px] text-accent-deep shrink-0"
                        aria-hidden="true"
                      >
                        ✗
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Top review */}
            <div className="sticky left-0 z-10 bg-paper-dark/40 px-5 py-5 self-stretch flex items-start">
              <p className="kicker">§ Top review</p>
            </div>
            {cars.map((car) => (
              <div key={`rev-${car.id}`} className="bg-paper px-6 py-5">
                <TopReview media={car.media} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom "Next" block ─────────────────────────────────────────── */}
      <section className="grid grid-cols-12 gap-x-6 mt-20 pt-10 border-t border-rule">
        <div className="col-span-12 md:col-span-2">
          <p className="kicker">§ Next</p>
        </div>
        <div className="col-span-12 md:col-span-10 mt-4 md:mt-0 space-y-3">
          {cars.map((car) => (
            <Link
              key={`next-${car.id}`}
              href={`/cars/${car.id}`}
              className="group flex items-baseline gap-3 border-b border-rule hover:border-ink py-3 transition-colors duration-300"
            >
              <span className="font-display text-lg md:text-xl text-ink">
                {car.brand} {car.model}
              </span>
              <span className="font-display italic text-base text-ink-muted">
                {car.variant}
              </span>
              <span className="block flex-1 h-px bg-rule/60 group-hover:bg-ink/40 transition-colors duration-500" />
              <span className="kicker text-accent">Read the dossier</span>
              <span className="font-display text-xl text-accent leading-none transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

// ─── Internal: a single labeled spec row in the desktop grid ─────────────────
function RowGroup({
  label,
  cars,
  render,
  winners,
  stripe,
}: {
  label: string;
  cars: Car[];
  render: (c: Car) => string;
  winners: Set<number>;
  stripe: boolean;
}) {
  const labelBg = stripe ? 'bg-paper-dark/50' : 'bg-paper-dark/40';
  const cellBg = stripe ? 'bg-paper-dark/30' : 'bg-paper';
  return (
    <>
      <div
        className={`sticky left-0 z-10 ${labelBg} px-5 py-4 self-stretch flex items-center`}
      >
        <p className="kicker">{label}</p>
      </div>
      {cars.map((car, i) => {
        const isBest = winners.has(i);
        return (
          <div
            key={`${label}-${car.id}`}
            className={`${cellBg} px-6 py-4 flex items-center`}
          >
            <span
              className={`font-mono text-sm tabular-nums capitalize ${
                isBest ? 'text-forest' : 'text-ink'
              }`}
            >
              {render(car)}
            </span>
          </div>
        );
      })}
    </>
  );
}
