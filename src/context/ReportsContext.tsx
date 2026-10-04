import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Report, VoteType } from '@/types';
import { reportService } from '@/services/reportService';
import { supabase } from '@/lib/supabase';

/**
 * Reports store (async + LIVE).
 * Reads from Supabase on mount, refreshes after every local mutation, and
 * subscribes to Supabase Realtime so changes made by OTHER users (a confirm
 * vote, a resolve, a new report, an admin scope move…) appear on everyone's
 * screen without a manual refresh. Requires the `reports` table to be in the
 * `supabase_realtime` publication — see supabase/realtime-fix.sql.
 */

interface ReportsContextValue {
  reports: Report[];
  /** True while the initial fetch is in flight. */
  loading: boolean;
  /** True when a mutation is in flight. */
  mutating: boolean;
  error: string | null;
  /** Refresh from Supabase, optionally filtered to a brand scope. */
  refresh: (scope?: 'city' | 'campus' | 'all') => Promise<void>;
  /** Admin: permanently remove a report. */
  removeReport: (id: string) => Promise<void>;
  /** Admin: move a report between City and Campus scope. */
  setScope: (id: string, scope: 'city' | 'campus') => Promise<void>;
  getById: (idOrCode: string) => Report | undefined;
  addReport: (input: Parameters<typeof reportService.create>[0]) => Promise<Report>;
  vote: (id: string, voteType: VoteType) => Promise<Report | undefined>;
  voteUp: (id: string) => Promise<void>;
  voteDown: (id: string) => Promise<void>;
  confirmReport: (id: string) => Promise<Report | undefined>;
  rejectReport: (id: string) => Promise<void>;
  markResolved: (id: string) => Promise<void>;
  assignToAuthority: (id: string, authorityId: string) => Promise<void>;
  rejectAsAuthority: (id: string) => Promise<void>;
  addProof: (id: string, proof: { beforeImage: string; afterImage: string; fixedDate: string; verifiedByAI?: boolean; aiConfidence?: number; description?: string }) => Promise<void>;
  escalateReport: (id: string, reason: string) => Promise<void>;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Last scope used for the latest fetch (realtime refetches reuse it).
  const lastScopeRef = useRef<'city' | 'campus' | 'all'>('all');
  // Debounce timer for coalescing a burst of realtime events into one refetch.
  const liveTimerRef = useRef<number | null>(null);

  const refresh = useCallback(
    async (scope?: 'city' | 'campus' | 'all') => {
      try {
        const s = scope ?? lastScopeRef.current;
        lastScopeRef.current = s;
        setLoading(true);
        const list = await reportService.getAll(s);
        setReports(list);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load reports.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /** Refetch WITHOUT toggling `loading` — used by realtime so live updates
   *  don't flash loading skeletons on everyone's screen. */
  const refreshQuiet = useCallback(async () => {
    try {
      const list = await reportService.getAll(lastScopeRef.current);
      setReports(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ---- Live sync (Supabase Realtime) -------------------------------
  // Fixes: "confirmations from another user don't increment the count."
  // The store lives above the router, so a plain mount-once fetch went
  // stale the moment another user voted/confirmed/resolved a report.
  // Any INSERT/UPDATE/DELETE on `reports` is now broadcast to every open
  // session and triggers a quiet refetch (~350 ms debounce).
  useEffect(() => {
    if (!supabase) return;
    let channel: any = null;
    try {
      const client = supabase;
      channel = client
        .channel('reports-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          () => {
            if (liveTimerRef.current) window.clearTimeout(liveTimerRef.current);
            liveTimerRef.current = window.setTimeout(() => void refreshQuiet(), 350);
          },
        )
        .subscribe((status: string, err?: any) => {
          if (err) {
            console.warn('[CivicEye] Realtime subscription error (non-critical):', err?.message || err);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[CivicEye] Realtime channel issue:', status, '- falling back to polling');
          }
        });
    } catch (err) {
      console.warn('[CivicEye] WebSocket not available (non-critical, using polling fallback):', err instanceof Error ? err.message : err);
    }
    return () => {
      if (liveTimerRef.current) window.clearTimeout(liveTimerRef.current);
      try {
        if (channel && supabase) {
          void supabase.removeChannel(channel);
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, [refreshQuiet]);

  /** Run a mutation, then refresh. */
  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<void> => {
      setMutating(true);
      try {
        await action();
        await refresh();
      } finally {
        setMutating(false);
      }
    },
    [refresh],
  );

  const value = useMemo<ReportsContextValue>(
    () => ({
      reports,
      loading,
      mutating,
      error,
      refresh,
      getById: (idOrCode) => reports.find((r) => r.id === idOrCode || r.code === idOrCode),
      addReport: (input) =>
        reportService.create(input).then((created) => {
          void refresh();
          return created;
        }),
      vote: (id, voteType) =>
        reportService.vote(id, voteType).then((updated) => {
          // Reflect the returned row instantly (realtime refetch follows).
          if (updated) {
            setReports((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)]);
          }
          return updated;
        }),
      voteUp: (id) => run(() => reportService.vote(id, 'up')),
      voteDown: (id) => run(() => reportService.vote(id, 'down')),
      confirmReport: (id) =>
        reportService.vote(id, 'confirm').then((updated) => {
          if (updated) {
            setReports((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)]);
          }
          void refresh();
          return updated;
        }),
      rejectReport: (id) => run(() => reportService.vote(id, 'reject')),
      markResolved: (id) => run(() => reportService.markResolved(id)),
      assignToAuthority: (id, authorityId) =>
        run(() => reportService.markInProgress(id, authorityId)),
      rejectAsAuthority: (id) => run(() => reportService.rejectReport(id)),
      addProof: (id, proof) => run(() => reportService.addProof(id, proof)),
      escalateReport: (id, reason) => run(() => {
        const existing = reports.find((r) => r.id === id);
        const level = (existing?.escalation?.level || 0) + 1;
        return reportService.escalate(id, {
          level,
          escalatedAt: new Date().toISOString(),
          reason,
          nextAuthority: level >= 2 ? 'Higher Authority' : 'Next Level',
        });
      }),
      removeReport: (id) => run(() => reportService.remove(id)),
      setScope: (id, scope) => run(() => reportService.updateScope(id, scope)),
    }),
    [reports, loading, mutating, error, refresh, run],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export { ReportsContext };
