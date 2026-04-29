import type { Metadata } from 'next';
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import CompareCart from '@/components/CompareCart';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CarFit — A curated buying guide',
  description:
    'Big sites give you 5,000 cars. We give you the 3 that fit your life — with what real reviewers say, in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${jbMono.variable}`}
    >
      <body className="min-h-screen bg-paper text-ink antialiased">
        <header className="border-b border-rule bg-paper/85 backdrop-blur sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
            <a href="/" className="group flex items-baseline gap-3">
              <span className="font-display text-2xl tracking-tight leading-none">
                CarFit
              </span>
              <span className="hidden sm:inline-block kicker pt-[3px]">
                A curated buying guide · est. 2026
              </span>
            </a>
            <nav className="flex items-center gap-5">
              <span className="hidden md:inline kicker">India · Vol. I</span>
              <CompareCart />
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-14">{children}</main>
        <footer className="border-t border-rule mt-24 py-10">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="kicker">
              MVP demo · mocked catalog · curated reviews
            </p>
            <p className="kicker">Not financial advice — drive safe.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
