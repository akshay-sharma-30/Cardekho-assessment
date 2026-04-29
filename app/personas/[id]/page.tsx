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

  if (searchParams.budget) {
    const n = Number(searchParams.budget);
    if (!Number.isNaN(n)) {
      overrides.budgetMaxLakh = Math.min(40, Math.max(4, n));
      hasOverride = true;
    }
  }
  if (searchParams.seats) {
    const n = Number(searchParams.seats);
    if (VALID_SEATS.includes(n)) {
      overrides.seats = n;
      hasOverride = true;
    }
  }
  if (searchParams.trans === 'manual' || searchParams.trans === 'automatic') {
    overrides.transmission = searchParams.trans as Transmission;
    hasOverride = true;
  }
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
  const aboveStretch = allMatches.filter((m) => m.fitTier !== 'stretch');

  const heroMatches = allMatches.slice(0, 3);
  const otherStrong = allMatches
    .slice(3, 8)
    .filter((m) => m.fitTier !== 'stretch');

  const popular = repo.popularInPersona(persona.id, 3);
  const popularCars = popular
    .map((p) => repo.car(p.carId))
    .filter((c): c is NonNullable<ReturnType<typeof repo.car>> => c !== null);

  return (
    <div className="space-y-20">
      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/"
          className="kicker inline-flex items-center gap-2 hover:text-ink transition"
        >
          <span aria-hidden="true">←</span>
          All personas
        </Link>
      </div>

      {/* ── Persona masthead ─────────────────────────────────────────────── */}
      <header className="grid grid-cols-12 gap-x-6 items-start">
        <div className="col-span-12 md:col-span-2">
          <p className="kicker">The reader</p>
          <div className="text-5xl mt-3 leading-none" aria-hidden="true">
            {persona.emoji}
          </div>
        </div>
        <div className="col-span-12 md:col-span-9 mt-6 md:mt-0">
          {hasOverride && (
            <span className="kicker text-accent inline-block mb-3">
              · Tweaked from default ·
            </span>
          )}
          <h1 className="display text-[40px] md:text-[60px] leading-[1.02] tracking-tight text-ink">
            {persona.title}
          </h1>
          <p className="mt-5 font-display italic text-xl text-ink-soft max-w-2xl leading-snug">
            {persona.tagline}
          </p>
          <p className="mt-5 text-base text-ink-muted max-w-2xl leading-relaxed">
            {persona.description}
          </p>
          <div className="mt-8">
            <p className="kicker mb-3">The brief</p>
            <PrefChips preferences={tweakedPersona.preferences} />
          </div>
        </div>
      </header>

      <div className="rule" />

      {/* ── Tweak panel ──────────────────────────────────────────────────── */}
      <PersonaTweakPanel defaults={persona.preferences} personaId={persona.id} />

      {/* ── Shortlist ────────────────────────────────────────────────────── */}
      {aboveStretch.length === 0 ? (
        <section className="border border-rule p-12 text-center">
          <p className="kicker">No fit found</p>
          <h2 className="display text-3xl mt-3">
            We couldn&apos;t find a strong fit.
          </h2>
          <p className="mt-3 text-ink-muted">
            Try widening your budget or shifting persona.
          </p>
        </section>
      ) : (
        <>
          <section>
            <div className="grid grid-cols-12 gap-x-6 mb-8">
              <div className="col-span-12 md:col-span-2">
                <p className="kicker">§ Shortlist</p>
              </div>
              <div className="col-span-12 md:col-span-9 flex items-end justify-between">
                <h2 className="display text-3xl md:text-4xl">
                  Your three.
                </h2>
                <span className="kicker">
                  Top {heroMatches.length} of {allMatches.length}
                </span>
              </div>
            </div>
            <div className="border-y border-rule">
              {heroMatches.map((match, i) => (
                <CarCard
                  key={match.car.id}
                  match={match}
                  expanded
                  personaId={persona.id}
                  index={i + 1}
                />
              ))}
            </div>
          </section>

          {otherStrong.length > 0 && (
            <section>
              <div className="grid grid-cols-12 gap-x-6 mb-8">
                <div className="col-span-12 md:col-span-2">
                  <p className="kicker">§ Honourable</p>
                </div>
                <div className="col-span-12 md:col-span-9">
                  <h2 className="display text-2xl md:text-3xl">
                    Other strong{' '}
                    <span className="display-italic text-accent">candidates</span>
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
                {otherStrong.map((match, i) => (
                  <CarCard
                    key={match.car.id}
                    match={match}
                    personaId={persona.id}
                    index={heroMatches.length + i + 1}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Popular strip ────────────────────────────────────────────────── */}
      {popularCars.length > 0 && (
        <section>
          <div className="grid grid-cols-12 gap-x-6 mb-6">
            <div className="col-span-12 md:col-span-2">
              <p className="kicker">§ Word-of-mouth</p>
            </div>
            <div className="col-span-12 md:col-span-9">
              <h2 className="display text-xl md:text-2xl">
                Popular with other{' '}
                <span className="display-italic text-accent">
                  {persona.title.toLowerCase()}
                </span>{' '}
                buyers
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 pl-0 md:pl-[16.666667%]">
            {popularCars.map((car) => (
              <Link
                key={car.id}
                href={`/cars/${car.id}?persona=${persona.id}`}
                className="group inline-flex items-baseline gap-3 border-b border-rule hover:border-ink py-1 transition-colors duration-300"
              >
                <span className="font-display text-base text-ink">
                  {car.brand} {car.model}
                </span>
                <span className="font-mono text-[11px] text-ink-muted tabular-nums">
                  ₹{car.priceLakh.toFixed(1)}L
                </span>
                <span className="font-display text-sm text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
