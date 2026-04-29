import Link from 'next/link';
import type { Persona } from '@/lib/types';

interface Props {
  persona: Persona;
}

export default function PersonaCard({ persona }: Props) {
  return (
    <Link
      href={`/personas/${persona.id}`}
      className="group relative flex flex-col h-full bg-white rounded-2xl border border-black/5 shadow-sm p-6 transition duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <div className="text-4xl leading-none mb-4" aria-hidden="true">
        {persona.emoji}
      </div>
      <h3 className="font-semibold text-lg tracking-tight">{persona.title}</h3>
      <p className="text-sm text-ink-muted mt-1">{persona.tagline}</p>
      <p
        className="text-sm text-ink-soft/80 mt-3 overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {persona.description}
      </p>
      <div className="mt-6 flex items-center justify-end text-sm font-medium text-accent">
        <span className="transition-transform group-hover:translate-x-0.5">
          See your matches →
        </span>
      </div>
    </Link>
  );
}
