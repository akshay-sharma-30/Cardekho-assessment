'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FuelType, Persona } from '@/lib/types';

interface Props {
  defaults: Persona['preferences'];
  personaId: string;
}

const FUEL_OPTIONS: FuelType[] = ['petrol', 'diesel', 'cng', 'hybrid', 'electric'];
const SEATS_OPTIONS = [4, 5, 7];
const SAFETY_OPTIONS = [3, 4, 5];
const TRANSMISSION_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
] as const;

function clampBudget(n: number): number {
  if (Number.isNaN(n)) return 10;
  return Math.min(40, Math.max(4, n));
}

// Reusable editorial toggle button — mono kicker, paper-toned, no rounded-full.
function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono text-[10px] uppercase tracking-kicker px-3 py-2 border transition-all duration-300 ${
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper text-ink-soft border-rule hover:border-ink hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export default function PersonaTweakPanel({ defaults, personaId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const budgetParam = searchParams.get('budget');
  const seatsParam = searchParams.get('seats');
  const transParam = searchParams.get('trans');
  const fuelParam = searchParams.get('fuel');
  const safetyParam = searchParams.get('safety');

  const currentBudget = budgetParam
    ? clampBudget(Number(budgetParam))
    : defaults.budgetMaxLakh;

  const currentSeatsRaw = seatsParam ? Number(seatsParam) : defaults.seats;
  const currentSeats = SEATS_OPTIONS.includes(currentSeatsRaw)
    ? currentSeatsRaw
    : defaults.seats;

  const currentTrans: 'any' | 'manual' | 'automatic' =
    transParam === 'manual' || transParam === 'automatic'
      ? transParam
      : defaults.transmission ?? 'any';

  const currentFuel: FuelType[] = fuelParam
    ? (fuelParam.split(',').filter((f): f is FuelType =>
        FUEL_OPTIONS.includes(f as FuelType),
      ) as FuelType[])
    : defaults.fuel;

  const currentSafetyRaw = safetyParam ? Number(safetyParam) : defaults.safetyMin;
  const currentSafety = SAFETY_OPTIONS.includes(currentSafetyRaw)
    ? currentSafetyRaw
    : defaults.safetyMin;

  function pushParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const qs = next.toString();
    router.replace(qs ? `/personas/${personaId}?${qs}` : `/personas/${personaId}`, {
      scroll: false,
    });
  }

  const onBudgetChange = (v: number) => pushParams((p) => p.set('budget', String(v)));
  const onSeatsChange = (v: number) => pushParams((p) => p.set('seats', String(v)));
  const onTransChange = (v: 'any' | 'manual' | 'automatic') =>
    pushParams((p) => (v === 'any' ? p.delete('trans') : p.set('trans', v)));
  const toggleFuel = (f: FuelType) => {
    const next = currentFuel.includes(f)
      ? currentFuel.filter((x) => x !== f)
      : [...currentFuel, f];
    pushParams((p) => {
      if (next.length === 0) p.delete('fuel');
      else p.set('fuel', next.join(','));
    });
  };
  const onSafetyChange = (v: number) => pushParams((p) => p.set('safety', String(v)));
  const onReset = () => router.replace(`/personas/${personaId}`, { scroll: false });

  const hasOverride =
    !!budgetParam || !!seatsParam || !!transParam || !!fuelParam || !!safetyParam;

  return (
    <section className="border border-rule bg-paper-dark/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left p-6 md:p-8 hover:bg-paper-dark/50 transition-colors duration-300"
        aria-expanded={open}
      >
        <div className="flex items-baseline gap-4">
          <span className="kicker">§ Editor&apos;s tools</span>
          <h3 className="display text-xl md:text-2xl tracking-tight">
            Tweak the{' '}
            <span className="display-italic text-accent">fit</span>
          </h3>
          {hasOverride && <span className="kicker text-accent">· active</span>}
        </div>
        <span
          className={`font-display text-2xl text-ink-muted transition-transform duration-500 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="px-6 md:px-8 pb-8 space-y-8 border-t border-rule pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {/* Budget */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="kicker">Budget ceiling</p>
                <span className="font-mono text-base tabular-nums text-ink">
                  {`₹${currentBudget.toFixed(1)} L`}
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={40}
                step={0.5}
                value={currentBudget}
                onChange={(e) => onBudgetChange(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-kicker text-ink-muted">
                <span>₹4 L</span>
                <span>₹40 L</span>
              </div>
            </div>

            {/* Seats */}
            <div className="space-y-3">
              <p className="kicker">Required seats</p>
              <div className="flex flex-wrap gap-2">
                {SEATS_OPTIONS.map((s) => (
                  <ToggleButton
                    key={s}
                    active={currentSeats === s}
                    onClick={() => onSeatsChange(s)}
                  >
                    {s} · {s === 4 ? 'compact' : s === 5 ? 'family' : 'multi-gen'}
                  </ToggleButton>
                ))}
              </div>
            </div>

            {/* Transmission */}
            <div className="space-y-3">
              <p className="kicker">Transmission</p>
              <div className="flex flex-wrap gap-2">
                {TRANSMISSION_OPTIONS.map((opt) => (
                  <ToggleButton
                    key={opt.value}
                    active={currentTrans === opt.value}
                    onClick={() => onTransChange(opt.value)}
                  >
                    {opt.label}
                  </ToggleButton>
                ))}
              </div>
            </div>

            {/* Safety */}
            <div className="space-y-3">
              <p className="kicker">Safety floor</p>
              <div className="flex flex-wrap gap-2">
                {SAFETY_OPTIONS.map((s) => (
                  <ToggleButton
                    key={s}
                    active={currentSafety === s}
                    onClick={() => onSafetyChange(s)}
                  >
                    {s === 5 ? '5 stars' : `${s}+ stars`}
                  </ToggleButton>
                ))}
              </div>
            </div>
          </div>

          {/* Fuel — full width */}
          <div className="space-y-3">
            <p className="kicker">Allowed fuels</p>
            <div className="flex flex-wrap gap-2">
              {FUEL_OPTIONS.map((f) => (
                <ToggleButton
                  key={f}
                  active={currentFuel.includes(f)}
                  onClick={() => toggleFuel(f)}
                >
                  {f}
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-rule pt-6">
            <p className="kicker">Changes re-rank your shortlist live</p>
            <button
              type="button"
              onClick={onReset}
              disabled={!hasOverride}
              className="font-mono text-[10px] uppercase tracking-kicker px-3 py-2 border border-ink/30 text-ink-soft hover:bg-ink hover:text-paper hover:border-ink transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
