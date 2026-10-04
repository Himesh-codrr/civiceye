import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { isAdminEmail } from '@/data/admins';

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * Route guard: same as RequireAuth, but additionally requires the signed-in
 * user's email to be on the admin list (see src/data/admins.ts). Used to
 * protect /admin, /admin/backfill and /debug from being publicly routable
 * in production.
 */
export function RequireAdmin({ children }: React.PropsWithChildren<RequireAdminProps>) {
  const { configured, loading, user } = useAuth();
  const { brand } = useBrand();
  const location = useLocation();

  // In demo/local mode (no Supabase), still block admin/debug — they are
  // internal tooling, not launch content.
  if (!configured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-500" />
        <h2 className="text-xl font-bold">Admin only</h2>
        <p className="max-w-md text-sm text-slate-500">
          This page is restricted to CivicEye administrators. Sign in with an
          authorised account to continue.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
        <p className="text-xs font-semibold tracking-wide text-slate-400">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isAdminEmail(user.email, brand)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-500" />
        <h2 className="text-xl font-bold">Access denied</h2>
        <p className="max-w-md text-sm text-slate-500">
          You don't have permission to view this page. If this looks wrong, ask
          the team to add your email to the admin list.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
