import { useMemo } from 'react';
import { Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { getSLAStatus, formatSLATime, getEscalationTarget } from '@/services/slaService';
import { BeforeAfterSlider } from './BeforeAfterSlider';

export function EstateOfficeDashboard() {
  const { reports } = useReports();
  
  const campusReports = useMemo(() => reports.filter((r) => r.scope === 'campus'), [reports]);
  const breached = useMemo(() => campusReports.filter((r) => getSLAStatus(r).status === 'breached' && r.status !== 'resolved'), [campusReports]);
  const atRisk = useMemo(() => campusReports.filter((r) => getSLAStatus(r).status === 'at-risk'), [campusReports]);
  const fixed = useMemo(() => campusReports.filter((r) => r.proof?.afterImage), [campusReports]);
  const pending = useMemo(() => campusReports.filter((r) => r.status === 'pending'), [campusReports]);

  return (
    <div className="space-y-6">
      <div className="rounded-[20px] border border-[#A51636]/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Building2 className="h-5 w-5 text-[#A51636]" /> Estate Office — Campus Operations
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Real Amrita Bengaluru campus reporting — estate office handles potholes, roads, sidewalks, garbage, water, lights. Auto email with AI annotations + Maps link + severity + report link.
        </p>
        
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending</div>
            <div className="mt-1 text-2xl font-black">{pending.length}</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
            <div className="text-xs font-bold uppercase tracking-widest text-amber-700">At Risk</div>
            <div className="mt-1 text-2xl font-black text-amber-700">{atRisk.length}</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-4 dark:bg-rose-500/10">
            <div className="text-xs font-bold uppercase tracking-widest text-rose-700">Breached</div>
            <div className="mt-1 text-2xl font-black text-rose-700">{breached.length}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">Fixed ✓</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{fixed.length}</div>
          </div>
        </div>

        {breached.length > 0 ? (
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" /> SLA Breached — Auto-Escalation Required
            </h3>
            <div className="mt-3 space-y-2">
              {breached.slice(0, 5).map((r) => {
                const sla = getSLAStatus(r);
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{r.title}</div>
                      <div className="text-xs text-rose-600/70">{r.locationName} · {formatSLATime(sla.hoursLeft)} overdue</div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <div className="text-xs font-bold">→ {getEscalationTarget(r)}</div>
                      <div className="text-[11px] text-slate-500">Level {r.escalation?.level || 0} → {(r.escalation?.level || 0) + 1}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {fixed.length > 0 ? (
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Proof of Fix — Before / After
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {fixed.slice(0, 2).map((r) => r.proof ? (
                <BeforeAfterSlider 
                  key={r.id}
                  beforeImage={r.proof.beforeImage} 
                  afterImage={r.proof.afterImage}
                  aiVerified={r.proof.verifiedByAI}
                  aiConfidence={r.proof.aiConfidence}
                />
              ) : null)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
