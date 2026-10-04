/**
 * Tiny PWA helpers: register the service worker and capture the
 * beforeinstallprompt event so we can show our own install UI later.
 */

type BeforeInstallPromptEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(ev: BeforeInstallPromptEvent | null) => void>();

export function onBeforeInstallPrompt(cb: (ev: BeforeInstallPromptEvent | null) => void) {
  listeners.add(cb);
  if (deferredPrompt) cb(deferredPrompt);
  return () => listeners.delete(cb);
}

export function consumeInstallPrompt() {
  const ev = deferredPrompt;
  deferredPrompt = null;
  listeners.forEach((l) => l(null));
  return ev;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l(e as BeforeInstallPromptEvent));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((l) => l(null));
    try { localStorage.setItem('civiceye:pwa-installed', '1'); } catch { /* noop */ }
  });
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // don't interfere with dev HMR
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

/** True if the page is running inside an installed PWA window. */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    ((window.navigator as unknown as { standalone?: boolean }).standalone === true)
  );
}

const LATER_KEY = 'civiceye:pwa-prompt-later'; // "Maybe later" — soft dismiss, can re-prompt later
const SUPPRESS_KEY = 'civiceye:pwa-prompt-suppressed'; // "Don't show again" — permanent dismiss
const LATER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days before re-asking after "Maybe later"

export function hasDismissedInstallPrompt(): boolean {
  try {
    if (localStorage.getItem(SUPPRESS_KEY) === '1') return true;
    const later = localStorage.getItem(LATER_KEY);
    if (!later) return false;
    const when = parseInt(later, 10);
    if (Number.isNaN(when)) return false;
    // Still within the cooldown — treat as dismissed for now.
    return Date.now() - when < LATER_COOLDOWN_MS;
  } catch { return false; }
}
export function markInstallPromptDismissed() {
  try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch { /* noop */ }
}
export function suppressInstallPromptForever() {
  try {
    localStorage.setItem(SUPPRESS_KEY, '1');
    localStorage.removeItem(LATER_KEY);
  } catch { /* noop */ }
}
export function isInstalled(): boolean {
  try { return localStorage.getItem('civiceye:pwa-installed') === '1'; } catch { return false; }
}
