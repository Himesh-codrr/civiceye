import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Crosshair,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Share2,
  ShieldCheck,
  ThumbsDown,
  Wrench,
} from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { useToast } from '@/hooks/useToast';
import { categoryById, SEVERITY_META, STATUS_META } from '@/data/categories';
import { authorityById } from '@/data/authorities';
import { responsibleAuthority } from '@/services/authorityService';
import { AuthorityContactCard } from '@/components/AuthorityContactCard';
import { Badge } from '@/components/Badge';
import { VoteButtons } from '@/components/VoteButtons';
import { ReportCard } from '@/components/ReportCard';
import { ReportToAuthority } from '@/components/ReportToAuthority';
import { EscalateBreach } from '@/components/EscalateBreach';
import { BeforeAfterSlider, ProofOfFixUploader } from '@/components/BeforeAfterSlider';
import { getSLAStatus, formatSLATime, getEscalationTarget } from '@/services/slaService';
import { EmptyState } from '@/components/EmptyState';
import { ReviewSection } from '@/components/ReviewSection';
import { formatCoords, formatDateTime, timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';

/** Full report view with voting, validation and related reports. */
export function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reports, getById } = useReports();
  const toast = useToast();

  const report = id ? getById(id) : undefined;

  if (!report) {
    return (
      <div className="section-pad py-24">
        <EmptyState
          icon={<MapPin className="h-8 w-8" />}
          title="Report not found"
          description="This report may have been removed, or the link is incorrect."
          action={
            <button onClick={() => navigate(-1)} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
          }
        />
      </div>
    );
  }

  const category = categoryById(report.category);
  const severity = SEVERITY_META[report.severity];
  const status = STATUS_META[report.status];
  const assigned = authorityById(report.assignedTo);
  const related = reports
    .filter((r) => r.id !== report.id && r.category === report.category)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);

  const share = async () => {
    try {
      await navigator.share({
        title: report.title,
        text: report.description,
        url: window.location.href,
      });
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      } catch {
        toast.error('Could not share');
      }
    }
  };

  return (
    <div className="pb-20 pt-[calc(var(--nav-height)+2.5rem)] sm:pt-[calc(var(--nav-height)+3.5rem)]">
      <div className="section-pad">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Main column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            {/* Hero image with AI annotation toggle */}
            <div className="card overflow-hidden">
              <div className="relative">
                <img
                  src={report.ai?.annotatedImage || report.image}
                  alt={report.title}
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                  <Badge className="bg-white/90 text-slate-700 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
                    {category.label}
                  </Badge>
                  <Badge className={cn('backdrop-blur', severity.bg, severity.color)}>
                    {severity.label} severity
                  </Badge>
                  <Badge className={cn('backdrop-blur', status.bg, status.color)}>
                    {status.label}
                  </Badge>
                  {report.verified ? (
                    <Badge className="bg-emerald-500/90 text-white backdrop-blur">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : null}
                  {report.ai?.annotatedImage ? (
                    <Badge className="bg-sky-500/90 text-white backdrop-blur">AI Annotated</Badge>
                  ) : null}
                </div>
                {report.ai?.annotatedImage ? (
                  <div className="absolute left-3 top-3 flex gap-2">
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">AI View: {report.ai.confidence ? Math.round(report.ai.confidence*100)+'%' : ''} {report.ai.model ?? ''}</span>
                  </div>
                ) : null}
              </div>

              {report.ai ? (
                <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Original</div>
                    <img src={report.image} alt="Original" className="h-32 w-full rounded-xl object-cover" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">AI Annotated with exact outline</div>
                    <img src={report.ai.annotatedImage || report.image} alt="AI Annotated" className="h-32 w-full rounded-xl object-cover border border-emerald-300" />
                    <div className="text-xs text-slate-500">Model: {report.ai.model} · Confidence: {report.ai.confidence ? Math.round(report.ai.confidence*100)+'%' : '—'} · Detected: {(report.ai.objects||[]).join(', ')}</div>
                  </div>
                </div>
              ) : null}

              <div className="p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
                  {report.id} · {timeAgo(report.date)}
                </p>
                <h1 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-3xl">
                  {report.title}
                </h1>
                <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 text-primary-500" />
                  {report.locationName}
                </p>
                <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  {report.description}
                </p>

                {/* Report meta */}
                <div className="mt-7 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-primary-500" />
                    <span>
                      Reported <strong>{formatDateTime(report.date)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <Crosshair className="h-4 w-4 text-primary-500" />
                    <span className="tabular-nums">{formatCoords(report.coordinates)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <MapPin className="h-4 w-4 text-primary-500" />
                    <span>By {report.author}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <Wrench className="h-4 w-4 text-primary-500" />
                    {assigned ? (
                      <span>
                        Assigned to <strong>{assigned.name}</strong>
                      </span>
                    ) : (
                      <span>Not yet assigned to an agency</span>
                    )}
                  </div>
                </div>

                {/* Proof of Fix - Before/After */}
                {report.proof ? (
                  <div className="mt-7">
                    <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Proof of Fix — Before / After Verified
                    </h2>
                    <BeforeAfterSlider 
                      beforeImage={report.proof.beforeImage} 
                      afterImage={report.proof.afterImage}
                      aiVerified={report.proof.verifiedByAI}
                      aiConfidence={report.proof.aiConfidence}
                    />
                    <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10">
                      <p className="font-medium text-emerald-800 dark:text-emerald-200">Fixed on {new Date(report.proof.fixedDate).toLocaleDateString()} — {report.proof.description || 'Issue has been resolved and verified'}</p>
                    </div>
                  </div>
                ) : report.status === 'resolved' ? (
                  <div className="mt-7">
                    <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Proof of Fix</h2>
                    <div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
                      <p className="text-sm text-slate-600 dark:text-slate-400">This issue is marked resolved but no after photo yet. Authorities can upload fix proof.</p>
                      <div className="mt-4">
                        <ProofOfFixUploader beforeImage={report.image} onUploadAfter={(url) => console.log('After uploaded', url)} onVerify={() => toast.success('AI verifying fix...')} />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* SLA & Escalation */}
                <div className="mt-7 rounded-2xl border border-slate-200 p-5 dark:border-white/10">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A51636]/10 text-[#A51636]">⏱</span> SLA & Escalation Tracking
                  </h3>
                  {(() => {
                    const sla = getSLAStatus(report);
                    return (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Deadline</span><span className="font-mono font-medium">{new Date(sla.deadline).toLocaleDateString()}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Time left</span><span className={`font-bold ${sla.status === 'breached' ? 'text-rose-600' : sla.status === 'at-risk' ? 'text-amber-600' : 'text-emerald-600'}`}>{formatSLATime(sla.hoursLeft)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${sla.status === 'breached' ? 'bg-rose-100 text-rose-700' : sla.status === 'at-risk' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{sla.status.toUpperCase()}</span></div>
                        {report.escalation ? <div className="flex justify-between"><span className="text-slate-500">Escalated to</span><span className="font-medium">{getEscalationTarget(report)} L{report.escalation.level}</span></div> : null}
                      </div>
                    );
                  })()}

                  {/* Escalate-to-higher button — only when SLA is breached AND report not resolved/rejected */}
                  {(() => {
                    const s = getSLAStatus(report);
                    const canEscalate = s.status === 'breached' && report.status !== 'resolved' && report.status !== 'rejected';
                    if (!canEscalate) return null;
                    // Cap at top of chain: city → 3, campus → 2.
                    const atTop = (report.scope === 'campus' && (report.escalation?.level || 0) >= 2) ||
                                  (report.scope !== 'campus' && (report.escalation?.level || 0) >= 3);
                    if (atTop) {
                      return (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                          This report has already been escalated to the highest level ({getEscalationTarget(report)}).
                          Please follow up directly with the office via the contact details above.
                        </p>
                      );
                    }
                    return (
                      <div className="mt-4">
                        <EscalateBreach report={report} />
                        <p className="mt-2 text-center text-[11px] leading-relaxed text-rose-600/80">
                          This sends an immediate SLA-breach notice via email (with SMS / WhatsApp / call fallback)
                          to the next office in the chain.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Community validation */}
                <div className="mt-7">
                  <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
                    Community validation
                  </h2>
                  <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="chip">
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                        {report.confirms} confirmations
                      </span>
                      <span className="chip">
                        <ThumbsDown className="h-3.5 w-3.5 text-rose-500" />
                        {report.rejects} rejections
                      </span>
                      <span className="chip">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        {report.verified
                          ? 'Verified'
                          : `Needs ${3 - report.confirms} more confirmations`}
                      </span>
                    </div>
                    <VoteButtons report={report} />
                  </div>
                </div>
              </div>
            </div>

            {/* Community reviews */}
            <ReviewSection reportId={report.id} />

            {/* Related reports */}
            {related.length > 0 ? (
              <div>
                <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                  Similar reports nearby
                </h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((r, i) => (
                    <ReportCard key={r.id} report={r} index={i} />
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>

          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="space-y-5"
          >
            <div className="card overflow-hidden">
              <div className="h-56">
                <iframe
                  title="Report location"
                  src={`https://maps.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}&z=15&output=embed`}
                  className="h-full w-full border-0 grayscale-[0.2]"
                  loading="lazy"
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {report.locationName}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${report.coordinates.lat},${report.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline dark:text-primary-400"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Directions
                </a>
              </div>
            </div>

            <div className="card space-y-3 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Take action</h3>
              <button onClick={() => void share()} className="btn-secondary w-full">
                <Share2 className="h-4 w-4" />
                Share this report
              </button>
              <ReportToAuthority
                report={report}
                subject={`report ${report.code ?? report.id}`}
                label="Report to authority"
                variant="primary"
                className="w-full"
              />
              <Link to="/report" className="btn-ghost w-full">
                File your own report
              </Link>
            </div>

            {/* Fixed Status Dashboard — nearby Report to Authority */}
            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">✓</span> Fix Status Dashboard
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Current Status</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : report.status === 'in-progress' ? 'bg-amber-100 text-amber-700' : report.status === 'verified' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {report.status === 'resolved' ? '✓ Fixed' : report.status === 'in-progress' ? '🔧 Fix in Progress' : report.status === 'verified' ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className={`h-full rounded-full transition-all ${report.status === 'resolved' ? 'bg-emerald-500 w-full' : report.status === 'in-progress' ? 'bg-amber-500 w-3/4' : report.status === 'verified' ? 'bg-blue-500 w-1/2' : 'bg-slate-400 w-1/4'}`} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/5">
                    <div className="text-[11px] text-slate-500">Reported</div>
                    <div className="font-bold">{new Date(report.date).toLocaleDateString()}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/5">
                    <div className="text-[11px] text-slate-500">{report.proof ? 'Fixed' : 'Est. Fix'}</div>
                    <div className="font-bold">{report.proof ? new Date(report.proof.fixedDate).toLocaleDateString() : report.sla ? new Date(report.sla.deadline).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
                {report.proof ? (
                  <div className="rounded-lg bg-emerald-50 p-2 text-xs dark:bg-emerald-500/10">
                    <div className="font-bold text-emerald-800 dark:text-emerald-200">✓ Fix verified {report.proof.verifiedByAI ? `by AI ${report.proof.aiConfidence ? Math.round(report.proof.aiConfidence*100)+'%' : ''}` : ''}</div>
                    <div className="mt-1 text-emerald-700/70 dark:text-emerald-300/70">{report.proof.description || 'Issue has been fixed and verified with before/after proof'}</div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 p-2 text-xs dark:bg-amber-500/10">
                    <div className="font-medium text-amber-800 dark:text-amber-200">No fix proof yet — authorities can upload after photo to show before/after verification</div>
                  </div>
                )}
              </div>
            </div>

            {/* Responsible authority — public contact channels */}
            <AuthorityContactCard
              authority={responsibleAuthority(report)}
              heading={
                assigned
                  ? `Escalate further — ${responsibleAuthority(report).name}`
                  : 'Report this to'
              }
              className="card"
            />

            {assigned ? (
              <div className="card flex items-start gap-3 p-5">
                <span
                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: assigned.color }}
                >
                  <Wrench className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Handled by
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                    {assigned.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {assigned.department}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {assigned.phone ? (
                      <a
                        href={`tel:${assigned.phone.replace(/[^\d+]/g, '')}`}
                        className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                      >
                        <Phone className="h-3 w-3" />
                        {assigned.phone}
                      </a>
                    ) : null}
                    <a
                      href={`mailto:${assigned.email}`}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
