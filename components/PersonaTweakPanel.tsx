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

export default function PersonaTweakPanel({ defaults, personaId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // ─── Derive current effective values from URL or defaults ──────────────
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

  // ─── Helper to mutate one param and push the URL ───────────────────────
  function pushParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const qs = next.toString();
    router.replace(qs ? `/personas/${personaId}?${qs}` : `/personas/${personaId}`, {
      scroll: false,
    });
  }

  function onBudgetChange(v: number) {
    pushParams((p) => {
      p.set('budget', String(v));
    });
  }

  function onSeatsChange(v: number) {
    pushParams((p) => {
      p.set('seats', String(v));
    });
  }

  function onTransChange(v: 'any' | 'manual' | 'automatic') {
    pushParams((p) => {
      if (v === 'any') p.delete('trans');
      else p.set('trans', v);
    });
  }

  function toggleFuel(f: FuelType) {
    const next = currentFuel.includes(f)
      ? currentFuel.filter((x) => x !== f)
      : [...currentFuel, f];
    pushParams((p) => {
      if (next.length === 0) {
        // Empty means "no override" — clear so we don't end up with zero allowed fuels
        p.delete('fuel');
      } else {
        p.set('fuel', next.join(','));
      }
    });
  }

  function onSafetyChange(v: number) {
    pushParams((p) => {
      p.set('safety', String(v));
    });
  }

  function onReset() {
    router.replace(`/personas/${personaId}`, { scroll: false });
  }

  const hasOverride =
    !!budgetParam || !!seatsParam || !!transParam || !!fuelParam || !!safetyParam;

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base md:text-lg font-semibold tracking-tight">
            Tweak the fit
          </h3>
          {hasOverride && (
            <span className="inline-flex items-center rounded-full bg-accent-soft text-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Tweaked
            </span>
          )}
        </div>
        <span
          className={`text-ink-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-ink-soft">Budget cap</label>
                <span className="text-sm font-semibold text-accent">
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
              <div className="flex justify-between text-[10px] text-ink-muted uppercase tracking-wider">
                <span>₹4L</span>
                <span>₹40L</span>
              </div>
            </div>

            {/* Seats */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-soft">Required seats</label>
              <div className="flex flex-wrap gap-2">
                {SEATS_OPTIONS.map((s) => {
                  const active = currentSeats === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSeatsChange(s)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${
                        active
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-ink-soft border-black/10 hover:border-accent/50'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transmission */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-soft">Transmission</label>
              <div className="flex flex-wrap gap-2">
                {TRANSMISSION_OPTIONS.map((opt) => {
                  const active = currentTrans === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onTransChange(opt.value)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${
                        active
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-ink-soft border-black/10 hover:border-accent/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Safety */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-soft">Safety floor</label>
              <div className="flex flex-wrap gap-2">
                {SAFETY_OPTIONS.map((s) => {
                  const active = currentSafety === s;
                  const label = s === 5 ? '5★' : `${s}★+`;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSafetyChange(s)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${
                        active
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-ink-soft border-black/10 hover:border-accent/50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fuel — full width */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-soft">Allowed fuels</label>
            <div className="flex flex-wrap gap-2">
              {FUEL_OPTIONS.map((f) => {
                const active = currentFuel.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFuel(f)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition capitalize ${
                      active
                        ? 'bg-accent text-white border-accent'
                        : 'bg-white text-ink-soft border-black/10 hover:border-accent/50'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-black/5 pt-4">
            <p className="text-xs text-ink-muted">
              Changes re-rank your shortlist live.
            </p>
            <button
              type="button"
              onClick={onReset}
              disabled={!hasOverride}
              className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm text-ink-soft transition hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
