import { repo } from '@/lib/repo';
import PersonaCard from '@/components/PersonaCard';

export default function HomePage() {
  const personas = repo.allPersonas();

  return (
    <div className="space-y-24">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-6 md:pt-12">
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 md:col-span-2">
            <p className="kicker mb-2 md:mb-0 md:mt-3 animate-fade-up">§01 · Issue No.1</p>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h1 className="display text-[44px] md:text-[76px] leading-[0.98] text-ink animate-fade-up">
              Find the car that{' '}
              <span
                className="display-italic text-accent"
                style={{ animationDelay: '120ms' }}
              >
                fits
              </span>{' '}
              your life.
            </h1>
            <div
              className="mt-8 h-px bg-accent origin-left animate-rule-extend"
            />
            <p
              className="mt-6 text-lg md:text-xl text-ink-soft leading-relaxed max-w-2xl animate-fade-up"
              style={{ animationDelay: '320ms' }}
            >
              Big sites give you five thousand cars. We give you the{' '}
              <span className="display-italic text-ink">three that fit</span> —
              with what real reviewers actually say, in one place.
            </p>
            <p
              className="mt-10 kicker animate-fade-up"
              style={{ animationDelay: '480ms' }}
            >
              Curated from PowerDrift · Autocar India · CarWale · MotorOctane
            </p>
          </div>
        </div>
      </section>

      {/* ── Section divider ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-x-6 items-center">
        <div className="col-span-2"><p className="kicker">§02</p></div>
        <div className="col-span-7"><div className="rule" /></div>
        <div className="col-span-3 text-right">
          <p className="kicker">{personas.length} lives · 12 starting points</p>
        </div>
      </div>

      {/* ── Persona grid ─────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-12 gap-x-6 mb-10">
          <div className="col-span-12 md:col-span-2">
            <p className="kicker">The chooser</p>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="display text-3xl md:text-5xl leading-tight">
              Pick the life that{' '}
              <span className="display-italic text-accent">sounds</span> like yours.
            </h2>
            <p className="mt-4 text-ink-muted max-w-xl">
              Every persona is a starting point — tweak it on the next page to fit your exact situation.
            </p>
          </div>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule">
          {personas.map((persona, i) => (
            <PersonaCard key={persona.id} persona={persona} index={i + 1} />
          ))}
        </ol>
      </section>

      {/* ── Closing kicker ──────────────────────────────────────────────── */}
      <section className="pt-8">
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 md:col-span-2">
            <p className="kicker">§03 · The promise</p>
          </div>
          <div className="col-span-12 md:col-span-9">
            <p className="display text-2xl md:text-3xl text-ink-soft leading-snug max-w-3xl">
              We&apos;ll show you which cars fit, and{' '}
              <span className="display-italic text-accent">exactly</span> why —
              with the parts you can compromise on, marked.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
