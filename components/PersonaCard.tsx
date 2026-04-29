import Link from 'next/link';
import type { Persona } from '@/lib/types';

interface Props {
  persona: Persona;
  index?: number;
}

export default function PersonaCard({ persona, index }: Props) {
  return (
    <li className="list-none">
      <Link
        href={`/personas/${persona.id}`}
        className="group relative flex flex-col h-full p-7 bg-paper transition-colors duration-500 hover:bg-paper-dark/60 focus-visible:outline-none focus-visible:bg-paper-dark/60"
      >
        {/* Mono numerical kicker — the editorial signature */}
        <div className="flex items-baseline justify-between mb-6">
          <span className="kicker">
            {String(index ?? 0).padStart(2, '0')} · {persona.id.replace(/-/g, ' ')}
          </span>
          <span className="text-2xl leading-none opacity-80" aria-hidden="true">
            {persona.emoji}
          </span>
        </div>

        <h3 className="display text-[26px] leading-[1.1] text-ink">
          {persona.title}
        </h3>
        <p className="mt-2 font-display italic text-ink-muted text-base leading-snug">
          {persona.tagline}
        </p>

        <p
          className="text-sm text-ink-soft/85 mt-5 leading-relaxed overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {persona.description}
        </p>

        {/* The hover-extending rule + arrow — the editorial flourish */}
        <div className="mt-auto pt-8 flex items-center gap-3 text-accent">
          <span className="kicker text-accent">See matches</span>
          <span
            aria-hidden="true"
            className="block flex-1 h-px bg-accent/40 origin-left scale-x-50 transition-transform duration-500 group-hover:scale-x-100"
          />
          <span className="font-display text-xl leading-none transition-transform duration-500 group-hover:translate-x-1">
            →
          </span>
        </div>
      </Link>
    </li>
  );
}
