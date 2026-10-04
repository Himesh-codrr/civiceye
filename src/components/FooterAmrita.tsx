import { Link } from 'react-router-dom';
import { Heart, Instagram, Linkedin, Mail, MapPin } from 'lucide-react';
import { Logo } from './Logo';
import { useBrand } from '@/hooks/useBrand';

const QUICK_LINKS = [
  { to: '/map', label: 'Interactive Map' },
  { to: '/amrita/map', label: 'Campus Map' },
  { to: '/report', label: 'Report an Issue' },
  { to: '/food-hygiene', label: 'Mess / Food Hygiene (Anonymous)' },
  { to: '/community', label: 'Community Reports' },
  { to: '/features', label: 'Features' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About us' },
  { to: '/contact', label: 'Contact' },
  { to: '/features', label: 'How it works' },
];

const AMRITA_PLACE = 'Amrita Vishwa Vidyapeetham \u00b7 Bengaluru Campus';

const SOCIALS = [
  { href: 'https://www.instagram.com/civiceye_offcial/', label: 'Instagram', icon: Instagram },
  { href: 'https://www.linkedin.com/in/civiceye-official-21296242b', label: 'LinkedIn', icon: Linkedin },
  { href: 'mailto:info@civiceye.co.in', label: 'Email', icon: Mail },
];

/** Site-wide footer, structural HIG layout. */
export function FooterAmrita() {
  const { meta, isAmrita } = useBrand();
  return (
    <footer className="mt-auto border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <div className="mx-auto max-w-[1920px] px-5 sm:px-8 lg:px-12 xl:px-16 py-16 sm:py-24">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:pr-8">
            <Logo />
            <p className="mt-6 text-sm leading-7 text-neutral-500 dark:text-neutral-400">
              {meta.tagline}{' '}
              {isAmrita
                ? 'Reports go straight to campus staff so they can act fast.'
                : 'Citizens report, the community verifies, authorities fix.'}
            </p>
            <div className="mt-8 flex items-start gap-3 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-900 dark:text-white" />
              {isAmrita ? AMRITA_PLACE : 'Bengaluru, Karnataka, India'}
            </div>
          </div>

          {/* Quick links */}
          <nav aria-label="Quick links">
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Quick links
            </h3>
            <ul className="space-y-4">
              {QUICK_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm font-medium text-neutral-600 dark:text-neutral-300 transition-colors hover:text-neutral-900 dark:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav aria-label="Company">
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Company
            </h3>
            <ul className="space-y-4">
              {COMPANY_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm font-medium text-neutral-600 dark:text-neutral-300 transition-colors hover:text-neutral-900 dark:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href="mailto:info@civiceye.co.in"
              className="mt-6 flex items-center gap-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 transition-colors hover:text-neutral-900 dark:text-white"
            >
              <Mail className="h-4 w-4" />
              info@civiceye.co.in
            </a>
          </nav>

          {/* Social */}
          <div>
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Follow us
            </h3>
            <div className="flex flex-wrap gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-sm border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 transition-colors hover:border-neutral-900 hover:bg-white dark:bg-black hover:text-neutral-900 dark:text-white"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <p className="mt-8 rounded-sm bg-neutral-50 dark:bg-neutral-900 p-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Making cities better, one report at a time. Report a civic issue in seconds — AI verifies and routes it to the right team.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-neutral-200 dark:border-neutral-800 pt-8 sm:flex-row">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            \u00a9 {new Date().getFullYear()} {meta.appName}. All rights reserved. Built in
            {isAmrita ? ' Amritapuri & Bengaluru' : ' Bengaluru'}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <Link
              to="/privacy"
              className="transition-colors hover:text-neutral-900 dark:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-neutral-900 dark:text-white"
            >
              Terms of Service
            </Link>
            <span className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-sm">
              Made for citizens
              <Heart className="h-3 w-3 text-neutral-900 dark:text-white" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
