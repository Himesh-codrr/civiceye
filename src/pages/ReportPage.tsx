import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Cpu,
  Check,
  ChevronDown,
  Crosshair,
  ExternalLink,
  Info,
  LocateFixed,
  MapPin,
  PartyPopper,
  QrCode,
  RefreshCw,
  ScanLine,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';
import type { AnalysisResult, CategoryId, Coordinates, Report, ReportDraft, Severity } from '@/types';
import { getAvailableCategories, SEVERITY_META, categoryById } from '@/data/categories';
import { useBrand } from '@/hooks/useBrand';
import { CATEGORY_ICONS } from '@/components/categoryIcons';
import { Stepper } from '@/components/Stepper';
import { ImageUploader } from '@/components/ImageUploader';
import { QRPopup } from '@/components/QRPopup';
import { MapView } from '@/components/map/MapView';
import { AmritaCampusMap } from '@/components/campus/AmritaCampusMap';
import { ReportToAuthority } from '@/components/ReportToAuthority';
import { authorityForCategory } from '@/data/authorities';
import { Loader } from '@/components/Loader';
import { useReports } from '@/hooks/useReports';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { TwoFactorGate } from '@/components/TwoFactorGate';
import { isGuest } from '@/utils/guest';
import { ANALYSIS_STAGES, analysisTotalMs, runImageAnalysis } from '@/services/aiAnalysisService';
import { roboflowStatus } from '@/services/roboflowService';
import { requestLocation } from '@/services/geoService';
import { mockReverseGeocode } from '@/services/geocodeService';
import { publishPhoto } from '@/services/syncService';
import { uploadReportPhoto, uploadAnnotatedPhoto } from '@/lib/storage';
import { sanitizeInput, validateImageDataUrl, checkRateLimit, containsSuspiciousContent, logAudit } from '@/lib/security';
import { displayName } from '@/services/reportService';
import { CAMPUS_CONFIG, isInsideCampus } from '@/data/campus';
import { formatCoords } from '@/utils/format';
import { cn } from '@/utils/cn';

/* ------------------------------------------------------------------ */
/* Wizard metadata                                                     */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: 'Category', description: 'What is it?' },
  { label: 'Photo', description: 'Add evidence' },
  { label: 'AI Analysis', description: 'Auto-detect' },
  { label: 'Location', description: 'Pin it' },
  { label: 'Details', description: 'Describe' },
  { label: 'Review', description: 'Submit' },
];

const emptyDraft = (): ReportDraft => ({
  category: 'pothole',
  photo: null,
  analysis: null,
  coordinates: null,
  locationName: '',
  title: '',
  description: '',
});

/* ------------------------------------------------------------------ */
/* Page entry — QR phone mode vs full wizard                           */
/* ------------------------------------------------------------------ */

export function ReportPage() {
  const [searchParams] = useSearchParams();
  const session = searchParams.get('session');

  // Phone capture mode: the URL opened from the QR code.
  if (session) return <PhoneCapture sessionId={session} />;

  return <ReportWizard />;
}

/* ------------------------------------------------------------------ */
/* Desktop / mobile wizard                                             */
/* ------------------------------------------------------------------ */

function ReportWizard() {
  const { addReport, getById } = useReports();
  const toast = useToast();
  const navigate = useNavigate();
  const { user, profile, configured } = useAuth();
  const [mfaGateOpen, setMfaGateOpen] = useState(false);
  const { isAmrita } = useBrand();
  const availableCategories = getAvailableCategories(isAmrita);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const [qrOpen, setQrOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [chosenScope, setChosenScope] = useState<'city' | 'campus' | null>(null);
  const [retrying, setRetrying] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Auto-detect scope. Amrita Eye: coordinates inside the campus → campus
  // report (user can override). CivicEye is city-only — never campus.
  const insideCampus = isAmrita && draft.coordinates ? isInsideCampus(draft.coordinates) : false;
  const detectedScope: 'city' | 'campus' = isAmrita ? (insideCampus ? 'campus' : 'city') : 'city';
  const finalScope = chosenScope ?? detectedScope;

  const update = useCallback(
    (patch: Partial<ReportDraft>) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );

  /* ----- Auto-run AI analysis when a photo arrives ----- */
  useEffect(() => {
    if (!draft.photo || draft.analysis) return;

    const total = analysisTotalMs();
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / total);
      setAnalysisProgress(progress);
      if (progress >= 1 && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
        void (async () => {
          const result = await runImageAnalysis(
            draft.photo as string,
            draft.coordinates,
          );
          update({ analysis: result, category: result.category });
          if (result.imageQuality && result.imageQuality !== 'clear') {
            toast.warning(
              'Photo may be unclear',
              result.qualityNote ??
                'The AI suggests retaking the photo for a more accurate detection.',
            );
          } else {
            toast.success(
              'AI analysis complete',
              'Category, severity and description were auto-detected.',
            );
          }
        })();
      }
    }, 90);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.photo]);

  /* ----- Re-run AI on the same photo (rate-limit / retake-friendly) ----- */
  const retryAnalysis = useCallback(async () => {
    if (!draft.photo || retrying) return;
    setRetrying(true);
    setAnalysisProgress(0);
    update({ analysis: null });
    try {
      const result = await runImageAnalysis(draft.photo as string, draft.coordinates);
      update({ analysis: result, category: result.category });
      if (result.imageQuality && result.imageQuality !== 'clear') {
        toast.warning(
          'Photo may be unclear',
          result.qualityNote ?? 'The AI suggests retaking the photo for a more accurate detection.',
        );
      } else {
        toast.success('AI analysis complete', 'Category, severity and description were auto-detected.');
      }
    } catch (err) {
      toast.error('Analysis failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setRetrying(false);
    }
  }, [draft.photo, draft.coordinates, retrying, toast, update]);

  /* ----- Photo from QR / uploader ----- */
  const handlePhoto = useCallback((photo: string) => {
    update({ photo, analysis: null });
    setStep(2);
    setAnalysisProgress(0);
  }, [update]);

  // A result is "relevant" only if the model found a real civic issue
  // (not "other") with at least some confidence. Irrelevant photos (a
  // random street, a pet, etc.) are blocked so users don't submit junk.
  const isRelevantAnalysis = (a: AnalysisResult | null): boolean =>
    Boolean(a && a.category !== 'other' && a.confidence >= 0.3);

  const canContinue = (() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return Boolean(draft.photo);
      case 2:
        return isRelevantAnalysis(draft.analysis);
      case 3:
        return Boolean(draft.coordinates);
      case 4:
        return draft.title.trim().length >= 8 && draft.description.trim().length >= 20;
      case 5:
        return Boolean(draft.photo && draft.analysis && draft.coordinates);
      default:
        return false;
    }
  })();

  const submit = async () => {
    if (!draft.photo || !draft.analysis || !draft.coordinates) return;
    if (!user) {
      toast.error('Please sign in first', 'You need an account to submit a report.');
      navigate('/login?next=/report');
      return;
    }
    // Security: rate limiting - 5 reports per 10 minutes
    if (!checkRateLimit(`report:${user.id}`, 5, 10 * 60 * 1000)) {
      toast.error('Too many reports', 'Please wait 10 minutes before submitting another report. Rate limit for security.');
      return;
    }
    // Security: validate image
    if (draft.photo) {
      const imgCheck = validateImageDataUrl(draft.photo);
      if (!imgCheck.valid) {
        toast.error('Invalid image', imgCheck.error || 'Please upload a valid JPEG/PNG/WebP image under 10MB.');
        return;
      }
    }
    // Security: sanitize and check suspicious
    const sanitizedTitle = sanitizeInput(draft.title);
    const sanitizedDesc = sanitizeInput(draft.description);
    if (containsSuspiciousContent(draft.title) || containsSuspiciousContent(draft.description)) {
      toast.error('Invalid content', 'Your report contains suspicious content that was blocked for security.');
      logAudit('blocked_suspicious_report', { userId: user.id, details: `Title: ${draft.title.slice(0,100)}` });
      return;
    }
    if (!sanitizedTitle || sanitizedTitle.length < 5) {
      toast.error('Title too short', 'Please provide a more descriptive title (min 5 chars).');
      return;
    }
    if (!sanitizedDesc || sanitizedDesc.length < 10) {
      toast.error('Description too short', 'Please provide more details (min 10 chars).');
      return;
    }
    setUploading(true);
    try {
      // Upload both original and AI annotated photos to Supabase Storage (two instances per your request)
      const photoUrl = await uploadReportPhoto(draft.photo, user.id);
      let annotatedUrl: string | null = null;
      if (draft.analysis?.annotatedImage) {
        try {
          annotatedUrl = await uploadAnnotatedPhoto(draft.analysis.annotatedImage, user.id);
        } catch {
          annotatedUrl = draft.analysis.annotatedImage;
        }
      }
      const report = await addReport({
        title: sanitizedTitle,
        description: sanitizedDesc,
        coordinates: draft.coordinates,
        locationName: draft.locationName || mockReverseGeocode(draft.coordinates),
        category: draft.category,
        severity: draft.analysis.severity,
        photoUrl,
        author: displayName(profile),
        userId: user.id,
        scope: finalScope,
        ai: {
          confidence: draft.analysis.confidence,
          objects: draft.analysis.objects,
          summary: draft.analysis.description,
          model:
            draft.analysis.engine === 'roboflow'
              ? 'roboflow-detector'
              : draft.analysis.engine === 'ondevice'
                ? 'transformers.js-ondevice'
                : draft.analysis.engine === 'huggingface'
                  ? 'huggingface-inference'
                  : 'mock-vision-v2.4',
          imageQuality: draft.analysis.imageQuality ?? null,
          disclaimer:
            'AI confidence is an estimate and may be inaccurate. Verify the issue before acting.',
          annotatedImage: annotatedUrl || draft.analysis.annotatedImage || null,
          originalImage: photoUrl,
        },
      });
      logAudit('report_created', { userId: user.id, reportId: report.id, details: `${sanitizedTitle} - ${report.category}` });
      setCreatedId(report.id);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Report submitted! 🎉', 'Thank you for helping your community.');
    } catch (err) {
      toast.error(
        'Could not submit the report',
        err instanceof Error ? err.message : 'Please try again in a moment.',
      );
    } finally {
      setUploading(false);
    }
  };

  const stepTitles = [
    { title: 'What did you spot?', sub: 'Pick the category that best describes the issue.' },
    { title: 'Add evidence', sub: 'A photo helps authorities prioritise your report.' },
    {
      title: 'AI is analysing your photo',
      sub: 'Our vision model estimates the issue automatically (verify it yourself too).',
    },
    { title: 'Where is it?', sub: 'We can grab your location, or you can drop a pin.' },
    { title: 'A few more details', sub: 'Tell the ward team exactly what is happening.' },
    { title: 'Review & submit', sub: 'One last look before your report goes live.' },
  ];

  const analysis = draft.analysis;
  const analysisStageIndex = Math.min(
    ANALYSIS_STAGES.length - 1,
    Math.floor(analysisProgress * ANALYSIS_STAGES.length),
  );

  return (
    <div className="pb-20 pt-[calc(var(--nav-height)+2.5rem)] sm:pt-[calc(var(--nav-height)+3.5rem)]">
      <TwoFactorGate
        open={mfaGateOpen}
        onClose={() => setMfaGateOpen(false)}
        onVerified={() => {
          setMfaGateOpen(false);
          void submit();
        }}
      />
      <div className="section-pad">
        <div className="mb-10">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            <Target className="h-4 w-4" />
            Report an issue
          </p>
          <h1 className="heading-xl mt-2">60 seconds to a safer street</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            Your report is saved to the live database and shared with the community + staff who can
            fix it.
          </p>
        </div>

        <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/60 p-4 backdrop-blur dark:border-white/5 dark:bg-white/[0.02]">
          <Stepper steps={STEPS} current={step} onStepClick={(i) => i < step && setStep(i)} />
        </div>

        {submitted ? (
          <SuccessScreen
            reportId={createdId}
            report={createdId ? getById(createdId) : undefined}
            onNew={() => {
              setDraft(emptyDraft());
              setStep(0);
              setSubmitted(false);
            }}
            onMap={() => navigate('/map')}
            onReport={() => createdId && navigate(`/report/${createdId}`)}
          />
        ) : (
          <div className="mx-auto max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {stepTitles[step].title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {stepTitles[step].sub}
                  </p>
                </div>

                {/* STEP 1 — Category */}
                {step === 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {availableCategories.map((c) => {
                      const Icon = CATEGORY_ICONS[c.id];
                      const active = draft.category === c.id;
                      return (
                        <motion.button
                          key={c.id}
                          whileHover={{ y: -2 }}
                          onClick={() => update({ category: c.id })}
                          aria-pressed={active}
                          className={cn(
                            'relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all',
                            active
                              ? 'border-primary-500 bg-primary-500/10 shadow-glow'
                              : 'border-slate-200/80 bg-white/80 hover:border-primary-300 dark:border-white/10 dark:bg-white/[0.04]',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-soft',
                              c.gradient,
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                              {c.label}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                              {c.description}
                            </span>
                          </span>
                          {active ? (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : null}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : null}

                {/* STEP 2 — Photo */}
                {step === 1 ? (
                  <div className="space-y-4">
                    <ImageUploader
                      value={draft.photo}
                      onChange={(photo) => (photo ? handlePhoto(photo) : update({ photo: null }))}
                    />
                    <div className="relative">
                      <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-white/10" />
                      <span className="relative mx-auto block w-fit rounded-full bg-white px-4 py-1 text-xs font-bold text-slate-400 dark:bg-slate-900">
                        or
                      </span>
                    </div>
                    <button
                      onClick={() => setQrOpen(true)}
                      className="btn-secondary w-full !py-3.5"
                    >
                      <QrCode className="h-5 w-5" />
                      Scan from my phone (desktop flow)
                    </button>
                  </div>
                ) : null}

                {/* STEP 3 — AI Analysis */}
                {step === 2 && analysis ? (
                  <AnalysisResultCard
                    analysis={analysis}
                    photo={draft.photo as string}
                    onCategoryChange={(category) => {
                      // Update BOTH the draft category AND the analysis so
                      // the dropdown stays in sync (previously it snapped back
                      // to the AI's choice because analysis.category was read-only).
                      update({ category });
                      setDraft((d) =>
                        d.analysis ? { ...d, analysis: { ...d.analysis, category } } : d,
                      );
                    }}
                    onSeverityChange={(severity) => update({ analysis: { ...analysis, severity } })}
                    onRetry={() => void retryAnalysis()}
                    retrying={retrying}
                  />
                ) : step === 2 ? (
                  <AnalysisProgressCard
                    photo={draft.photo as string}
                    progress={analysisProgress}
                    stageIndex={analysisStageIndex}
                  />
                ) : null}

                {/* Block irrelevant photos: if analysis ran but found no
                    real issue, warn + keep Continue disabled. */}
                {step === 2 && analysis && !isRelevantAnalysis(analysis) ? (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-300/70 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                    <Camera className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                    <div>
                      <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
                        No relevant issue detected in this photo
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-rose-700 dark:text-rose-400">
                        This image doesn't clearly show a pothole, broken road, garbage, fallen
                        tree, broken light or other civic issue. Please{' '}
                        <strong>retake the photo</strong> of the actual problem so staff can act on
                        it — the Continue button stays disabled until a relevant issue is found.
                      </p>
                      <button
                        onClick={() => {
                          update({ photo: null, analysis: null });
                          setStep(1);
                          setAnalysisProgress(0);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-500"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retake photo
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* STEP 4 — Location */}
                {step === 3 ? (
                  <LocationStep
                    coordinates={draft.coordinates}
                    locationName={draft.locationName}
                    isAmrita={isAmrita}
                    insideCampus={insideCampus}
                    finalScope={finalScope}
                    chosenScope={chosenScope}
                    onScopeChange={setChosenScope}
                    onCoordinates={async (coords) => {
                      update({ coordinates: coords, locationName: mockReverseGeocode(coords) });
                    }}
                    onLocationName={(name) => update({ locationName: name })}
                  />
                ) : null}

                {/* STEP 5 — Details */}
                {step === 4 ? <DetailsStep draft={draft} onChange={update} /> : null}

                {/* STEP 6 — Review */}
                {step === 5 ? <ReviewStep draft={draft} finalScope={finalScope} /> : null}

                {/* Nav buttons */}
                <div className="mt-8 flex items-center justify-between">
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="btn-ghost disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  {step < STEPS.length - 1 ? (
                    <button
                      onClick={() => setStep((s) => s + 1)}
                      disabled={!canContinue}
                      className="btn-primary"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (configured && user && !isGuest()) {
                          setMfaGateOpen(true);
                        } else {
                          void submit();
                        }
                      }}
                      disabled={!canContinue || uploading}
                      className="btn-primary"
                    >
                      {uploading ? <Loader size="sm" /> : <Send className="h-4 w-4" />}
                      {uploading ? 'Uploading photo…' : 'Submit report'}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      <QRPopup open={qrOpen} onClose={() => setQrOpen(false)} onPhoto={handlePhoto} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI analysis — progress & result                                     */
/* ------------------------------------------------------------------ */

function AnalysisProgressCard({
  photo,
  progress,
  stageIndex,
}: {
  photo: string;
  progress: number;
  stageIndex: number;
}) {
  return (
    <div className="card overflow-hidden p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl">
          <img src={photo} alt="Being analysed" className="aspect-[16/9] w-full object-cover" />
          <motion.div
            animate={{ top: ['0%', '92%', '0%'] }}
            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            className="absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-primary-400/40 to-transparent"
          />
          <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-primary-400/40" />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
            <ScanLine className="h-3 w-3" />
            VISION MODEL v2.4
          </span>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Analysing your photo…
          </h3>
          <div className="space-y-3">
            {ANALYSIS_STAGES.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                    i < stageIndex
                      ? 'bg-emerald-500 text-white'
                      : i === stageIndex
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 text-slate-400 dark:bg-white/10',
                  )}
                >
                  {i < stageIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      i <= stageIndex ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400',
                    )}
                  >
                    {s.label}
                  </p>
                  {i === stageIndex ? (
                    <p className="truncate text-xs text-primary-500 dark:text-primary-400">
                      {s.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisResultCard({
  analysis,
  photo,
  onCategoryChange,
  onSeverityChange,
  onRetry,
  retrying,
}: {
  analysis: AnalysisResult;
  photo: string;
  onCategoryChange: (category: CategoryId) => void;
  onSeverityChange: (severity: Severity) => void;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const { isAmrita } = useBrand();
  const availableCategories = getAvailableCategories(isAmrita);
  const confidencePct = Math.round(analysis.confidence * 100);
  const [showAnnotated, setShowAnnotated] = useState(false);
  const canShowAnnotated = Boolean(analysis.annotatedImage);
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={showAnnotated && analysis.annotatedImage ? analysis.annotatedImage : photo}
              alt="Analysed evidence"
              className="aspect-[16/9] w-full object-cover"
            />
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5" />
              ANALYSED
            </span>
            {canShowAnnotated ? (
              <div className="absolute right-3 top-3 flex gap-1 rounded-lg bg-slate-950/70 p-1 backdrop-blur">
                <button
                  onClick={() => setShowAnnotated(false)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
                    !showAnnotated ? 'bg-white text-slate-900' : 'text-white hover:text-white/80',
                  )}
                >
                  Original
                </button>
                <button
                  onClick={() => setShowAnnotated(true)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
                    showAnnotated ? 'bg-white text-slate-900' : 'text-white hover:text-white/80',
                  )}
                >
                  AI annotated
                </button>
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="detected-category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Detected category
                </label>
                <span className="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  ⚠️ AI may be wrong — you can change it
                </span>
              </div>
              <div className="relative">
                <select
                  id="detected-category"
                  value={analysis.category}
                  onChange={(e) => onCategoryChange(e.target.value as CategoryId)}
                  className="w-full appearance-none rounded-xl border border-slate-300/80 bg-white py-2.5 pl-4 pr-10 text-sm font-semibold text-slate-800 transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15 dark:border-white/15 dark:bg-slate-800 dark:text-slate-100"
                  aria-label="Detected category (editable)"
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <p className="label-base flex items-center justify-between">
                <span>Confidence</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {confidencePct}%
                </span>
              </p>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
                />
              </div>
            </div>
            <div>
              <p className="label-base">Estimated severity</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SEVERITY_META) as Severity[]).map((s) => {
                  const meta = SEVERITY_META[s];
                  const active = analysis.severity === s;
                  return (
                    <button
                      key={s}
                      onClick={() => onSeverityChange(s)}
                      aria-pressed={active}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-all',
                        active
                          ? 'border-current bg-current/5'
                          : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400',
                        meta.color,
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <p className="label-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-500" />
          AI description (editable in the next step)
        </p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {analysis.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.objects.map((obj) => (
            <span key={obj} className="chip !py-1.5">
              {obj}
            </span>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <Crosshair className="h-3.5 w-3.5" />
          Analysed at{' '}
          {new Date(analysis.timestamp).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · GPS
          {analysis.coordinates ? formatCoords(analysis.coordinates) : ' not available yet'}
        </p>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>AI disclaimer:</strong> this confidence score is an automated estimate and may
            be inaccurate. Please verify the issue with your own eyes before reporting or acting on
            it.
          </span>
        </p>
        {analysis.imageQuality && analysis.imageQuality !== 'clear' ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <Camera className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>⚠️ Photo looks{' '}
                {analysis.imageQuality === 'low-light' ? 'too dark' : analysis.imageQuality}.</strong>{' '}
              {analysis.qualityNote ??
                'The AI may not have detected the issue accurately. Consider retaking the photo in good lighting and holding the camera steady.'}
            </span>
          </p>
        ) : null}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {analysis.engine === 'roboflow' ? (
            <>
              <ScanLine className="h-3.5 w-3.5 text-primary-500" />
              <span className="normal-case text-primary-700 dark:text-primary-300">
                ✅ Detected by CivicLENS AI (real object detection)
              </span>
            </>
          ) : analysis.engine === 'ondevice' ? (
            <>
              <Cpu className="h-3.5 w-3.5 text-emerald-500" />
              <span className="normal-case text-emerald-700 dark:text-emerald-300">
                🖥️ Analysed on your device (private & offline)
              </span>
            </>
          ) : analysis.engine === 'huggingface' ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-primary-500" />
              Analysed by Hugging Face (real model)
            </>
          ) : (
            <>
              <Info className="h-3.5 w-3.5" />
              Built-in estimate — add VITE_AI_ONDEVICE or VITE_ROBOFLOW_API_KEY for real vision
            </>
          )}
        </p>
        {/* Config warning — CivicLENS AI is the primary engine; if it's skipped
            due to missing env vars, say so instead of hiding it. */}
        {analysis.engine !== 'roboflow' ? (
          (() => {
            const rf = roboflowStatus();
            if (!rf.ok) {
              return (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>CivicLENS AI not active:</strong> {rf.reason} Falling back to the next engine.
                  </span>
                </p>
              );
            }
            return null;
          })()
        ) : null}
        {onRetry ? (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="btn-secondary mt-4 !px-4 !py-2 text-xs"
          >
            {retrying ? <Loader size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {retrying ? 'Re-analysing…' : 'Retry analysis'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Location                                                            */
/* ------------------------------------------------------------------ */

function LocationStep({
  coordinates,
  locationName,
  isAmrita,
  insideCampus,
  finalScope,
  chosenScope,
  onScopeChange,
  onCoordinates,
  onLocationName,
}: {
  coordinates: Coordinates | null;
  locationName: string;
  /** False in CivicEye → scope is always city, no campus UI is shown. */
  isAmrita: boolean;
  insideCampus: boolean;
  finalScope: 'city' | 'campus';
  chosenScope: 'city' | 'campus' | null;
  onScopeChange: (s: 'city' | 'campus' | null) => void;
  onCoordinates: (coords: Coordinates) => void;
  onLocationName: (name: string) => void;
}) {
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const [mapCenter] = useState<Coordinates>({ lat: 12.9716, lng: 77.5946 });

  const detect = async () => {
    setLocating(true);
    const result = await requestLocation();
    setLocating(false);
    if (result.status === 'success' && result.coords) {
      onCoordinates(result.coords);
      toast.success('Location captured', 'GPS coordinates were read from your browser.');
    } else {
      toast.warning('Could not get GPS', 'Drop a pin on the map instead — it works the same way.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {coordinates
              ? 'Location set — you can still fine-tune the pin.'
              : 'Tap the map to drop a pin, or use your GPS.'}
          </p>
          <button
            onClick={() => void detect()}
            disabled={locating}
            className="btn-secondary !py-2 text-xs"
          >
            {locating ? <Loader size="sm" /> : <LocateFixed className="h-4 w-4" />}
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>

        {isAmrita ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#A51636]/20 bg-[#A51636]/5 p-3 text-xs leading-relaxed text-[#A51636] dark:bg-[#A51636]/10">
              <b>Campus Map</b> — Tap any building, block, floor, or room to set your report location.
            </div>
            <AmritaCampusMap
              reports={[]}
              selectedId={null}
              onSelect={() => undefined}
              pinDropping
              onPinDrop={(coords, meta) => {
                onCoordinates(coords);
                const label = meta.building || meta.block ? `${meta.block ? `Block ${meta.block} ` : ''}${meta.building || ''} · ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
                onLocationName(label);
              }}
              droppedPin={coordinates}
              className="h-[480px]"
            />
          </div>
        ) : (
          <MapView
            reports={[]}
            selectedId={null}
            onSelect={() => undefined}
            center={mapCenter}
            zoom={13}
            heatmap={false}
            pinDropping
            onPinDrop={onCoordinates}
            droppedPin={coordinates}
            className="h-[340px]"
          />
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="coords" className="label-base">
              Coordinates
            </label>
            <input
              id="coords"
              readOnly
              value={coordinates ? formatCoords(coordinates) : 'Not set yet'}
              className="input-base bg-slate-50 text-slate-500 dark:bg-white/[0.03]"
            />
          </div>
          <div>
            <label htmlFor="area" className="label-base">
              Area / landmark
            </label>
            <input
              id="area"
              value={locationName}
              onChange={(e) => onLocationName(e.target.value)}
              placeholder={
                coordinates ? 'Auto-detected — edit if needed' : 'e.g. Near 12th Main, Indiranagar'
              }
              className="input-base"
            />
          </div>
        </div>

        {/* Campus detection / recommendation — Amrita Eye only. CivicEye is
            city-only, so it shows a plain city-report note instead. */}
        {coordinates && !isAmrita ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-400/10 text-slate-500">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">City report</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                This report will be shared with the city community so neighbours can verify it.
              </p>
            </div>
          </div>
        ) : null}
        {coordinates && isAmrita ? (
          <div
            className={cn(
              'mt-4 flex items-start gap-3 rounded-2xl border p-4',
              insideCampus
                ? 'border-primary-300 bg-primary-500/5 dark:border-primary-400/30'
                : 'border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.02]',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                insideCampus ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'bg-slate-400/10 text-slate-500',
              )}
            >
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {insideCampus ? (
                  <>
                    📍 This location is inside <span className="text-primary-600 dark:text-primary-400">{CAMPUS_CONFIG.name}</span>
                  </>
                ) : (
                  <>This location is outside the campus</>
                )}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {insideCampus
                  ? 'It will be recommended to campus students & staff so they can act on it quickly. You can change this below.'
                  : 'It will be shared with the city community. Only reports inside the campus boundary are recommended to campus students & staff.'}
              </p>
              {insideCampus ? (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    onClick={() => onScopeChange(null)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                      chosenScope === null
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-primary-300 bg-white text-primary-700 hover:bg-primary-500/10 dark:border-primary-400/40 dark:bg-transparent dark:text-primary-300',
                    )}
                  >
                    ✓ Mark as campus (recommended)
                  </button>
                  <button
                    onClick={() => onScopeChange('city')}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                      chosenScope === 'city'
                        ? 'border-slate-700 bg-slate-700 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-white/20 dark:bg-transparent dark:text-slate-300',
                    )}
                  >
                    Post to city instead
                  </button>
                </div>
              ) : null}
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {finalScope === 'campus' ? 'Campus report' : 'City report'} · shared with{' '}
                {finalScope === 'campus' ? 'campus students & staff' : 'the city community'}
              </p>
            </div>
          </div>
        ) : null}

        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Location disclaimer:</strong> auto-detected GPS is accurate to roughly{' '}
            <strong>30 metres</strong>. Please fine-tune the pin so staff can find the exact spot.
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Details                                                             */
/* ------------------------------------------------------------------ */

function DetailsStep({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const { profile } = useAuth();
  const aiTitle = draft.analysis
    ? `${categoryById(draft.analysis.category).short} reported near ${draft.locationName || 'the marked spot'}`
    : '';
  const aiDescription = draft.analysis?.description ?? '';

  return (
    <div className="card space-y-5 p-6">
      <div>
        <label htmlFor="title" className="label-base">
          Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="title"
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Deep pothole on 12th Main, Indiranagar"
          className="input-base"
        />
        {!draft.title && aiTitle ? (
          <button
            onClick={() => onChange({ title: aiTitle })}
            className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            <Sparkles className="h-3 w-3" />
            Use AI suggestion
          </button>
        ) : null}
      </div>
      <div>
        <label htmlFor="description" className="label-base">
          Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="description"
          rows={4}
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What's happening? How long has it been like this? Who is affected?"
          className="input-base resize-none"
        />
        {!draft.description && aiDescription ? (
          <button
            onClick={() => onChange({ description: aiDescription })}
            className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            <Sparkles className="h-3 w-3" />
            Use AI description
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-primary-200/70 bg-primary-500/5 p-4 dark:border-primary-400/20">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
          <BadgeCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Reporting as {displayName(profile)}
          </p>
          <p className="truncate text-xs text-slate-400">
            {profile?.email ?? ''} · your name is shared so staff can follow up with you.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

function ReviewStep({ draft, finalScope }: { draft: ReportDraft; finalScope: 'city' | 'campus' }) {
  const category = categoryById(draft.category);
  const severity = draft.analysis?.severity ?? 'medium';
  const sevMeta = SEVERITY_META[severity];
  return (
    <div className="card overflow-hidden">
      {draft.photo ? (
        <div className="relative">
          <img src={draft.photo} alt="Report evidence" className="h-52 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
              {category.label}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold backdrop-blur',
                sevMeta.bg,
                sevMeta.color,
              )}
            >
              {sevMeta.label} severity
            </span>
          </div>
        </div>
      ) : null}
      <div className="space-y-4 p-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {draft.title || 'Untitled report'}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {draft.description || 'No description provided.'}
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-primary-500" />
            {draft.locationName || 'Location not set'}
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Crosshair className="h-4 w-4 text-primary-500" />
            {draft.coordinates ? formatCoords(draft.coordinates) : '—'}
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <BadgeCheck className="h-4 w-4 text-primary-500" />
            AI confidence {draft.analysis ? Math.round(draft.analysis.confidence * 100) : 0}%
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Camera className="h-4 w-4 text-primary-500" />
            Photo attached
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-primary-500" />
            {finalScope === 'campus' ? 'Campus report' : 'City report'}
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
          Submitting will publish this as a{' '}
          <strong className="text-slate-500 dark:text-slate-400">pending</strong> report. Neighbours
          can confirm it to make it Verified.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Success                                                             */
/* ------------------------------------------------------------------ */

function SuccessScreen({
  reportId,
  report,
  onNew,
  onMap,
  onReport,
}: {
  reportId: string | null;
  report?: Report;
  onNew: () => void;
  onMap: () => void;
  onReport: () => void;
}) {
  // The responsible department for this report (e.g. BBMP for a pothole) —
  // used to offer a redirect to their official complaint portal.
  const authority = report ? authorityForCategory(report.category, report.scope) : undefined;
  const portalUrl = authority?.portalUrl;

  const [portalSecs, setPortalSecs] = useState(6);
  const [portalCancelled, setPortalCancelled] = useState(false);
  const portalTimer = useRef<number | null>(null);

  // Auto-redirect the citizen to the department's official portal so the
  // issue also enters their complaint system (cancelable, new-tab option).
  useEffect(() => {
    if (!portalUrl || portalCancelled) return;
    portalTimer.current = window.setInterval(() => {
      setPortalSecs((s) => {
        if (s <= 1) {
          if (portalTimer.current) window.clearInterval(portalTimer.current);
          window.location.assign(portalUrl);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (portalTimer.current) window.clearInterval(portalTimer.current);
    };
  }, [portalUrl, portalCancelled]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="mx-auto max-w-xl text-center"
    >
      <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <motion.span
            key={deg}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((deg * Math.PI) / 180) * 78,
              y: Math.sin((deg * Math.PI) / 180) * 78,
              opacity: 0,
              scale: 0.2,
            }}
            transition={{ duration: 1.1, delay: 0.15, ease: 'easeOut' }}
            className="absolute h-3 w-3 rounded-full"
            style={{ background: `hsl(${deg + 40} 85% 60%)` }}
          />
        ))}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
          className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow-emerald"
        >
          <PartyPopper className="h-12 w-12" />
        </motion.div>
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        Submitted
      </p>
      <h2 className="heading-lg mt-2">Thank you! Your report is live. 🎉</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Report <strong className="text-slate-700 dark:text-slate-200">{reportId}</strong> is now
        pending community verification. Share it with neighbours so it can be confirmed and pushed
        to the ward dashboard.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={onMap} className="btn-primary">
          <MapPin className="h-4 w-4" />
          View on map
        </button>
        {reportId ? (
          <button onClick={onReport} className="btn-secondary">
            View report page
          </button>
        ) : null}
        <ReportToAuthority
          report={report}
          subject={`report ${reportId ?? ''}`.trim()}
          label="Report to authority"
          variant="secondary"
        />
      </div>
      {portalUrl && !portalCancelled ? (
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-primary-200 bg-primary-50/70 p-5 text-left backdrop-blur dark:border-primary-500/20 dark:bg-primary-500/5">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Also file it officially with {authority?.name} ↗
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            You can also register this issue on the department's official complaint
            portal so it enters their system. Redirecting in{' '}
            <strong className="text-slate-700 dark:text-slate-200">{portalSecs}s</strong>…
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              onClick={() => setPortalCancelled(true)}
            >
              <ExternalLink className="h-4 w-4" />
              Continue to {authority?.department}
            </a>
            <button
              onClick={() => setPortalCancelled(true)}
              className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
            >
              Stay here
            </button>
          </div>
        </div>
      ) : null}
      <button
        onClick={onNew}
        className="mt-6 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
      >
        Submit another report
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Phone capture mode (opened from the QR code)                        */
/* ------------------------------------------------------------------ */

function PhoneCapture({ sessionId }: { sessionId: string }) {
  const toast = useToast();
  const [photo, setPhoto] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handlePhoto = useCallback(
    (next: string | null) => {
      if (!next) return;
      setPhoto(next);
      // Publish to the desktop session (simulated cloud + channel relay).
      publishPhoto(sessionId, next);
      setSent(true);
      toast.success('Photo sent!', 'It will appear on your desktop automatically.');
    },
    [sessionId, toast],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl brand-grad-1 text-white shadow-glow">
          <Camera className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Capture evidence</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This photo will be sent back to the desktop session you started.
        </p>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 space-y-4"
          >
            <img
              src={photo as string}
              alt="Captured evidence"
              className="w-full rounded-2xl border border-emerald-400/40 shadow-glow-emerald"
            />
            <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Photo sent to your desktop session
            </div>
            <p className="text-xs text-slate-400">
              You can close this tab now — the report wizard on your desktop is already analysing
              the photo.
            </p>
            <button onClick={() => setSent(false)} className="btn-secondary w-full">
              Take another photo
            </button>
          </motion.div>
        ) : (
          <div className="mt-8">
            <ImageUploader value={photo} onChange={handlePhoto} />
            <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
              Tip: if a camera doesn't open, choose an image from your gallery — it works the same
              way.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
