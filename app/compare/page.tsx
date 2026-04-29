'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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

// Spec rows in the order they should render down each column.
const SPEC_ROWS: { label: string; render: (c: Car) => string }[] = [
  { label: 'Body', render: (c) => BODY_LABEL[c.body] ?? c.body },
  { label: 'Fuel', render: (c) => FUEL_LABEL[c.fuel] ?? c.fuel },
  {
    label: 'Transmission',
    render: (c) => TRANSMISSION_LABEL[c.transmission] ?? c.transmission,
  },
  { label: 'Seats', render: (c) => `${c.seats}` },
  { label: 'Fuel efficiency', render: (c) => `${c.fuelEfficiencyKmpl} kmpl` },
  {
    label: 'Safety',
    render: (c) => `${c.safetyStars}${c.safetyStars === 1 ? ' star' : ' stars'}`,
  },
  { label: 'Boot', render: (c) => `${c.bootLitres} L` },
  { label: 'Length', render: (c) => `${c.lengthMm} mm` },
  { label: 'Ground clearance', render: (c) => `${c.groundClearanceMm} mm` },
];

function CarColumnSkeleton() {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm min-w-[280px] flex-1 animate-pulse">
      <div className="aspect-[16/10] w-full rounded-2xl bg-ink-soft/10" />
      <div className="mt-4 h-5 w-2/3 rounded bg-ink-soft/10" />
      <div className="mt-2 h-4 w-1/2 rounded bg-ink-soft/10" />
      <div className="mt-4 h-7 w-1/3 rounded bg-ink-soft/10" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-ink-soft/5" />
        ))}
      </div>
    </div>
  );
}

function TopReview({ media }: { media: MediaLink[] }) {
  const first = media[0];
  if (!first) {
    return <p className="text-sm text-ink-muted">No reviews yet.</p>;
  }
  if (first.type === 'youtube' && first.youtubeId) {
    return (
      <figure className="space-y-2">
        <div className="relative aspect-video">
          <iframe
            className="absolute inset-0 w-full h-full rounded-2xl"
            src={`https://www.youtube.com/embed/${first.youtubeId}`}
            loading="lazy"
            allowFullScreen
            title={first.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
        <figcaption className="text-xs text-ink-soft leading-snug">
          <span className="font-medium text-ink">{first.title}</span>
          <span className="text-ink-muted"> · {first.source}</span>
        </figcaption>
      </figure>
    );
  }
  // article fallback
  return (
    <a
      href={first.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-black/5 bg-white p-4 hover:border-accent/40 transition"
    >
      <p className="font-medium text-ink leading-snug text-sm">{first.title}</p>
      <p className="mt-1 text-xs text-ink-muted">{first.source}</p>
      <span className="mt-2 inline-block text-xs font-medium text-accent">
        Read on {first.source} →
      </span>
    </a>
  );
}

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
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Compare</h1>
        </header>
      </div>
    );
  }

  const headerCount = ids.length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
            {headerCount === 0
              ? 'Compare'
              : `Compare ${headerCount} car${headerCount === 1 ? '' : 's'}`}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Side-by-side specs, pros, cons, and reviewer takes.
          </p>
        </div>
        {headerCount > 0 && (
          <button
            type="button"
            onClick={() => clearStore()}
            className="text-sm text-ink-muted hover:text-ink underline underline-offset-4"
          >
            Clear all
          </button>
        )}
      </header>

      {/* Empty state */}
      {ids.length === 0 && (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-10 text-center">
          <p className="text-base text-ink-soft">
            Nothing to compare yet — add cars from your persona shortlist.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 transition"
          >
            Pick a persona
          </Link>
        </div>
      )}

      {/* Loading skeleton */}
      {ids.length > 0 && loading && cars === null && (
        <div className="overflow-x-auto -mx-5 px-5">
          <div className="flex gap-5 min-w-fit">
            {ids.map((id) => (
              <CarColumnSkeleton key={id} />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Comparison grid */}
      {ids.length > 0 && cars && cars.length > 0 && (
        <>
          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-5">
            {cars.map((car) => (
              <article
                key={car.id}
                className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold tracking-tight text-lg truncate">
                      {car.brand} {car.model}
                    </h2>
                    <p className="text-xs text-ink-muted truncate">
                      {car.variant}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(car.id)}
                    aria-label={`Remove ${car.brand} ${car.model} from comparison`}
                    className="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-full bg-ink-soft/5 text-ink-muted hover:bg-ink-soft/10 hover:text-ink transition"
                  >
                    ×
                  </button>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={car.imageUrl}
                  alt={`${car.brand} ${car.model} ${car.variant}`}
                  className="mt-4 w-full aspect-[16/10] rounded-2xl object-cover bg-ink-soft/5"
                />

                <div className="mt-4 text-2xl font-semibold tabular-nums">
                  {formatPrice(car.priceLakh)}
                </div>

                <dl className="mt-4 divide-y divide-black/5">
                  {SPEC_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <dt className="text-ink-muted">{row.label}</dt>
                      <dd className="font-medium tabular-nums capitalize">
                        {row.render(car)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Pros
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {car.prosCons.pros.slice(0, 3).map((p) => (
                        <li
                          key={p}
                          className="flex items-start gap-2 text-sm text-ink-soft"
                        >
                          <span
                            className="mt-0.5 text-emerald-600 font-bold"
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
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Cons
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {car.prosCons.cons.slice(0, 3).map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-2 text-sm text-ink-soft"
                        >
                          <span
                            className="mt-0.5 text-red-600 font-bold"
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

                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Top review
                  </h3>
                  <div className="mt-2">
                    <TopReview media={car.media} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop: CSS grid with sticky label column. Each row is a labeled
              spec; each car gets its own column. The label column is sticky
              for horizontal scroll on overflow. */}
          <div className="hidden md:block">
            <div className="overflow-x-auto -mx-5 px-5 pb-2">
              <div
                className="grid gap-5 min-w-fit"
                style={{
                  gridTemplateColumns: `minmax(160px, 200px) repeat(${cars.length}, minmax(280px, 1fr))`,
                }}
              >
                {/* Row: header (title block) */}
                <div className="sticky left-0 bg-[#fafaf7] z-10" />
                {cars.map((car) => (
                  <div
                    key={`hdr-${car.id}`}
                    className="rounded-t-3xl border border-b-0 border-black/5 bg-white p-6 shadow-sm relative"
                  >
                    <button
                      type="button"
                      onClick={() => remove(car.id)}
                      aria-label={`Remove ${car.brand} ${car.model} from comparison`}
                      className="absolute top-3 right-3 inline-flex w-7 h-7 items-center justify-center rounded-full bg-ink-soft/5 text-ink-muted hover:bg-ink-soft/10 hover:text-ink transition"
                    >
                      ×
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={car.imageUrl}
                      alt={`${car.brand} ${car.model} ${car.variant}`}
                      className="w-full aspect-[16/10] rounded-2xl object-cover bg-ink-soft/5"
                    />
                    <h2 className="mt-4 font-semibold tracking-tight text-lg leading-tight">
                      {car.brand} {car.model}
                    </h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {car.variant}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                      {formatPrice(car.priceLakh)}
                    </p>
                    <p className="text-xs text-ink-muted">ex-showroom</p>
                  </div>
                ))}

                {/* Spec rows: each row spans label cell + one cell per car */}
                {SPEC_ROWS.map((row, rowIdx) => (
                  <RowGroup
                    key={row.label}
                    label={row.label}
                    isLast={false}
                    isFirst={rowIdx === 0}
                    cars={cars}
                    render={row.render}
                  />
                ))}

                {/* Pros */}
                <div className="sticky left-0 bg-[#fafaf7] z-10 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-700 self-start">
                  Pros
                </div>
                {cars.map((car) => (
                  <div
                    key={`pros-${car.id}`}
                    className="border-x border-black/5 bg-white px-6 py-4"
                  >
                    <ul className="space-y-1.5">
                      {car.prosCons.pros.slice(0, 3).map((p) => (
                        <li
                          key={p}
                          className="flex items-start gap-2 text-sm text-ink-soft"
                        >
                          <span
                            className="mt-0.5 text-emerald-600 font-bold"
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

                {/* Cons */}
                <div className="sticky left-0 bg-[#fafaf7] z-10 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-red-700 self-start">
                  Cons
                </div>
                {cars.map((car) => (
                  <div
                    key={`cons-${car.id}`}
                    className="border-x border-black/5 bg-white px-6 py-4"
                  >
                    <ul className="space-y-1.5">
                      {car.prosCons.cons.slice(0, 3).map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-2 text-sm text-ink-soft"
                        >
                          <span
                            className="mt-0.5 text-red-600 font-bold"
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

                {/* Top review (last row, rounded bottom) */}
                <div className="sticky left-0 bg-[#fafaf7] z-10 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted self-start">
                  Top review
                </div>
                {cars.map((car) => (
                  <div
                    key={`rev-${car.id}`}
                    className="rounded-b-3xl border border-t-0 border-black/5 bg-white px-6 py-5 shadow-sm"
                  >
                    <TopReview media={car.media} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Internal: a single labeled spec row in the desktop grid. Renders the sticky
// label cell + one value cell per car, preserving border + background between
// the header and the trailing rows so the column reads as one connected card.
function RowGroup({
  label,
  cars,
  render,
}: {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  cars: Car[];
  render: (c: Car) => string;
}) {
  return (
    <>
      <div className="sticky left-0 bg-[#fafaf7] z-10 px-2 py-3 text-sm text-ink-muted self-center">
        {label}
      </div>
      {cars.map((car) => (
        <div
          key={`${label}-${car.id}`}
          className="border-x border-black/5 bg-white px-6 py-3 text-sm font-medium tabular-nums capitalize"
        >
          {render(car)}
        </div>
      ))}
    </>
  );
}
