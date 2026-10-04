import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Route guard: redirects anonymous visitors to /login (remembering where
 * they were headed). Reporting is the only area that requires an account.
 *
 * The guard waits until the initial session restore has finished
 * (`loading === false`) before deciding — this avoids the race where a
 * just-signed-in user gets bounced back to /login because React state
 * hasn't been updated yet.
 */
export function RequireAuth({ children }: React.PropsWithChildren<RequireAuthProps>) {
  const { configured, loading, user } = useAuth();
  const location = useLocation();

  // Demo/local-preview mode remains navigable without credentials. When
  // Supabase is configured, normal sign-in protection still applies.
  if (!configured) {
    return <>{children}</>;
  }

  // If Supabase is still hydrating the initial session, show a spinner —
  // never redirect mid-restore.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
        <p className="text-xs font-semibold tracking-wide text-slate-400">Checking your session…</p>
      </div>
    );
  }

  // Session restore is done and there's still no user — bounce to /login.
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
