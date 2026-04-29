import type { Persona } from '@/lib/types';

interface Props {
  preferences: Persona['preferences'];
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ink-soft/5 text-ink-soft px-3 py-1 text-xs">
      {children}
    </span>
  );
}

export default function PrefChips({ preferences }: Props) {
  const chips: React.ReactNode[] = [];

  chips.push(<Chip key="budget">{`≤ ₹${preferences.budgetMaxLakh}L`}</Chip>);
  chips.push(<Chip key="seats">{`${preferences.seats} seats`}</Chip>);

  if (preferences.transmission) {
    const label = preferences.transmission === 'automatic' ? 'AT preferred' : 'MT preferred';
    chips.push(<Chip key="transmission">{label}</Chip>);
  }

  if (preferences.fuel.length > 0) {
    chips.push(<Chip key="fuel">{preferences.fuel.join(' / ')}</Chip>);
  }

  chips.push(<Chip key="safety">{`≥ ${preferences.safetyMin}★ safety`}</Chip>);

  if (preferences.fuelEfficiencyKmplMin !== undefined) {
    chips.push(
      <Chip key="kmpl">{`≥ ${preferences.fuelEfficiencyKmplMin} kmpl`}</Chip>,
    );
  }

  if (preferences.parkingFriendly) {
    chips.push(<Chip key="parking">parking-friendly</Chip>);
  }

  if (preferences.highwayCommute) {
    chips.push(<Chip key="highway">highway-ready</Chip>);
  }

  return <div className="flex flex-wrap gap-2">{chips}</div>;
}
