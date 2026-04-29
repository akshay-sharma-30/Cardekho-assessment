import type { Car, MatchResult, Persona } from '@/lib/types';
import { matchCarsToPersona } from '@/lib/matcher';

interface Props {
  persona: Persona;
  car: Car;
}

const TIER_STYLES: Record<MatchResult['fitTier'], string> = {
  excellent: 'bg-emerald-50 text-emerald-700',
  strong: 'bg-blue-50 text-blue-700',
  good: 'bg-amber-50 text-amber-700',
  stretch: 'bg-neutral-100 text-neutral-600',
};

const TIER_LABEL: Record<MatchResult['fitTier'], string> = {
  excellent: 'excellent fit',
  strong: 'strong fit',
  good: 'good fit',
  stretch: 'stretch',
};

export default function WhyThisCar({ persona, car }: Props) {
  const match = matchCarsToPersona(persona, [car])[0];
  if (!match) return null;

  const passedCount = match.reasons.filter((r) => r.passed).length;
  const topReasons = [...match.reasons].sort((a, b) => b.weight - a.weight).slice(0, 4);
  const isStretch = passedCount === 0;
  const rounded = Math.round(match.score);

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-base sm:text-lg leading-snug">
          {isStretch
            ? "This is more of a stretch than a fit — here's why"
            : `Why this fits ${persona.title.toLowerCase()}`}
        </h2>
        <div
          className={`inline-flex flex-col items-center justify-center rounded-full px-3 py-1 leading-tight ${TIER_STYLES[match.fitTier]}`}
          aria-label={`Match score ${rounded} out of 100, ${TIER_LABEL[match.fitTier]}`}
        >
          <span className="text-sm font-semibold tabular-nums">{rounded}</span>
          <span className="text-[10px] uppercase tracking-wide">{TIER_LABEL[match.fitTier]}</span>
        </div>
      </header>

      <ul className="mt-4 space-y-3">
        {topReasons.map((r) => (
          <li key={r.criterion} className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                r.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
              aria-hidden="true"
            >
              {r.passed ? '✓' : '✗'}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                {r.criterion}
              </p>
              <p className="text-sm text-ink-soft leading-snug">{r.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
