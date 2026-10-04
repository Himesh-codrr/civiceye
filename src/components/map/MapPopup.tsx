import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowBigUp, Calendar, Crosshair, Eye, MapPin, Navigation, ShieldCheck, X } from 'lucide-react';
import type { Report } from '@/types';
import { categoryById, SEVERITY_META, STATUS_META } from '@/data/categories';
import { formatCoordsShort, formatDate } from '@/utils/format';
import { useToast } from '@/hooks/useToast';
import { useReports } from '@/hooks/useReports';
import { compactNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

interface MapPopupProps {
  report: Report;
  onClose?: () => void;
}

/**
 * Marker popup content — shared by the Google InfoWindow and the
 * built-in fallback map overlay. Toggles between the citizen's photo
 * and the AI-annotated version when AI has produced an overlay.
 */
export function MapPopup({ report, onClose }: MapPopupProps) {
  const category = categoryById(report.category);
  const severity = SEVERITY_META[report.severity];
  const status = STATUS_META[report.status];
  const { voteUp } = useReports();
  const toast = useToast();
  const annotatedImage = (report as any).annotatedImage || (report.ai as any)?.annotatedImage || null;
  const [showAI, setShowAI] = useState(false);
  const displayedImage = showAI && annotatedImage ? annotatedImage : report.image;

  return (
    <div className="w-[300px] overflow-hidden rounded-2xl bg-white text-left shadow-xl dark:bg-slate-900 sm:w-[330px]">
      <div className="relative">
        <img src={displayedImage} alt={report.title} className="h-36 w-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 text-slate-600 backdrop-blur transition-colors hover:bg-white dark:bg-slate-800/90 dark:text-slate-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {annotatedImage ? (
          <button
            onClick={() => setShowAI((v) => !v)}
            className={cn(
              'absolute left-2 top-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold backdrop-blur transition-colors',
              showAI
                ? 'bg-emerald-500 text-white'
                : 'bg-white/90 text-slate-700 hover:bg-white dark:bg-slate-800/90 dark:text-slate-200',
            )}
          >
            <Eye className="h-3 w-3" />
            {showAI ? 'AI view ✓' : 'View AI'}
          </button>
        ) : null}
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
            {category.label}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur',
              status.bg,
              status.color,
            )}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h4 className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
            {report.title}
          </h4>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <MapPin className="h-3 w-3" />
            {report.locationName}
          </p>
        </div>

        <p className="line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {report.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5',
              severity.bg,
              severity.color,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', severity.dot)} />
            {severity.label} severity
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary-500/10 px-2 py-0.5 text-primary-600 dark:text-primary-400">
            <ArrowBigUp className="h-3 w-3" />
            {compactNumber(report.votes)} votes
          </span>
          {report.verified ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          ) : null}
        </div>

        <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
          <p className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Reported {formatDate(report.date)} by {report.author}
          </p>
          <p className="flex items-center gap-1.5 tabular-nums">
            <Crosshair className="h-3 w-3" />
            {formatCoordsShort(report.coordinates)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              voteUp(report.id);
              toast.success('Vote counted!', 'Thanks for supporting this report.');
            }}
            className="btn-primary flex-1 !px-3 !py-2 text-xs"
          >
            <ArrowBigUp className="h-4 w-4" />
            Support report
          </button>
          <Link to={`/report/${report.id}`} className="btn-secondary flex-1 !px-3 !py-2 text-xs">
            Details
          </Link>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${report.coordinates.lat},${report.coordinates.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary !px-3 !py-2 text-xs"
            title="Directions"
            aria-label="Get directions"
          >
            <Navigation className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
