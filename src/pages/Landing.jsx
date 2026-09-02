import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth as authApi } from '../api/endpoints.js';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo.jsx';
import { applyTheme, storedTheme } from '../lib/theme.js';

/**
 * The front door.
 *
 * Anyone who is not signed in and lands on the root sees this instead of being
 * bounced straight to a form. It has exactly one action, said twice - in the
 * header and in the hero - because there is exactly one thing a visitor can do
 * here. No sign-up, no pricing, no feature grid: this is a private instance,
 * and pretending otherwise would be dishonest about what is behind the door.
 *
 * The screenshots are the seeded demo campaigns, not a real client - they are
 * the same images already published in the repository's README.
 */
export default function Landing() {
  // The free API instance sleeps after fifteen idle minutes and takes most
  // of a minute to wake. Nudging it now, while the visitor is still reading,
  // means the sign-in they click next is answered by a server that is up.
  useEffect(() => {
    authApi.ping();
  }, []);

  // This page is the poster: always dark, whatever the in-app theme choice.
  useEffect(() => {
    applyTheme('dark');
    return () => applyTheme(storedTheme());
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-ink">
      {/* Atmosphere - the same two radials and grid the sign-in screen uses. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 8% 0%, rgba(99,102,241,0.20) 0%, transparent 55%),' +
            'radial-gradient(90% 80% at 100% 100%, rgba(56,189,248,0.14) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(80% 60% at 30% 30%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(80% 60% at 30% 30%, black, transparent)',
        }}
      />

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 sm:px-10 lg:px-16 h-20 lg:h-22">
        <div className="flex items-center gap-3">
          <Logo size={30} />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Meridian</div>
            <div className="text-xs text-muted">SEO operations</div>
          </div>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center h-9 px-3.5 rounded-lg text-sm font-medium text-muted-strong hover:text-ink hover:bg-surface-2 transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="relative mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 pt-10 lg:pt-24 pb-28">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-14 lg:gap-10 items-center">
          {/* Left: the offer and the one action */}
          <div className="animate-fade-in">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Private instance
            </div>

            <h1 className="mt-6 text-[40px] sm:text-[56px] lg:text-[68px] font-semibold tracking-[-0.035em] leading-[1.03] text-balance">
              Fifteen minutes a day,
              <br />
              <span className="text-muted">not eight hours.</span>
            </h1>

            <p className="mt-7 max-w-[33em] text-base leading-relaxed text-muted-strong">
              Meridian runs the audit, maps the keywords, writes the page copy, rotates the daily
              off-page work and drafts the client report — each one informed by everything it has
              already done.
            </p>

            <Link
              to="/login"
              className="mt-10 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary hover:bg-primary-hover text-white text-[15px] font-medium tracking-[-0.01em] transition-colors"
              style={{ boxShadow: '0 8px 24px rgba(99,102,241,0.14)' }}
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="mt-8 flex items-center gap-2 text-[13px] text-muted">
              <ShieldCheck className="w-4 h-4 flex-none" />
              Client data stays on your own infrastructure.
            </div>
          </div>

          {/* Right: the product itself, which is the only image worth showing */}
          <div className="relative animate-fade-in" aria-hidden="true">
            <div className="rounded-xl border border-border bg-surface shadow-lift overflow-hidden">
              <div className="flex items-center gap-1.5 h-8 px-3.5 border-b border-border bg-surface-2">
                <span className="w-2 h-2 rounded-full bg-border-strong" />
                <span className="w-2 h-2 rounded-full bg-border-strong" />
                <span className="w-2 h-2 rounded-full bg-border-strong" />
              </div>
              <img
                src="/app-dashboard.jpg"
                alt=""
                width="1600"
                height="1003"
                loading="eager"
                className="block w-full"
              />
            </div>

            {/* The rank tracker, overlapped, for depth and to show a second surface */}
            <div className="hidden sm:block absolute -bottom-10 -left-6 lg:-left-14 w-[58%] rounded-xl border border-border bg-surface shadow-lift overflow-hidden">
              <img
                src="/app-ranks.jpg"
                alt=""
                width="1100"
                height="689"
                loading="lazy"
                className="block w-full"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
