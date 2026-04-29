import type { MatchResult } from '@/lib/types';

interface Props {
  score: number;
  tier: MatchResult['fitTier'];
}

const TIER_STYLES: Record<MatchResult['fitTier'], { num: string; label: string }> = {
  excellent: { num: 'text-forest', label: 'text-forest' },
  strong:    { num: 'text-accent-deep', label: 'text-accent-deep' },
  good:      { num: 'text-gold', label: 'text-gold' },
  stretch:   { num: 'text-ink-muted', label: 'text-ink-faint' },
};

const TIER_LABEL: Record<MatchResult['fitTier'], string> = {
  excellent: 'Excellent fit',
  strong: 'Strong fit',
  good: 'Good fit',
  stretch: 'Stretch',
};

export default function MatchScoreBadge({ score, tier }: Props) {
  const rounded = Math.round(score);
  const style = TIER_STYLES[tier];
  return (
    <div
      className="inline-flex flex-col items-end leading-none"
      aria-label={`Match score ${rounded} out of 100, ${TIER_LABEL[tier]}`}
    >
      <span className={`font-display text-[40px] leading-none tabular-nums ${style.num}`}>
        {rounded}
      </span>
      <span className={`mt-1 font-mono text-[9px] uppercase tracking-kicker ${style.label}`}>
        {TIER_LABEL[tier]} · /100
      </span>
    </div>
  );
}
