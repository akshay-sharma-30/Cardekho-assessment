import { notFound } from 'next/navigation';
import Link from 'next/link';
import { repo } from '@/lib/repo';
import { matchCarsToPersona } from '@/lib/matcher';
import type { FuelType, MatchResult, Persona, Transmission } from '@/lib/types';
import PrefChips from '@/components/PrefChips';
import CarCard from '@/components/CarCard';
import PersonaTweakPanel from '@/components/PersonaTweakPanel';

interface PageProps {
  params: { id: string };
  searchParams: {
    budget?: string;
    seats?: string;
    trans?: string;
    fuel?: string;
    safety?: string;
  };
}

const VALID_FUELS: FuelType[] = ['petrol', 'diesel', 'cng', 'hybrid', 'electric'];
const VALID_SEATS = [4, 5, 7];
const VALID_SAFETY = [3, 4, 5];

function parseOverrides(
  searchParams: PageProps['searchParams'],
): { overrides: Partial<Persona['preferences']>; hasOverride: boolean } {
  const overrides: Partial<Persona['preferences']> = {};
  let hasOverride = false;

  // Budget — clamp to [4, 40]
  if (searchParams.budget) {
    const n = Number(searchParams.budget);
    if (!Number.isNaN(n)) {
      overrides.budgetMaxLakh = Math.min(40, Math.max(4, n));
      hasOverride = true;
    }
  }

  // Seats — must be 4 / 5 / 7
  if (searchParams.seats) {
    const n = Number(searchParams.seats);
    if (VALID_SEATS.includes(n)) {
      overrides.seats = n;
      hasOverride = true;
    }
  }

  // Transmission — must be manual or automatic
  if (searchParams.trans === 'manual' || searchParams.trans === 'automatic') {
    overrides.transmission = searchParams.trans as Transmission;
    hasOverride = true;
  }

  // Fuel — comma-split, filter to valid FuelType values
  if (searchParams.fuel) {
    const parsed = searchParams.fuel
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is FuelType => VALID_FUELS.includes(s as FuelType));
    if (parsed.length > 0) {
      overrides.fuel = parsed;
      hasOverride = true;
    }
  }

  // Safety floor — must be 3 / 4 / 5
  if (searchParams.safety) {
    const n = Number(searchParams.safety);
    if (VALID_SAFETY.includes(n)) {
      overrides.safetyMin = n;
      hasOverride = true;
    }
  }

  return { overrides, hasOverride };
}

export default function PersonaPage({ params, searchParams }: PageProps) {
  const persona = repo.persona(params.id);
  if (!persona) notFound();

  const { overrides, hasOverride } = parseOverrides(searchParams);
  const tweakedPersona: Persona = {
    ...persona,
    preferences: { ...persona.preferences, ...overrides },
  };

  const allMatches: MatchResult[] = matchCarsToPersona(tweakedPersona, repo.allCars());
  const aboveStretch = allMatches.filter((m: MatchResult) => m.fitTier !== 'stretch');

  const heroMatches = allMatches.slice(0, 3);
  const otherStrong = allMatches
    .slice(3, 8)
    .filter((m: MatchResult) => m.fitTier !== 'stretch');

  const popular = repo.popularInPersona(persona.id, 3);
  const popularCars = popular
    .map((p) => repo.car(p.carId))
    .filter((c): c is NonNullable<ReturnType<typeof repo.car>> => c !== null);

  return (
    <div className="space-y-14">
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-sm text-ink-muted hover:text-ink transition"
        >
          ← All personas
        </Link>
      </div>

      <header className="space-y-5">
        <div className="text-6xl leading-none" aria-hidden="true">
          {persona.emoji}
        </div>
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
            {persona.title}
          </h1>
          <p className="text-base md:text-lg text-ink-muted leading-relaxed">
            {persona.description}
          </p>
        </div>
        <div className="space-y-2">
          {hasOverride && (
            <span className="inline-flex items-center rounded-full bg-accent-soft text-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Tweaked
            </span>
          )}
          <PrefChips preferences={tweakedPersona.preferences} />
        </div>
      </header>

      <PersonaTweakPanel defaults={persona.preferences} personaId={persona.id} />

      {aboveStretch.length === 0 ? (
        <section className="rounded-2xl border border-black/5 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            We couldn&apos;t find a strong fit.
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Try widening your budget or shifting persona.
          </p>
        </section>
      ) : (
        <>
          <section className="space-y-5">
            <div className="flex items-end justify-between">
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                Your shortlist
              </h2>
              <span className="text-xs uppercase tracking-wider text-ink-muted">
                Top {heroMatches.length} of {allMatches.length}
              </span>
            </div>
            <div className="space-y-4">
              {heroMatches.map((match: MatchResult) => (
                <CarCard
                  key={match.car.id}
                  match={match}
                  expanded
                  personaId={persona.id}
                />
              ))}
            </div>
          </section>

          {otherStrong.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                Other strong matches
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherStrong.map((match: MatchResult) => (
                  <CarCard key={match.car.id} match={match} personaId={persona.id} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {popularCars.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-lg md:text-xl font-semibold tracking-tight">
            Popular with other {persona.title.toLowerCase()} buyers
          </h2>
          <div className="flex flex-wrap gap-3">
            {popularCars.map((car) => (
              <Link
                key={car.id}
                href={`/cars/${car.id}?persona=${persona.id}`}
                className="inline-flex items-center gap-3 bg-white rounded-full border border-black/5 px-4 py-2 text-sm shadow-sm hover:shadow-md transition"
              >
                <span className="font-medium">
                  {car.brand} {car.model}
                </span>
                <span className="text-ink-muted text-xs">
                  ₹{car.priceLakh.toFixed(1)}L
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
