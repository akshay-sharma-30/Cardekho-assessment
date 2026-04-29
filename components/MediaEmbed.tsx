import type { MediaLink } from '@/lib/types';

interface Props {
  media: MediaLink[];
}

function VettedMark() {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-kicker text-forest"
      aria-label="Vetted by CarFit"
    >
      ✓ vetted
    </span>
  );
}

export default function MediaEmbed({ media }: Props) {
  if (media.length === 0) return null;

  const youtube = media.filter((m) => m.type === 'youtube' && m.youtubeId);
  const articles = media.filter((m) => m.type === 'article');

  return (
    <section>
      {/* Section header — kicker + display heading */}
      <div className="grid grid-cols-12 gap-x-6 mb-10">
        <div className="col-span-12 md:col-span-2">
          <p className="kicker">§ Reviewers</p>
        </div>
        <div className="col-span-12 md:col-span-9">
          <h2 className="display text-3xl md:text-4xl leading-tight text-ink">
            From the{' '}
            <span className="display-italic text-accent">press</span>.
          </h2>
        </div>
      </div>

      {youtube.length > 0 && (
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 md:col-span-2 mb-4 md:mb-0">
            <p className="kicker">§ On video</p>
          </div>
          <div className="col-span-12 md:col-span-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10">
              {youtube.map((m) => (
                <figure key={m.url} className="group flex flex-col">
                  <div className="relative w-full aspect-video bg-paper-deep/40 overflow-hidden">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${m.youtubeId}`}
                      loading="lazy"
                      allowFullScreen
                      title={m.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                  <figcaption className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-kicker text-ink-muted">
                        · {m.source}
                      </span>
                      {m.vetted && <VettedMark />}
                    </div>
                    <p className="font-display italic text-lg text-ink leading-snug">
                      {m.title}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <div className={`grid grid-cols-12 gap-x-6 ${youtube.length > 0 ? 'mt-16' : ''}`}>
          <div className="col-span-12 md:col-span-2 mb-4 md:mb-0">
            <p className="kicker">§ Reading list</p>
          </div>
          <div className="col-span-12 md:col-span-10">
            <ul className="border-y border-rule">
              {articles.map((m) => (
                <li
                  key={m.url}
                  className="border-b border-rule last:border-b-0 py-6"
                >
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 md:gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-kicker text-ink-muted">
                          · {m.source}
                        </span>
                        {m.vetted && <VettedMark />}
                      </div>
                      <p className="font-display italic text-lg md:text-xl text-ink leading-snug">
                        {m.title}
                      </p>
                    </div>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-kicker text-accent hover:text-accent-deep transition-colors duration-300 shrink-0 self-start md:self-auto"
                    >
                      <span>→ Read on {m.source}</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
