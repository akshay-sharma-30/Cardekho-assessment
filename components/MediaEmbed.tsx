import type { MediaLink } from '@/lib/types';

interface Props {
  media: MediaLink[];
}

function VettedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
      <span aria-hidden="true">✓</span> Vetted
    </span>
  );
}

export default function MediaEmbed({ media }: Props) {
  const youtube = media.filter((m) => m.type === 'youtube' && m.youtubeId);
  const articles = media.filter((m) => m.type === 'article');

  return (
    <section className="space-y-6">
      <h2 className="font-semibold text-xl">What reviewers say</h2>

      {media.length === 0 && (
        <p className="text-sm text-ink-muted">Reviews coming soon.</p>
      )}

      {youtube.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {youtube.map((m) => (
            <figure key={m.url} className="space-y-2">
              <div className="relative aspect-video">
                <iframe
                  className="absolute inset-0 w-full h-full rounded-2xl"
                  src={`https://www.youtube.com/embed/${m.youtubeId}`}
                  loading="lazy"
                  allowFullScreen
                  title={m.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              <figcaption className="flex items-start justify-between gap-3">
                <p className="text-sm text-ink-soft leading-snug">
                  <span className="font-medium text-ink">{m.title}</span>
                  <span className="text-ink-muted"> · {m.source}</span>
                </p>
                {m.vetted && <VettedPill />}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {articles.length > 0 && (
        <ul className="space-y-3">
          {articles.map((m) => (
            <li
              key={m.url}
              className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink leading-snug">{m.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{m.source}</p>
                </div>
                {m.vetted && <VettedPill />}
              </div>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-accent hover:underline underline-offset-4"
              >
                Read on {m.source} →
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
