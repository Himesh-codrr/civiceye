import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * OAuth / magic-link / password-recovery callback (PKCE).
 *
 * Supabase JS is created with detectSessionInUrl: true, so when the
 * browser lands here with ?code=… the SDK automatically exchanges the
 * PKCE code for a session BEFORE our component mounts. We just wait for
 * that session to appear (with a safety attempt in case auto-detect is
 * somehow not running) and then hard-redirect into the app.
 *
 * "Back to login" is always a safe fallback because if we got here from
 * a just-consented OAuth, the session cookie is (by that point) in the
 * browser and /login will detect it and send you home.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Authentication is not configured.');
      return;
    }
    const sb = supabase; // local const so TS narrows across async awaits
    const rawNext = params.get('next') ?? '/';
    const blocked = ['/login', '/auth/callback', '/reset', '/auth'];
    const next =
      !rawNext ||
      rawNext.startsWith('//') ||
      rawNext.startsWith('http:') ||
      rawNext.startsWith('https:') ||
      blocked.some((p) => rawNext === p || rawNext.startsWith(p + '/') || rawNext.startsWith(p + '?'))
        ? '/'
        : rawNext;
    const code = params.get('code');
    let cancelled = false;
    let sub: { subscription: { unsubscribe: () => void } } | null = null;

    const goHome = () => {
      if (cancelled) return;
      window.location.replace(next);
    };

    const finish = (sessionExists: boolean) => {
      if (cancelled) return;
      if (sessionExists) {
        goHome();
      } else {
        setError('The sign-in link was invalid or expired.');
      }
    };

    // Wait for Supabase's built-in PKCE exchange to complete, then go.
    const waitForSession = async () => {
      // Give the SDK up to 12s to finish auto-detect + exchange.
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise((r) => setTimeout(r, 300));
        if (cancelled) return;
        const { data } = await sb.auth.getSession();
        if (data.session) {
          goHome();
          return;
        }
      }
      // Timed out with no session — if there was a code, try a manual
      // exchange once as a fallback (covers the rare case where auto-
      // detect was disabled or missed the code).
      if (code) {
        const { data, error: exchErr } = await sb.auth.exchangeCodeForSession(code);
        if (!exchErr && data.session) {
          goHome();
          return;
        }
      }
      finish(false);
    };

    // Subscribe to auth state changes *first* so we don't miss the event
    // in case the SDK fires SIGNED_IN between mount and our poll loop.
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) goHome();
    });
    sub = data;

    waitForSession();

    return () => {
      cancelled = true;
      sub?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      {!error ? (
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          Signing you in…
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button onClick={() => navigate('/login')} className="btn-secondary mt-4">
            Back to login
          </button>
        </div>
      )}
    </div>
  );
}
