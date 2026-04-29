import type { MatchResult } from '@/lib/types';

interface Props {
  score: number;
  tier: MatchResult['fitTier'];
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

export default function MatchScoreBadge({ score, tier }: Props) {
  const rounded = Math.round(score);
  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-full px-3 py-1 leading-tight ${TIER_STYLES[tier]}`}
      aria-label={`Match score ${rounded} out of 100, ${TIER_LABEL[tier]}`}
    >
      <span className="text-sm font-semibold tabular-nums">{rounded}</span>
      <span className="text-[10px] uppercase tracking-wide">{TIER_LABEL[tier]}</span>
    </div>
  );
}
