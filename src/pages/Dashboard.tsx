import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileDown,
  Inbox,
  Map as MapIcon,
  RefreshCcw,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { Report, Severity } from '@/types';
import { useReports } from '@/hooks/useReports';
import { useBrand } from '@/hooks/useBrand';
import { useToast } from '@/hooks/useToast';
import { useNotifications } from '@/hooks/useNotifications';
import { DashboardCard } from '@/components/DashboardCard';
import { ChartCard } from '@/components/ChartCard';
import { ReportToAuthority } from '@/components/ReportToAuthority';
import { MapView } from '@/components/map/MapView';
import { AmritaCampusMap } from '@/components/campus/AmritaCampusMap';
import { Leaderboard } from '@/components/Leaderboard';
import { TwoFactorCard } from '@/components/TwoFactorCard';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { EstateOfficeDashboard } from '@/components/EstateOfficeDashboard';
import { getSLAStatus, formatSLATime, getEscalationTarget } from '@/services/slaService';
import { Badge } from '@/components/Badge';
import { CATEGORIES, SEVERITY_META, STATUS_META, categoryById } from '@/data/categories';
import { authoritiesForScope, authorityById } from '@/data/authorities';
import { formatDate, timeAgo } from '@/utils/format';
import { downloadTextFile } from '@/utils/download';
import { cn } from '@/utils/cn';

const SEVERITY_HEX: Record<Severity, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#f43f5e',
};

/** Authorities dashboard: KPIs, charts, map and report management. */
export function Dashboard() {
  const { reports, loading, markResolved, assignToAuthority, rejectAsAuthority, refresh } =
    useReports();
  const { isAmrita, meta } = useBrand();
  const toast = useToast();
  const notifications = useNotifications();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only show reports for the active brand (city vs campus).
  const scopedReports = useMemo(
    () => reports.filter((r) => r.scope === (isAmrita ? 'campus' : 'city')),
    [reports, isAmrita],
  );

  const stats = useMemo(() => {
    const open = scopedReports.filter((r) => r.status === 'pending' || r.status === 'in-progress').length;
    const resolved = scopedReports.filter((r) => r.status === 'resolved').length;
    const pending = scopedReports.filter((r) => r.status === 'pending').length;
    const verified = scopedReports.filter((r) => r.verified).length;
    const critical = scopedReports.filter((r) => r.severity === 'critical').length;
    return { open, resolved, pending, verified, critical };
  }, [scopedReports]);

  const categoryBreakdown = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        category: c,
        count: scopedReports.filter((r) => r.category === c.id).length,
      }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
    [scopedReports],
  );

  const severityBreakdown = useMemo(
    () =>
      (Object.keys(SEVERITY_META) as Severity[]).map((s) => ({
        severity: s,
        count: scopedReports.filter((r) => r.severity === s).length,
      })),
    [scopedReports],
  );

  /** Weekly activity trend (bucketed from real report dates). */
  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const now = Date.now();
    for (let w = 7; w >= 0; w--) {
      const end = now - (w - 1) * 7 * 86400000;
      const start = now - w * 7 * 86400000;
      const count = scopedReports.filter((r) => {
        const t = new Date(r.date).getTime();
        return t >= start && t < end;
      }).length;
      weeks.push({
        label: new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count,
      });
    }
    return weeks;
  }, [scopedReports]);

  const topAreas = useMemo(() => {
    const map = new Map<string, { count: number; critical: number }>();
    for (const r of scopedReports) {
      const area = r.locationName;
      const entry = map.get(area) ?? { count: 0, critical: 0 };
      entry.count += 1;
      if (r.severity === 'critical') entry.critical += 1;
      map.set(area, entry);
    }
    return [...map.entries()]
      .map(([area, v]) => ({ area, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [scopedReports]);

  const recent = useMemo(
    () => [...scopedReports].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10),
    [scopedReports],
  );

  /** Build + download a plain-text ward report. */
  const generateReport = () => {
    const lines: string[] = [
      '=================================================================',
      `  ${meta.appName.toUpperCase()} — WARD / ESTATE OFFICE REPORT`,
      '  Generated: ' + new Date().toLocaleString('en-IN'),
      '=================================================================',
      '',
      `Total reports tracked: ${reports.length}`,
      `  Open / in progress : ${stats.open}`,
      `  Pending review     : ${stats.pending}`,
      `  Verified           : ${stats.verified}`,
      `  Resolved           : ${stats.resolved}`,
      `  Critical severity  : ${stats.critical}`,
      '',
      '-----------------------------------------------------------------',
      ' TOP CATEGORIES',
      '-----------------------------------------------------------------',
      ...categoryBreakdown.map(
        (c) => `  ${c.category.label.padEnd(22)} ${String(c.count).padStart(3)}`,
      ),
      '',
      '-----------------------------------------------------------------',
      ' HIGH-PRIORITY OPEN REPORTS',
      '-----------------------------------------------------------------',
      ...reports
        .filter((r) => r.status !== 'resolved' && r.severity !== 'low')
        .slice(0, 15)
        .map(
          (r) =>
            `  [${r.id}] ${r.title} — ${r.locationName} (${SEVERITY_META[r.severity].label}, ${STATUS_META[r.status].label}, reported ${formatDate(r.date)})`,
        ),
      '',
      '=================================================================',
      `  Generated by ${meta.appName} — https://civiceye.co.in`,
      '=================================================================',
    ];
    downloadTextFile(
      `civiceye-ward-report-${new Date().toISOString().slice(0, 10)}.txt`,
      lines.join('\n'),
    );
    toast.success('Report generated', 'Ward report downloaded as a text file.');
  };

  const handleResolve = (r: Report) => {
    void markResolved(r.id).then(() => {
      toast.success('Marked as resolved', `${r.id} is now Resolved.`);
      notifications.add({
        type: 'resolve',
        title: 'Issue resolved',
        message: `“${r.title}” was marked resolved.`,
      });
    });
  };

  const handleAssign = (r: Report, authorityId: string) => {
    void assignToAuthority(r.id, authorityId).then(() => {
      const a = authorityById(authorityId);
      toast.info('Assigned', `${r.id} → ${a?.name ?? authorityId}`);
      notifications.add({
        type: 'report',
        title: 'Report assigned',
        message: `“${r.title}” was assigned to ${a?.name ?? 'an agency'}.`,
      });
    });
  };

  const maxCategory = Math.max(1, ...categoryBreakdown.map((c) => c.count));
  const totalSeverity = Math.max(
    1,
    severityBreakdown.reduce((s, x) => s + x.count, 0),
  );
  const maxTrend = Math.max(1, ...weeklyTrend.map((w) => w.count));

  return (
    <div className="pb-16 pt-[calc(var(--nav-height)+2.5rem)] sm:pt-[calc(var(--nav-height)+3.5rem)]">
      {/* Header */}
      <div className="section-pad">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              <Building2 className="h-4 w-4" />
              Authorities dashboard
            </p>
            <h1 className="heading-xl mt-2">{isAmrita ? 'Estate Office Dashboard' : 'Ward Operations Dashboard'}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
              {isAmrita ? 'Campus issues, SLA tracking, proof of fix, and estate office operations for Amrita Bengaluru.' : 'A live view of every citizen report in your jurisdiction — prioritised, verified and ready to act on.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ReportToAuthority
              subject="the selected ward package"
              label="Report to authority"
              variant="primary"
            />
            <button onClick={generateReport} className="btn-secondary">
              <FileDown className="h-4 w-4" />
              Generate report
            </button>
            <button
              onClick={() =>
                void refresh().then(() => toast.info('Refreshed', 'Loaded the latest reports.'))
              }
              className="btn-ghost"
              title="Refresh data"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <TwoFactorCard />
        </div>

        {/* KPI cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-11 w-11 rounded-xl" />
                <div className="skeleton mt-4 h-7 w-16" />
                <div className="skeleton mt-2 h-3 w-24" />
              </div>
            ))
          ) : (
            <>
              <DashboardCard
                icon={ClipboardList}
                label="Open reports"
                value={stats.open}
                delta={4}
                gradient="brand-grad-1"
                index={0}
              />
              <DashboardCard
                icon={Clock}
                label="Pending review"
                value={stats.pending}
                delta={-8}
                gradient="brand-grad-2"
                index={1}
              />
              <DashboardCard
                icon={ShieldCheck}
                label="Verified"
                value={stats.verified}
                delta={12}
                gradient="brand-grad-3"
                index={2}
              />
              <DashboardCard
                icon={CheckCircle2}
                label="Resolved"
                value={stats.resolved}
                delta={6}
                gradient="brand-grad-4"
                index={3}
              />
            </>
          )}
        </div>
        {isAmrita ? (
          <div className="mt-8">
            <EstateOfficeDashboard />
          </div>
        ) : null}
      </div>

      {/* Charts */}
      <div className="section-pad mt-8 grid gap-5 lg:grid-cols-3">
        {/* Category breakdown */}
        <ChartCard
          title="Category breakdown"
          subtitle="Open reports by category"
          className="lg:col-span-1"
        >
          <ul className="space-y-3">
            {categoryBreakdown.slice(0, 8).map((c, i) => (
              <li key={c.category.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {c.category.label}
                  </span>
                  <span className="tabular-nums text-slate-400">{c.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(c.count / maxCategory) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className={cn('h-full rounded-full bg-gradient-to-r', c.category.gradient)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>

        {/* Severity donut */}
        <ChartCard title="Severity distribution" subtitle="Risk-weighted view of the ward">
          <div className="flex items-center gap-6">
            <div className="relative h-40 w-40 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="14"
                  className="stroke-slate-100 dark:stroke-white/10"
                />
                {(() => {
                  let offset = 0;
                  return severityBreakdown.map((s) => {
                    const pct = s.count / totalSeverity;
                    const dash = pct * 2 * Math.PI * 52;
                    const el = (
                      <circle
                        key={s.severity}
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        strokeWidth="14"
                        stroke={SEVERITY_HEX[s.severity]}
                        strokeDasharray={`${dash} ${2 * Math.PI * 52 - dash}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="butt"
                      />
                    );
                    offset += dash;
                    return el;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {scopedReports.length}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  total
                </span>
              </div>
            </div>
            <ul className="flex-1 space-y-2.5">
              {severityBreakdown.map((s) => (
                <li key={s.severity} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: SEVERITY_HEX[s.severity] }}
                    />
                    {SEVERITY_META[s.severity].label}
                  </span>
                  <span className="tabular-nums text-slate-400">
                    {s.count} · {Math.round((s.count / totalSeverity) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        {/* Weekly trend */}
        <ChartCard title="Weekly activity" subtitle="New reports per week (last 8 weeks)">
          <div className="flex h-40 items-end gap-2">
            {weeklyTrend.map((w, i) => (
              <div
                key={w.label}
                className="group relative flex flex-1 flex-col items-center gap-1.5"
              >
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(w.count / maxTrend) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'w-full max-w-8 rounded-t-lg bg-gradient-to-t transition-colors',
                    i === weeklyTrend.length - 1
                      ? 'from-primary-600 to-primary-400'
                      : 'from-primary-500/70 to-primary-300/60 dark:from-primary-700 dark:to-primary-500/70',
                  )}
                />
                <span className="text-[10px] font-medium tabular-nums text-slate-400">
                  {w.count}
                </span>
                <span className="hidden text-[9px] text-slate-400 sm:block">{w.label}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* SLA Escalation + Leaderboard + Proof of Fix */}
      <div className="section-pad mt-5 grid gap-5 lg:grid-cols-3">
        <ChartCard title="SLA Escalation" subtitle="Auto-escalation when deadlines breach" className="lg:col-span-1">
          <div className="space-y-3">
            {(() => {
              const breached = scopedReports.filter((r) => getSLAStatus(r).status === 'breached' && r.status !== 'resolved');
              const atRisk = scopedReports.filter((r) => getSLAStatus(r).status === 'at-risk');
              const escalated = scopedReports.filter((r) => r.escalation && r.escalation.level > 0);
              return (
                <>
                  <div className="flex justify-between text-sm"><span>Breached</span><span className="font-bold text-rose-600">{breached.length}</span></div>
                  <div className="flex justify-between text-sm"><span>At Risk</span><span className="font-bold text-amber-600">{atRisk.length}</span></div>
                  <div className="flex justify-between text-sm"><span>Escalated</span><span className="font-bold text-amber-700">{escalated.length}</span></div>
                  <div className="mt-3 space-y-2">
                    {breached.slice(0,3).map((r) => {
                      const sla = getSLAStatus(r);
                      return (
                        <div key={r.id} className="rounded-lg bg-rose-50 p-2 text-xs dark:bg-rose-500/10">
                          <div className="font-bold truncate">{r.title}</div>
                          <div className="text-rose-600/70">{formatSLATime(sla.hoursLeft)} → {getEscalationTarget(r)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">Critical: 24h, High: 48h, Medium: 7d, Low: 14d. Auto-escalates on breach.</p>
                </>
              );
            })()}
          </div>
        </ChartCard>
        <div className="lg:col-span-1">
          <Leaderboard />
        </div>
        <ChartCard title="Proof of Fix" subtitle="Before/After verified fixes" className="lg:col-span-1">
          <div className="space-y-3">
            {(() => {
              const fixed = scopedReports.filter((r) => r.proof?.afterImage);
              const resolved = scopedReports.filter((r) => r.status === 'resolved');
              return (
                <>
                  <div className="flex justify-between text-sm"><span>Fixed with proof</span><span className="font-bold text-emerald-600">{fixed.length}</span></div>
                  <div className="flex justify-between text-sm"><span>Resolved</span><span className="font-bold">{resolved.length}</span></div>
                  {fixed[0]?.proof ? (
                    <BeforeAfterSlider beforeImage={fixed[0].proof.beforeImage} afterImage={fixed[0].proof.afterImage} aiVerified={fixed[0].proof.verifiedByAI} aiConfidence={fixed[0].proof.aiConfidence} />
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-500">No fix proofs yet. When authorities fix issues, before/after slider appears here with AI verification.</div>
                  )}
                </>
              );
            })()}
          </div>
        </ChartCard>
      </div>

      {/* Map + top areas */}
      <div className="section-pad mt-5 grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <ChartCard
          title={isAmrita ? "Campus map" : "Live ward map"}
          subtitle={isAmrita ? "Campus map with buildings and floor plans" : "Click a pin to inspect a report"}
          className="lg:col-span-2"
        >
          <div className={isAmrita ? "h-[520px] min-h-[520px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/10" : "h-[420px] min-h-[420px] w-full overflow-hidden border-[4px] border-[#172b44] shadow-[5px_5px_0_#ef6b59]"}>
            {isAmrita ? (
              <AmritaCampusMap reports={scopedReports} selectedId={selectedId} onSelect={setSelectedId} className="h-full w-full rounded-none border-0" />
            ) : (
              <MapView reports={scopedReports} selectedId={selectedId} onSelect={setSelectedId} heatmap className="h-full w-full" />
            )}
          </div>
        </ChartCard>

        <ChartCard title="Hotspots" subtitle="Areas with the most reports">
          <ul className="space-y-3">
            {topAreas.map((a, i) => (
              <li key={a.area} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-xs font-extrabold text-primary-600 dark:text-primary-400">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {a.area}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.critical > 0 ? (
                    <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3 w-3" />
                      {a.critical}
                    </span>
                  ) : null}
                  <span className="text-sm font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    {a.count}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            <strong>Tip:</strong> areas with high critical counts should get a site visit this week.
          </div>
        </ChartCard>
      </div>

      {/* Recent reports table */}
      <div className="section-pad mt-5">
        <ChartCard title="Recent reports" subtitle="Latest citizen submissions awaiting action">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-[11px] uppercase tracking-widest text-slate-400 dark:border-white/10">
                  <th className="pb-3 pr-4 font-bold">Report</th>
                  <th className="pb-3 pr-4 font-bold">Category</th>
                  <th className="pb-3 pr-4 font-bold">Severity</th>
                  <th className="pb-3 pr-4 font-bold">Status</th>
                  <th className="pb-3 pr-4 font-bold">Reported</th>
                  <th className="pb-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="py-3.5">
                          <div className="skeleton h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  : null}
                {recent.map((r) => {
                  const severity = SEVERITY_META[r.severity];
                  const status = STATUS_META[r.status];
                  const assigned = authorityById(r.assignedTo);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03]"
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={r.image}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-semibold text-slate-800 dark:text-slate-200">
                              {r.title}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {r.id} · {timeAgo(r.date)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {categoryById(r.category).short}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge className={cn(severity.bg, severity.color)}>{severity.label}</Badge>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col gap-1">
                          <Badge className={cn(status.bg, status.color)}>{status.label}</Badge>
                          {assigned ? (
                            <span className="text-[10px] font-medium text-slate-400">
                              {assigned.name}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {formatDate(r.date)}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolve(r)}
                            disabled={r.status === 'resolved'}
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                            title="Mark resolved"
                          >
                            <Wrench className="h-3 w-3" />
                            Resolve
                          </button>
                          <select
                            value={r.assignedTo ?? ''}
                            onChange={(e) => e.target.value && handleAssign(r, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 focus:border-primary-400 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                            aria-label={`Assign ${r.id}`}
                          >
                            <option value="">Assign to…</option>
                            {authoritiesForScope(isAmrita ? 'campus' : 'city').map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              void rejectAsAuthority(r.id).then(() =>
                                toast.info('Report rejected', `${r.id} marked as rejected.`),
                              );
                            }}
                            disabled={r.status === 'rejected' || r.status === 'resolved'}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
                            title="Reject report"
                            aria-label="Reject report"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {recent.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/80 py-12 text-center dark:border-white/10">
              <Inbox className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No reports yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Reports appear here the moment citizens submit them.
              </p>
            </div>
          ) : null}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <MapIcon className="h-3.5 w-3.5" />
            Showing the 10 most recent reports — all actions update the shared database instantly.
          </div>
        </ChartCard>
      </div>

    </div>
  );
}
