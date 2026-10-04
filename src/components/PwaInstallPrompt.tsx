import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X, Smartphone, Laptop, BellOff } from 'lucide-react';
import {
  consumeInstallPrompt,
  hasDismissedInstallPrompt,
  isInstalled,
  isStandalonePwa,
  markInstallPromptDismissed,
  onBeforeInstallPrompt,
  suppressInstallPromptForever,
} from '@/utils/pwa';

/**
 * Comic-style "Install CivicEye as an app" banner.
 *
 * Behaviour:
 *  - Never shows inside an already-installed PWA.
 *  - Never shows after user taps "Don't show again" (persistent).
 *  - "Maybe later" is a soft dismiss — the banner reappears 3 days later
 *    (cooldown in localStorage).
 *  - Re-checks on tab visibility change (so returning to the site after
 *    the cooldown pops it back up without a full cache-bust reload).
 *  - If the browser fires beforeinstallprompt (Chrome/Edge/Android/
 *    desktop Chrome), clicking "Install" triggers the native dialog.
 *  - Otherwise (iOS Safari / Firefox) shows manual install instructions.
 */
export function PwaInstallPrompt() {
  const [open, setOpen] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const [isIos, setIsIos] = useState(false);

  // Decide whether to show the prompt now.
  const shouldShow = () => !isStandalonePwa() && !isInstalled() && !hasDismissedInstallPrompt();

  useEffect(() => {
    setIsIos(/iPhone|iPad|iPod/.test(navigator.userAgent) && !('MSStream' in window));

    const tryOpen = () => {
      if (shouldShow()) setOpen(true);
    };

    // Show after a short delay so it doesn't fight the hero UI.
    const t = window.setTimeout(tryOpen, 3200);

    const off = onBeforeInstallPrompt((ev) => {
      setCanNative(Boolean(ev));
      if (shouldShow()) setOpen(true);
    });

    // Also re-check when the tab becomes visible again (e.g. user comes
    // back after the "Maybe later" cooldown, or after installing on
    // another device and returning).
    const onVis = () => {
      if (document.visibilityState === 'visible') tryOpen();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearTimeout(t);
      off();
      document.removeEventListener('visibilitychange', onVis);
    };
    
  }, []);

  const dismissLater = () => {
    setOpen(false);
    markInstallPromptDismissed();
  };

  const dismissForever = () => {
    setOpen(false);
    suppressInstallPromptForever();
  };

  const triggerInstall = async () => {
    const ev = consumeInstallPrompt();
    if (ev?.prompt) {
      try {
        await ev.prompt();
        const res = await ev.userChoice;
        if (res?.outcome === 'accepted') {
          // Installed! Permanently hide.
          setOpen(false);
          suppressInstallPromptForever();
          return;
        }
        // User dismissed the native dialog — fall through, leave card
        // open so they can choose later / don't-show.
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-label="Install CivicEye as an app"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="fixed bottom-4 left-4 right-4 z-[85] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-[400px]"
        >
          <div className="relative border-[4px] border-[#172b44] bg-[#fffdf4] p-5 shadow-[8px_8px_0_#ef6b59]">
            <button
              onClick={dismissLater}
              aria-label="Close install prompt"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border-[3px] border-[#172b44] bg-[#ffd630] text-[#172b44] shadow-[2px_2px_0_#172b44] transition hover:bg-[#ef6b59] hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>

            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-[#172b44] bg-[#ffd630] shadow-[3px_3px_0_#172b44]">
                <Download className="h-6 w-6 text-[#172b44]" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="font-serif text-lg font-black uppercase leading-none text-[#172b44]">
                  Install the app
                </p>
                <p className="mt-1.5 text-[12px] font-bold leading-snug text-[#172b44]/80">
                  Add CivicEye to your phone or laptop home screen for one-tap
                  reporting, offline map cache, and faster loads.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {canNative ? (
                <button
                  onClick={triggerInstall}
                  className="flex w-full items-center justify-center gap-2 border-[3px] border-[#172b44] bg-[#ffd630] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#172b44] shadow-[4px_4px_0_#172b44] transition hover:-translate-y-0.5 hover:bg-[#91dcc4]"
                >
                  <Download className="h-4 w-4" strokeWidth={3} /> Install CivicEye
                </button>
              ) : isIos ? (
                <div className="border-[3px] border-[#172b44] bg-[#fff8e7] p-3 text-[11px] font-bold leading-snug text-[#172b44] shadow-[3px_3px_0_#172b44]">
                  <span className="inline-flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" />
                    On iPhone/iPad: tap the
                    <span className="mx-1 rounded border-2 border-[#172b44] bg-white px-1 font-black">Share</span>
                    button then <strong>“Add to Home Screen”</strong>.
                  </span>
                </div>
              ) : (
                <div className="border-[3px] border-[#172b44] bg-[#fff8e7] p-3 text-[11px] font-bold leading-snug text-[#172b44] shadow-[3px_3px_0_#172b44]">
                  <span className="inline-flex items-center gap-1">
                    <Laptop className="h-3.5 w-3.5" />
                    On desktop: open your browser menu and click
                    <strong className="mx-1">“Install CivicEye…”</strong>
                    or look for the install icon in the address bar.
                  </span>
                </div>
              )}

              <div className="flex items-stretch gap-2">
                <button
                  onClick={dismissLater}
                  className="flex-1 border-[3px] border-[#172b44] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:bg-[#91dcc4]"
                >
                  Maybe later
                </button>
                <button
                  onClick={dismissForever}
                  className="flex flex-1 items-center justify-center gap-1.5 border-[3px] border-[#172b44] bg-[#fff8e7] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:bg-[#ef6b59] hover:text-white"
                >
                  <BellOff className="h-3.5 w-3.5" /> Don't show again
                </button>
              </div>
            </div>

            <span className="absolute -right-3 -top-3 rotate-6 border-[3px] border-[#172b44] bg-[#ef6b59] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#172b44]">
              Free
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
