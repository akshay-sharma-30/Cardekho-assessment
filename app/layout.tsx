import type { Metadata } from 'next';
import './globals.css';
import CompareCart from '@/components/CompareCart';

export const metadata: Metadata = {
  title: 'CarFit — find the car that fits your life',
  description:
    'Tell us about your life. We pick the cars that fit, show you what reviewers say, and what you can compromise on to save more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fafaf7] text-ink antialiased">
        <header className="border-b border-black/5 bg-white/70 backdrop-blur sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="inline-block w-2 h-2 rounded-full bg-accent group-hover:scale-125 transition" />
              <span className="font-semibold tracking-tight text-lg">CarFit</span>
            </a>
            <nav className="flex items-center gap-4 text-sm text-ink-muted">
              <span className="hidden sm:inline">find the car that fits your life</span>
              <CompareCart />
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-5 py-10">{children}</main>
        <footer className="border-t border-black/5 mt-20 py-8 text-center text-xs text-ink-muted">
          MVP demo — mocked data, curated reviews. Not financial advice.
        </footer>
      </body>
    </html>
  );
}
