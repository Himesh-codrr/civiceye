import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useBrand } from '@/hooks/useBrand';
import { EasterEggModal } from '@/components/EasterEggModal';

/**
 * CivicEye navbar mark — a rounded gradient tile (gold → emerald) with a
 * white pin+eye and an amber dot badge. Drawn as inline SVG so it stays
 * perfectly crisp at any size instead of relying on the Lucide font-icon
 * which could look pixelated when combined with drop-shadow + animation.
 */
function CivicEyeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id="civiceye-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0A92E" />
          <stop offset="0.55" stopColor="#B49035" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" ry="16" fill="url(#civiceye-bg)" />
      <path
        d="M32 14 C24.3 14 18 20.3 18 28 C18 37.8 30 50 32 50 C34 50 46 37.8 46 28 C46 20.3 39.7 14 32 14 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="28" r="4.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      <circle cx="32" cy="28" r="1.8" fill="#ffffff" />
      <circle cx="50" cy="14" r="7.2" fill="#F5B642" />
    </svg>
  );
}

/**
 * Amrita Eye navbar mark — maroon rounded tile with a stylised white eye.
 */
function AmritaEyeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id="amrita-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A51636" />
          <stop offset="1" stopColor="#E52B50" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" ry="16" fill="url(#amrita-bg)" />
      <path
        d="M10 32 C18 20 26 18 32 18 C38 18 46 20 54 32 C46 44 38 46 32 46 C26 46 18 44 10 32 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="7" fill="#ffffff" />
      <circle cx="32" cy="32" r="3.5" fill="#A51636" />
    </svg>
  );
}

interface LogoProps {
  to?: string;
  iconOnly?: boolean;
  className?: string;
}

export function Logo({ to, iconOnly = false, className }: LogoProps) {
  const { meta, brand } = useBrand();
  const [easterOpen, setEasterOpen] = useState(false);
  const clicksRef = useRef<number[]>([]);

  const handleLogoClick = () => {
    // Only for CivicEye logo per your request — 3 clicks pulls up fun about us
    if (brand !== 'civiceye') return;
    const now = Date.now();
    clicksRef.current = [...clicksRef.current.filter((t) => now - t < 2000), now];
    if (clicksRef.current.length >= 3) {
      clicksRef.current = [];
      setEasterOpen(true);
    }
  };

  useEffect(() => {
    if (easterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [easterOpen]);

  const mark = (
    <span
      onClick={handleLogoClick}
      className={cn(
        'logo-mark relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl shadow-glow transition-transform hover:scale-105 active:scale-95',
        brand === 'civiceye' ? 'animate-pulse' : '',
      )}
      title={brand === 'civiceye' ? 'Triple-click for secret lab! 🎉' : undefined}
    >
      {brand === 'civiceye' ? (
        <CivicEyeMark className="h-9 w-9" />
      ) : (
        <AmritaEyeMark className="h-9 w-9" />
      )}
    </span>
  );

  const wordmark = iconOnly ? null : (
    <span className="flex flex-col leading-none">
      <span onClick={handleLogoClick} className="cursor-pointer text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
        {meta.wordmarkPrefix}
        <span className="text-gradient">Eye</span>
      </span>
      <span className="mt-0.5 hidden text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400 sm:block">
        {meta.tagline}
      </span>
    </span>
  );

  return (
    <>
      {to ? (
        <Link to={to} className={cn('flex items-center gap-2.5', className)} aria-label={`${meta.appName} home`}>
          {mark}
          {wordmark}
        </Link>
      ) : (
        <span className={cn('flex items-center gap-2.5', className)}>
          {mark}
          {wordmark}
        </span>
      )}
      <EasterEggModal open={easterOpen} onClose={() => setEasterOpen(false)} />
    </>
  );
}
