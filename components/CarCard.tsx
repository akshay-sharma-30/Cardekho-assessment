import Link from 'next/link';
import Image from 'next/image';
import type { MatchResult } from '@/lib/types';
import MatchScoreBadge from './MatchScoreBadge';

interface Props {
  match: MatchResult;
  expanded?: boolean;
  personaId?: string;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ink-soft/5 text-ink-soft px-2.5 py-0.5 text-xs capitalize">
      {children}
    </span>
  );
}

function formatPrice(lakh: number): string {
  return `₹${lakh.toFixed(1)} L`;
}

export default function CarCard({ match, expanded = false, personaId }: Props) {
  const { car, score, fitTier, reasons } = match;
  const href = `/cars/${car.id}${personaId ? `?persona=${personaId}` : ''}`;
  const topReasons = reasons.filter((r) => r.passed).slice(0, 2);

  const imageWidth = expanded ? 220 : 140;
  const imageHeight = expanded ? 160 : 100;

  return (
    <Link
      href={href}
      className={`group relative flex bg-white rounded-2xl border border-black/5 shadow-sm transition duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
        expanded ? 'w-full p-5 gap-5' : 'w-full p-4 gap-4'
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl bg-ink-soft/5 ${
          expanded ? 'w-[220px] h-[160px]' : 'w-[140px] h-[100px]'
        }`}
      >
        <Image
          src={car.imageUrl}
          alt={`${car.brand} ${car.model} ${car.variant}`}
          width={imageWidth}
          height={imageHeight}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold tracking-tight text-base truncate">
              {car.brand} {car.model}
            </h3>
            <p className="text-xs text-ink-muted truncate">{car.variant}</p>
          </div>
          <div className="shrink-0">
            <MatchScoreBadge score={score} tier={fitTier} />
          </div>
        </div>

        <div className="mt-2 font-semibold text-lg tabular-nums">
          {formatPrice(car.priceLakh)}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill>{car.body.replace('-', ' ')}</Pill>
          <Pill>{car.fuel}</Pill>
          <Pill>{car.transmission}</Pill>
        </div>

        {expanded && (
          <>
            {car.oneLiner && (
              <p className="mt-3 italic text-sm text-ink-soft/80 border-l-2 border-accent/40 pl-3">
                “{car.oneLiner}”
              </p>
            )}
            {topReasons.length > 0 && (
              <ul className="mt-3 space-y-1">
                {topReasons.map((r, i) => (
                  <li
                    key={`${r.criterion}-${i}`}
                    className="flex items-start gap-2 text-sm text-ink-soft"
                  >
                    <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 text-[10px] shrink-0">
                      ✓
                    </span>
                    <span>{r.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
