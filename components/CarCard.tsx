import Link from 'next/link';
import Image from 'next/image';
import type { MatchResult } from '@/lib/types';
import MatchScoreBadge from './MatchScoreBadge';
import CompareButton from './CompareButton';

interface Props {
  match: MatchResult;
  expanded?: boolean;
  personaId?: string;
  index?: number;
}

function SpecChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-kicker text-ink-muted">
      {children}
    </span>
  );
}

function formatPrice(lakh: number): string {
  return `₹${lakh.toFixed(1)} L`;
}

export default function CarCard({ match, expanded = false, personaId, index }: Props) {
  const { car, score, fitTier, reasons } = match;
  const href = `/cars/${car.id}${personaId ? `?persona=${personaId}` : ''}`;
  const topReasons = reasons.filter((r) => r.passed).slice(0, 2);

  const imageWidth = expanded ? 320 : 200;
  const imageHeight = expanded ? 200 : 130;

  return (
    <Link
      href={href}
      className={`group relative flex bg-paper border-y border-rule transition-all duration-500 hover:bg-paper-dark/40 focus-visible:outline-none focus-visible:bg-paper-dark/60 ${
        expanded ? 'flex-col md:flex-row w-full p-6 md:p-8 gap-6 md:gap-8' : 'flex-col w-full p-5 gap-4'
      }`}
    >
      {/* Compare toggle — absolutely positioned, doesn't disturb flow */}
      <div className={`absolute z-10 ${expanded ? 'top-4 right-4' : 'top-3 right-3'}`}>
        <CompareButton carId={car.id} variant="compact" />
      </div>

      <div
        className={`relative shrink-0 overflow-hidden bg-paper-deep/40 ${
          expanded ? 'w-full md:w-[320px] h-[200px]' : 'w-full h-[160px]'
        }`}
      >
        <Image
          src={car.imageUrl}
          alt={`${car.brand} ${car.model} ${car.variant}`}
          width={imageWidth}
          height={imageHeight}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />
        {typeof index === 'number' && (
          <span className="absolute top-3 left-3 kicker bg-paper/90 px-2 py-1">
            №{String(index).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="kicker mb-1.5">{car.brand}</p>
            <h3 className="display text-2xl md:text-[28px] leading-[1.1] tracking-tight text-ink truncate">
              {car.model}
            </h3>
            <p className="font-display italic text-ink-muted text-base mt-0.5">
              {car.variant}
            </p>
          </div>
          <div className="shrink-0">
            <MatchScoreBadge score={score} tier={fitTier} />
          </div>
        </div>

        {/* Price as the editorial price-tag — large, mono numerals, not a button */}
        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-mono text-2xl tabular-nums text-ink tracking-tight">
            {formatPrice(car.priceLakh)}
          </span>
          <span className="kicker">ex-showroom</span>
        </div>

        {/* Spec strip — mono uppercase, dot separators, not pill chips */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <SpecChip>{car.body.replace('-', ' ')}</SpecChip>
          <span className="text-rule">·</span>
          <SpecChip>{car.fuel}</SpecChip>
          <span className="text-rule">·</span>
          <SpecChip>{car.transmission}</SpecChip>
          <span className="text-rule">·</span>
          <SpecChip>{car.seats} seats</SpecChip>
        </div>

        {expanded && (
          <>
            {car.oneLiner && (
              <p className="mt-6 font-display italic text-lg text-ink-soft leading-snug max-w-xl">
                &ldquo;{car.oneLiner}&rdquo;
              </p>
            )}
            {topReasons.length > 0 && (
              <ul className="mt-6 space-y-2">
                {topReasons.map((r, i) => (
                  <li
                    key={`${r.criterion}-${i}`}
                    className="flex items-start gap-3 text-sm text-ink-soft"
                  >
                    <span className="mt-[3px] font-mono text-[10px] tracking-kicker uppercase text-forest shrink-0">
                      ✓ fits
                    </span>
                    <span className="leading-relaxed">{r.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 pt-4 flex items-center gap-3 text-accent border-t border-rule/60">
              <span className="kicker text-accent">Read the dossier</span>
              <span className="block flex-1 h-px bg-accent/30 origin-left scale-x-50 transition-transform duration-500 group-hover:scale-x-100" />
              <span className="font-display text-xl leading-none transition-transform duration-500 group-hover:translate-x-1">→</span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
