import type { Persona } from '@/lib/types';

interface Props {
  preferences: Persona['preferences'];
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-kicker text-ink-soft border-b border-rule pb-1">
      {children}
    </span>
  );
}

export default function PrefChips({ preferences }: Props) {
  const tags: React.ReactNode[] = [];

  tags.push(<Tag key="budget">{`≤ ₹${preferences.budgetMaxLakh}L`}</Tag>);
  tags.push(<Tag key="seats">{`${preferences.seats} seats`}</Tag>);

  if (preferences.transmission) {
    const label = preferences.transmission === 'automatic' ? 'AT' : 'MT';
    tags.push(<Tag key="transmission">{label}</Tag>);
  }

  if (preferences.fuel.length > 0) {
    tags.push(<Tag key="fuel">{preferences.fuel.join(' / ')}</Tag>);
  }

  tags.push(<Tag key="safety">{`≥ ${preferences.safetyMin}★`}</Tag>);

  if (preferences.fuelEfficiencyKmplMin !== undefined) {
    tags.push(<Tag key="kmpl">{`≥ ${preferences.fuelEfficiencyKmplMin} kmpl`}</Tag>);
  }

  if (preferences.parkingFriendly) {
    tags.push(<Tag key="parking">parking-friendly</Tag>);
  }

  if (preferences.highwayCommute) {
    tags.push(<Tag key="highway">highway-ready</Tag>);
  }

  // Render as a centered row with em-dash separators between tags — feels like
  // a magazine cover-line strip rather than a chip cloud.
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-x-4">
          {tag}
          {i < tags.length - 1 && (
            <span className="font-mono text-[10px] text-rule">—</span>
          )}
        </span>
      ))}
    </div>
  );
}
