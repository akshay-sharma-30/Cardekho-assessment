import type { Car, MatchResult, Persona } from '@/lib/types';
import { matchCarsToPersona } from '@/lib/matcher';
import MatchScoreBadge from './MatchScoreBadge';

interface Props {
  persona: Persona;
  car: Car;
}

const TIER_PHRASE: Record<MatchResult['fitTier'], string> = {
  excellent: 'An excellent fit.',
  strong: 'A strong candidate.',
  good: 'A reasonable fit.',
  stretch: 'More of a stretch.',
};

export default function WhyThisCar({ persona, car }: Props) {
  const match = matchCarsToPersona(persona, [car])[0];
  if (!match) return null;

  const passedCount = match.reasons.filter((r) => r.passed).length;
  const isAllStretch = passedCount === 0;

  // Sort: passed first, then by weight desc within each group.
  const sortedReasons = [...match.reasons].sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1;
    return b.weight - a.weight;
  });

  const headline = isAllStretch ? 'More stretch than fit.' : TIER_PHRASE[match.fitTier];

  return (
    <section className="border-y border-rule py-10">
      {/* Header row: kicker + score + display phrase */}
      <div className="grid grid-cols-12 gap-x-6 items-end">
        <div className="col-span-12 md:col-span-2 mb-4 md:mb-0">
          <p className="kicker">§ Match score</p>
        </div>
        <div className="col-span-12 md:col-span-9 flex items-end justify-between gap-6 flex-wrap">
          <h3 className="display text-2xl md:text-3xl leading-tight text-ink max-w-xl">
            {headline}
          </h3>
          {!isAllStretch ? (
            <MatchScoreBadge score={match.score} tier={match.fitTier} />
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-kicker text-ink-muted">
              Score withheld · all criteria miss
            </span>
          )}
        </div>
      </div>

      <div className="rule mt-8" />

      {/* Reasons list — each row is a 12-col grid: kicker col 1-2, detail col 3-11 */}
      <ul className="mt-8 space-y-5">
        {sortedReasons.map((r) => (
          <li
            key={r.criterion}
            className="grid grid-cols-12 gap-x-6 items-baseline"
          >
            <div className="col-span-12 md:col-span-2 mb-1 md:mb-0">
              <p className="kicker">§ {r.criterion}</p>
            </div>
            <div className="col-span-12 md:col-span-9 flex items-baseline gap-3 flex-wrap">
              <span
                className={`font-mono text-[10px] uppercase tracking-kicker shrink-0 ${
                  r.passed ? 'text-forest' : 'text-accent-deep'
                }`}
                aria-hidden="true"
              >
                {r.passed ? '✓ fits' : '✗ misses'}
              </span>
              <span className="text-sm md:text-base text-ink-soft leading-snug">
                {r.detail}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
