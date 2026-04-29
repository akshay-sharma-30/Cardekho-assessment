import { notFound } from 'next/navigation';
import Link from 'next/link';
import { repo } from '@/lib/repo';
import { matchCarsToPersona } from '@/lib/matcher';
import type { MatchResult } from '@/lib/types';
import PrefChips from '@/components/PrefChips';
import CarCard from '@/components/CarCard';

interface PageProps {
  params: { id: string };
}

export default function PersonaPage({ params }: PageProps) {
  const persona = repo.persona(params.id);
  if (!persona) notFound();

  const allMatches: MatchResult[] = matchCarsToPersona(persona, repo.allCars());
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
        <PrefChips preferences={persona.preferences} />
      </header>

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
