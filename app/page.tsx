import { repo } from '@/lib/repo';
import PersonaCard from '@/components/PersonaCard';

export default function HomePage() {
  const personas = repo.allPersonas();

  return (
    <div className="space-y-16">
      <section className="pt-8 md:pt-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
            Find the car that fits your life.
          </h1>
          <p className="mt-5 text-lg text-ink-muted leading-relaxed">
            Big sites give you 5,000 cars. We give you the 3 that fit you — with what real
            reviewers say, in one place.
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Curated reviews from PowerDrift · Autocar India · CarWale · MotorOctane
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
            Pick the life that sounds like yours.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {personas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} />
          ))}
        </div>
      </section>

      <p className="text-sm text-ink-muted text-center max-w-xl mx-auto">
        Pick a persona to see your matches. We&apos;ll show you which cars fit, and exactly
        why.
      </p>
    </div>
  );
}
