import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repo } from '@/lib/repo';
import LeadForm from '@/components/LeadForm';
import MediaEmbed from '@/components/MediaEmbed';
import WhyThisCar from '@/components/WhyThisCar';

interface PageProps {
  params: { id: string };
  searchParams: { persona?: string };
}

const FUEL_LABEL: Record<string, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  hybrid: 'Hybrid',
  electric: 'Electric',
};

const TRANSMISSION_LABEL: Record<string, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
};

const BODY_LABEL: Record<string, string> = {
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  muv: 'MUV',
  'compact-suv': 'Compact SUV',
};

function SpecBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white border border-black/5 px-3 py-1 text-xs font-medium text-ink-soft shadow-sm">
      {children}
    </span>
  );
}

function SpecRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-black/5 last:border-b-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink tabular-nums">{value}</dd>
    </div>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const car = repo.car(params.id);
  if (!car) notFound();

  const persona = searchParams.persona ? repo.persona(searchParams.persona) : null;

  repo.recordView({ carId: car.id, personaId: persona?.id ?? null });

  const backHref = persona ? `/personas/${persona.id}` : '/';
  const backLabel = persona ? persona.title : 'all personas';

  return (
    <div className="space-y-10">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-ink-muted hover:text-ink transition"
      >
        <span aria-hidden="true" className="mr-1">←</span>
        Back to {backLabel}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-10">
        {/* LEFT column */}
        <div className="space-y-6">
          <div className="relative w-full aspect-[16/10] rounded-3xl overflow-hidden bg-neutral-100">
            <Image
              src={car.imageUrl}
              alt={`${car.brand} ${car.model} ${car.variant}`}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          </div>

          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
              {car.brand} {car.model}{' '}
              <span className="text-ink-muted font-medium">{car.variant}</span>
            </h1>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-ink tabular-nums">
                ₹{car.priceLakh.toFixed(1)} L
              </span>
              <span className="text-sm text-ink-muted">ex-showroom</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SpecBadge>{BODY_LABEL[car.body] ?? car.body}</SpecBadge>
            <SpecBadge>{FUEL_LABEL[car.fuel] ?? car.fuel}</SpecBadge>
            <SpecBadge>{TRANSMISSION_LABEL[car.transmission] ?? car.transmission}</SpecBadge>
            <SpecBadge>{car.seats} seats</SpecBadge>
          </div>

          <blockquote className="border-l-2 border-accent pl-4 italic text-ink-soft text-base sm:text-lg leading-relaxed">
            “{car.oneLiner}”
          </blockquote>
        </div>

        {/* RIGHT column */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Key spec
            </h2>
            <dl className="mt-3">
              <SpecRow label="Fuel efficiency" value={`${car.fuelEfficiencyKmpl} kmpl`} />
              <SpecRow
                label="Safety"
                value={`${car.safetyStars}${car.safetyStars === 1 ? ' star' : ' stars'}`}
              />
              <SpecRow label="Boot" value={`${car.bootLitres} L`} />
              <SpecRow label="Length" value={`${car.lengthMm} mm`} />
              <SpecRow label="Ground clearance" value={`${car.groundClearanceMm} mm`} />
            </dl>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Pros & cons
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Pros
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {car.prosCons.pros.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-ink-soft">
                      <span className="mt-0.5 text-emerald-600 font-bold" aria-hidden="true">
                        ✓
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  Cons
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {car.prosCons.cons.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-ink-soft">
                      <span className="mt-0.5 text-red-600 font-bold" aria-hidden="true">
                        ✗
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {persona && <WhyThisCar persona={persona} car={car} />}
        </div>
      </div>

      {/* What reviewers say */}
      <MediaEmbed media={car.media} />

      {/* CTA card */}
      <section
        id="book"
        className="rounded-3xl bg-gradient-to-br from-ink to-ink-soft text-white p-6 sm:p-10 shadow-xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
              Free · No obligation
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Interested? Book a free test drive
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Dealer will call within 24 hours. Drive the {car.brand} {car.model} on your own
              streets — no showroom pressure.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <span className="text-accent" aria-hidden="true">✓</span>
                Curated dealers, vetted by CarFit
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent" aria-hidden="true">✓</span>
                One callback, then no spam
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent" aria-hidden="true">✓</span>
                Cancel any time
              </li>
            </ul>
          </div>

          <div className="text-ink">
            <LeadForm carId={car.id} personaId={persona?.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
