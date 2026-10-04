import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Navigation, ScanLine, Eye, EyeOff, Clock, AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';
import type { Report } from '@/types';
import { categoryById, SEVERITY_META, STATUS_META } from '@/data/categories';
import { Badge } from './Badge';
import { VoteButtons } from './VoteButtons';
import { formatCoordsShort, timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';
import { getSLAStatus, formatSLATime, getEscalationTarget } from '@/services/slaService';
import { BeforeAfterSlider } from './BeforeAfterSlider';

interface ReportCardProps {
  report: Report;
  index?: number;
}

export function ReportCard({ report, index = 0 }: ReportCardProps) {
  const category = categoryById(report.category);
  const severity = SEVERITY_META[report.severity];
  const status = STATUS_META[report.status];
  const [showAnnotated, setShowAnnotated] = useState(false);
  const hasAnnotated = Boolean(report.ai?.annotatedImage);
  const displayImage = showAnnotated && hasAnnotated ? (report.ai?.annotatedImage as string) : report.image;

  const sla = useMemo(() => getSLAStatus(report), [report]);
  const hasProof = Boolean(report.proof?.afterImage);
  const isEscalated = Boolean(report.escalation && report.escalation.level > 0);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group card flex flex-col overflow-hidden"
    >
      <Link to={`/report/${report.id}`} className="relative block overflow-hidden" aria-label={report.title}>
        <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img src={displayImage} alt={report.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className={cn('bg-white/90 text-slate-700 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200')}>{category.label}</Badge>
          {report.ai?.confidence ? (
            <Badge className="bg-emerald-500/90 text-white backdrop-blur">
              <ScanLine className="h-3 w-3" /> AI {Math.round((report.ai.confidence || 0) * 100)}%
            </Badge>
          ) : null}
          {hasProof ? (
            <Badge className="bg-[#A51636]/90 text-white backdrop-blur">
              <CheckCircle2 className="h-3 w-3" /> Fixed ✓
            </Badge>
          ) : null}
          {isEscalated ? (
            <Badge className="bg-amber-500/90 text-white backdrop-blur">
              <AlertTriangle className="h-3 w-3" /> L{report.escalation?.level} Escalated
            </Badge>
          ) : null}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <Badge className={cn('text-white backdrop-blur', status.bg)}>{status.label}</Badge>
          {sla.status === 'breached' ? (
            <Badge className="bg-rose-600/90 text-white backdrop-blur animate-pulse">SLA Breached</Badge>
          ) : sla.status === 'at-risk' ? (
            <Badge className="bg-amber-500/90 text-white backdrop-blur">SLA At Risk</Badge>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur', severity.bg, severity.color)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', severity.dot)} />
            {severity.label} severity
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600 backdrop-blur dark:bg-slate-900/80 dark:text-slate-300">{timeAgo(report.date)}</span>
        </div>
        {hasAnnotated ? (
          <div className="absolute bottom-3 right-3 flex gap-1 lg:bottom-auto lg:top-[52px] lg:right-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAnnotated((v) => !v);
              }}
              className="flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur hover:bg-slate-900"
            >
              {showAnnotated ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {showAnnotated ? 'Original' : 'AI View'}
            </button>
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link to={`/report/${report.id}`} className="text-base font-bold leading-snug text-slate-900 transition-colors hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
          {report.title}
        </Link>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{report.description}</p>

        {report.ai?.summary ? (
          <div className="mt-3 rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-200">
            <span className="flex items-center gap-1 font-bold"><ScanLine className="h-3.5 w-3.5" /> AI: {report.ai.summary}</span>
            {report.ai.objects?.length ? <span className="mt-1 block text-slate-500 dark:text-slate-400">Detected: {report.ai.objects.join(', ')}</span> : null}
          </div>
        ) : null}

        {/* Before/After proof of fix */}
        {hasProof && report.proof ? (
          <div className="mt-3">
            <BeforeAfterSlider 
              beforeImage={report.proof.beforeImage} 
              afterImage={report.proof.afterImage}
              aiVerified={report.proof.verifiedByAI}
              aiConfidence={report.proof.aiConfidence}
            />
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{report.locationName}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="tabular-nums">{formatCoordsShort(report.coordinates)}</span>
        </div>

        {/* SLA tracking with escalation */}
        <div className={`mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${sla.status === 'breached' ? 'bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' : sla.status === 'at-risk' ? 'bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20' : 'bg-slate-50 dark:bg-white/5'}`}>
          <Clock className={`h-3.5 w-3.5 ${sla.status === 'breached' ? 'text-rose-500' : sla.status === 'at-risk' ? 'text-amber-500' : 'text-slate-400'}`} />
          <span className="font-medium text-slate-600 dark:text-slate-300">
            SLA: {formatSLATime(sla.hoursLeft)} · {report.status === 'resolved' ? 'Resolved' : report.status === 'pending' ? 'Pending' : report.status}
          </span>
          {isEscalated ? (
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              → {getEscalationTarget(report)}
            </span>
          ) : report.severity === 'critical' ? (
            <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">Immediate</span>
          ) : null}
        </div>

        {isEscalated && report.escalation ? (
          <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs dark:bg-amber-950/20">
            <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-200">
              <Trophy className="h-3 w-3" /> Escalated L{report.escalation.level}: {report.escalation.reason}
            </div>
            <div className="mt-1 text-amber-700/70 dark:text-amber-300/70">Next: {report.escalation.nextAuthority || getEscalationTarget(report)}</div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
          <VoteButtons report={report} compact />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{report.author}</span>
            <Link to={`https://www.google.com/maps/dir/?api=1&destination=${report.coordinates.lat},${report.coordinates.lng}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-primary-500/10 hover:text-primary-600 dark:hover:text-primary-400" title="Get directions">
              <Navigation className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
