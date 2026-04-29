import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repo } from '@/lib/repo';
import LeadForm from '@/components/LeadForm';
import MediaEmbed from '@/components/MediaEmbed';
import WhyThisCar from '@/components/WhyThisCar';
import CompareButton from '@/components/CompareButton';
import RecordView from '@/components/RecordView';

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

// Stable two-digit dossier number derived from the car id — purely cosmetic,
// gives the masthead a sense of being "issue NN" without needing real numbering.
function dossierNo(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String((h % 89) + 10).padStart(2, '0');
}

function SpecCell({ kicker, value }: { kicker: string; value: string }) {
  return (
    <div className="bg-paper py-5 px-5 md:px-6">
      <p className="kicker mb-2">§ {kicker}</p>
      <p className="font-mono text-base md:text-lg tabular-nums text-ink">{value}</p>
    </div>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const car = repo.car(params.id);
  if (!car) notFound();

  const persona = searchParams.persona ? repo.persona(searchParams.persona) : null;

  const backHref = persona ? `/personas/${persona.id}` : '/';
  const backLabel = persona ? persona.title : 'all personas';

  const dossier = dossierNo(car.id);

  return (
    <div className="space-y-20">
      <RecordView carId={car.id} personaId={persona?.id ?? null} />

      {/* ── Back link (kicker style) ─────────────────────────────────────── */}
      <div>
        <Link
          href={backHref}
          className="kicker inline-flex items-center gap-2 hover:text-ink transition-colors duration-300"
        >
          <span aria-hidden="true">←</span>
          {backLabel}
        </Link>
      </div>

      {/* ── Editorial masthead ───────────────────────────────────────────── */}
      <header className="grid grid-cols-12 gap-x-6 items-start">
        <div className="col-span-12 md:col-span-2 mb-4 md:mb-0">
          <p className="kicker">§ Dossier № {dossier}</p>
        </div>
        <div className="col-span-12 md:col-span-10">
          <p className="kicker mb-3">{car.brand}</p>
          <h1 className="display text-[44px] md:text-[60px] leading-[0.98] tracking-tight text-ink">
            {car.model}
          </h1>
          <p className="mt-3 font-display italic text-xl md:text-2xl text-ink-muted leading-snug">
            {car.variant}
          </p>
          <div className="mt-7 flex items-baseline gap-4 flex-wrap">
            <span className="font-mono text-3xl md:text-4xl tabular-nums text-ink tracking-tight">
              ₹{car.priceLakh.toFixed(1)} L
            </span>
            <span className="kicker">ex-showroom</span>
            <div className="ml-auto">
              <CompareButton carId={car.id} variant="inline" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero image — full bleed under masthead ───────────────────────── */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-paper-deep/40">
        <Image
          src={car.imageUrl}
          alt={`${car.brand} ${car.model} ${car.variant}`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* ── Editorial pull-quote ─────────────────────────────────────────── */}
      <section className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12 md:col-span-2 mb-3 md:mb-0">
          <p className="kicker">§ The pitch</p>
        </div>
        <div className="col-span-12 md:col-span-9">
          <blockquote className="font-display italic text-2xl md:text-3xl text-ink-soft leading-snug max-w-3xl">
            &ldquo;{car.oneLiner}&rdquo;
          </blockquote>
        </div>
      </section>

      <div className="rule" />

      {/* ── Spec table ───────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-12 gap-x-6 mb-8">
          <div className="col-span-12 md:col-span-2">
            <p className="kicker">§ Specs</p>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="display text-3xl md:text-4xl leading-tight">
              The numbers,{' '}
              <span className="display-italic text-accent">on paper</span>.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
          <SpecCell kicker="Body" value={BODY_LABEL[car.body] ?? car.body} />
          <SpecCell kicker="Fuel" value={FUEL_LABEL[car.fuel] ?? car.fuel} />
          <SpecCell
            kicker="Transmission"
            value={TRANSMISSION_LABEL[car.transmission] ?? car.transmission}
          />
          <SpecCell kicker="Seats" value={`${car.seats}`} />
          <SpecCell kicker="Boot" value={`${car.bootLitres} L`} />
          <SpecCell kicker="FE" value={`${car.fuelEfficiencyKmpl} kmpl`} />
          <SpecCell kicker="Safety" value={`${car.safetyStars}★`} />
          <SpecCell kicker="Length" value={`${car.lengthMm} mm`} />
          <SpecCell kicker="Ground" value={`${car.groundClearanceMm} mm`} />
        </div>
      </section>

      {/* ── Pros / cons ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border-y border-rule">
        <div className="bg-paper p-6 md:p-8">
          <p className="kicker text-forest mb-4">§ The case for</p>
          <ul className="space-y-3">
            {car.prosCons.pros.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span
                  className="font-mono text-[10px] uppercase tracking-kicker text-forest mt-[6px] shrink-0"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className="text-base text-ink-soft leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-paper p-6 md:p-8">
          <p className="kicker text-accent-deep mb-4">§ The case against</p>
          <ul className="space-y-3">
            {car.prosCons.cons.map((c) => (
              <li key={c} className="flex items-start gap-3">
                <span
                  className="font-mono text-[10px] uppercase tracking-kicker text-accent-deep mt-[6px] shrink-0"
                  aria-hidden="true"
                >
                  ✗
                </span>
                <span className="text-base text-ink-soft leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Why this fits {persona} ──────────────────────────────────────── */}
      {persona && (
        <section>
          <div className="grid grid-cols-12 gap-x-6 mb-8">
            <div className="col-span-12 md:col-span-2">
              <p className="kicker">§ The verdict</p>
            </div>
            <div className="col-span-12 md:col-span-9">
              <h2 className="display text-3xl md:text-4xl leading-tight">
                Why this{' '}
                <span className="display-italic text-accent">fits</span>{' '}
                {persona.title}.
              </h2>
            </div>
          </div>
          <WhyThisCar persona={persona} car={car} />
        </section>
      )}

      {/* ── What reviewers say ───────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-12 gap-x-6 mb-8">
          <div className="col-span-12 md:col-span-2">
            <p className="kicker">§ Reviewers say</p>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="display text-3xl md:text-4xl leading-tight">
              What the press makes of it.
            </h2>
          </div>
        </div>
        <MediaEmbed media={car.media} />
      </section>

      {/* ── Lead form / test drive ───────────────────────────────────────── */}
      <section id="book">
        <div className="grid grid-cols-12 gap-x-6 mb-8">
          <div className="col-span-12 md:col-span-2">
            <p className="kicker">§ Test drive</p>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="display text-3xl md:text-4xl leading-tight">
              Want to{' '}
              <span className="display-italic text-accent">drive</span> it?
            </h2>
            <p className="mt-3 text-ink-muted max-w-xl">
              Dealer will call within 24 hours. Drive the {car.brand} {car.model} on your
              own streets — no showroom pressure.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 md:col-span-9 md:col-start-3">
            <LeadForm carId={car.id} personaId={persona?.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
