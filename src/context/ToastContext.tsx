import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, Sparkles } from 'lucide-react';
import type { ToastItem } from '@/types';
import { uid } from '@/utils/cn';

const TOAST_DURATION = 4200;
const VISIBLE_MAX = 4;

interface ToastContextValue {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => string;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());
  const [isAmrita, setIsAmrita] = useState(false);

  // Brand detection without requiring BrandProvider (to avoid useBrand must be within BrandProvider error)
  // ToastProvider wraps AuthProvider which wraps BrandProvider, so it cannot use useBrand directly
  useEffect(() => {
    const detect = () => {
      const hasAmritaClass = typeof document !== 'undefined' && document.documentElement.classList.contains('amrita');
      const isAmritaRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/amrita');
      const brandQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('brand') : null;
      setIsAmrita(brandQuery === 'amrita' || hasAmritaClass || isAmritaRoute);
    };
    detect();
    const observer = new MutationObserver(detect);
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('popstate', detect);
    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', detect);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = uid('toast');
      setToasts((prev) => {
        const next = [...prev, { ...toast, id }];
        return next.slice(Math.max(0, next.length - VISIBLE_MAX));
      });
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), TOAST_DURATION),
      );
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      success: (title, message) => push({ type: 'success', title, message }),
      error: (title, message) => push({ type: 'error', title, message }),
      info: (title, message) => push({ type: 'info', title, message }),
      warning: (title, message) => push({ type: 'warning', title, message }),
      dismiss,
    }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--nav-height)+0.75rem)] z-[90] flex flex-col items-center gap-2.5 px-4 sm:top-6 sm:items-end sm:px-6"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.type];
            const accent =
              toast.type === 'success'
                ? 'bg-emerald-500'
                : toast.type === 'error'
                  ? 'bg-rose-500'
                  : toast.type === 'warning'
                    ? 'bg-amber-500'
                    : isAmrita
                      ? 'bg-[#A51636]'
                      : 'bg-sky-600';

            // Square, chunky comic-book style: zero border radius, thick
            // black border, hard offset shadow, colour-coded left bar.
            // Amrita variant keeps the same geometry in brand colours.
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -18, rotate: isAmrita ? 0 : -2 }}
                animate={{ opacity: 1, y: 0, rotate: isAmrita ? 0 : (toast.type === 'error' ? 1 : -1) }}
                exit={{ opacity: 0, x: 44 }}
                transition={{ type: 'spring', stiffness: 480, damping: 30 }}
                className={
                  isAmrita
                    ? `pointer-events-auto relative flex w-full max-w-sm overflow-hidden border-[3px] border-[#A51636] bg-[#fff5f7] shadow-[5px_5px_0_#1a030a]`
                    : `pointer-events-auto relative flex w-full max-w-sm overflow-hidden border-[3px] border-[#172b44] bg-[#fffdf4] shadow-[6px_6px_0_#172b44]`
                }
                style={{ borderRadius: 0 }}
              >
                <div className={`w-[6px] shrink-0 ${accent}`} />
                <div className="flex items-start gap-3 p-3.5 pr-10">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center border-[2px] ${
                    toast.type === 'success'
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-700'
                      : toast.type === 'error'
                        ? 'border-rose-600 bg-rose-100 text-rose-700'
                        : toast.type === 'warning'
                          ? 'border-amber-600 bg-amber-100 text-amber-700'
                          : isAmrita
                            ? 'border-[#A51636] bg-[#ffd630] text-[#A51636]'
                            : 'border-sky-700 bg-sky-100 text-sky-700'
                  }`} style={{ borderRadius: 0 }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[13px] font-black uppercase leading-tight tracking-wide text-[#172b44]">
                      {toast.title}
                      {toast.type === 'success' ? <span>✓</span> : null}
                      {toast.type === 'info' ? <Sparkles className="h-3 w-3 text-[#172b44]/60" /> : null}
                    </p>
                    {toast.message ? (
                      <p className="mt-1 text-[12.5px] font-semibold leading-[1.4] text-[#172b44]/75">{toast.message}</p>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={() => dismiss(toast.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center border-[2px] border-[#172b44] bg-[#ffd630] text-[#172b44] transition hover:bg-[#ef6b59] hover:text-white"
                  style={{ borderRadius: 0 }}
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>

                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: TOAST_DURATION / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-[4px] origin-left ${accent}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export { ToastContext };
