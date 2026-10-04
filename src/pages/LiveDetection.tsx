import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Camera,
  CircleDot,
  Eye,
  FileVideo,
  FastForward,
  MonitorPlay,
  Info,
  Pause,
  Play,
  Radio,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Square,
  Upload,
  Zap,
} from 'lucide-react';
import type { Severity } from '@/types';
import { SEVERITY_META, categoryById } from '@/data/categories';
import { CATEGORY_ICONS } from '@/components/categoryIcons';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { useReports } from '@/hooks/useReports';
import {
  categoryFromRoboflowLabel,
  detectFrameWithRoboflow,
  hasRoboflowKey,
  roboflowStatus,
} from '@/services/roboflowService';
import type { RoboflowPrediction } from '@/services/roboflowService';
import { severityFromScore } from '@/services/aiAnalysisService';
import type { DetectionBox, DetectionResult, LiveCamera } from '@/services/detectionService';
import { LIVE_CAMERAS } from '@/services/detectionService';
import { displayName, scopeForBrand } from '@/services/reportService';
import { uploadReportPhoto } from '@/lib/storage';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';

interface FeedEvent extends DetectionResult {
  id: string;
  /** Number of raw Roboflow predictions in this frame. */
  predictionCount: number;
  /** True when the workflow returned an annotated image without boxes. */
  annotatedOnly?: boolean;
  /** Report auto-created from this detection (if enabled and stable). */
  reportId?: string;
}

type SourceType = 'camera' | 'video' | 'screen';
type LiveStatus = 'idle' | 'starting' | 'running' | 'processing' | 'paused' | 'complete' | 'error';

/**
 * Roboflow inference is slower than a browser camera's frame rate. These are
 * inference intervals, not playback speeds: the latest full frame is sent
 * only after the previous request finishes, so requests never pile up.
 */
const INFERENCE_INTERVALS = [
  { label: 'Fast · 2s', ms: 2000 },
  { label: 'Balanced · 4s', ms: 4000 },
  { label: 'Careful · 8s', ms: 8000 },
];

const BOX_COLORS: Record<Severity, string> = {
  low: 'border-emerald-400 text-emerald-300',
  medium: 'border-amber-400 text-amber-300',
  high: 'border-orange-500 text-orange-300',
  critical: 'border-rose-500 text-rose-300',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Capture the entire visible video frame; no road crop is applied. */
function captureVideoFrame(video: HTMLVideoElement): {
  dataUrl: string;
  width: number;
  height: number;
} {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) throw new Error('The video has no usable frame yet.');

  // Keep the whole road in the request while limiting payload size for the
  // same Roboflow free-tier endpoint used by the report flow.
  const maxWidth = 960;
  const scale = Math.min(1, maxWidth / sourceWidth);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser could not create an analysis canvas.');
  context.drawImage(video, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.72), width, height };
}

/** Convert Roboflow centre/size coordinates to the percentage box contract. */
function predictionToBox(
  prediction: RoboflowPrediction,
  imageWidth: number,
  imageHeight: number,
): DetectionBox | null {
  if (
    prediction.x === undefined ||
    prediction.y === undefined ||
    prediction.width === undefined ||
    prediction.height === undefined ||
    prediction.width <= 0 ||
    prediction.height <= 0
  ) {
    return null;
  }

  // Standard Roboflow predictions use pixels. A few workflow blocks emit
  // normalized 0–1 values, so support those too.
  const normalized =
    Math.abs(prediction.x) <= 1 &&
    Math.abs(prediction.y) <= 1 &&
    Math.abs(prediction.width) <= 1 &&
    Math.abs(prediction.height) <= 1;
  const centerX = normalized ? prediction.x * 100 : (prediction.x / imageWidth) * 100;
  const centerY = normalized ? prediction.y * 100 : (prediction.y / imageHeight) * 100;
  const boxWidth = normalized
    ? prediction.width * 100
    : (prediction.width / imageWidth) * 100;
  const boxHeight = normalized
    ? prediction.height * 100
    : (prediction.height / imageHeight) * 100;

  const left = clamp(centerX - boxWidth / 2, 0, 100);
  const top = clamp(centerY - boxHeight / 2, 0, 100);
  const right = clamp(centerX + boxWidth / 2, 0, 100);
  const bottom = clamp(centerY + boxHeight / 2, 0, 100);
  if (right <= left || bottom <= top) return null;

  return {
    label: prediction.class,
    confidence: clamp(prediction.confidence, 0, 1),
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  };
}

function boxesOverlap(a: DetectionBox, b: DetectionBox): boolean {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.w * a.h + b.w * b.h - intersection;
  return union > 0 && intersection / union >= 0.12;
}

/**
 * Live AI Detection — captures a device camera or road video, sends the full
 * frame to the exact Roboflow target used by the Report wizard, and renders
 * each returned detection before moving to the next frame.
 */
export function LiveDetection() {
  const toast = useToast();
  const { user, profile } = useAuth();
  const { isAmrita, meta } = useBrand();
  const { addReport } = useReports();

  const [camera, setCamera] = useState<LiveCamera>(LIVE_CAMERAS[0]);
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sourceReady, setSourceReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [intervalIdx, setIntervalIdx] = useState(1);
  const [threshold, setThreshold] = useState(0.7);
  const [autoReport, setAutoReport] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [current, setCurrent] = useState<FeedEvent | null>(null);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [detections, setDetections] = useState(0);
  const [reportsCreated, setReportsCreated] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const frameCounterRef = useRef(0);
  const tracksRef = useRef<
    Record<
      string,
      { consecutive: number; lastSeen: number; lastBox: DetectionBox | null; lastReported: number }
    >
  >({});
  const autoReportInFlight = useRef(false);

  const intervalMs = INFERENCE_INTERVALS[intervalIdx].ms;
  const isSourceActive = Boolean(sourceType && sourceReady);

  const resetAnalysis = useCallback(() => {
    generationRef.current += 1;
    frameCounterRef.current = 0;
    tracksRef.current = {};
    setFrameIndex(0);
    setCurrent(null);
    setFeed([]);
    setDetections(0);
    setReportsCreated(0);
    setLastError(null);
  }, []);

  const releaseSource = useCallback(() => {
    generationRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.load();
    }
  }, []);

  const stopSource = useCallback(() => {
    releaseSource();
    setSourceType(null);
    setVideoUrl(null);
    setSourceReady(false);
    setPlaying(false);
    setStatus('idle');
    resetAnalysis();
  }, [releaseSource, resetAnalysis]);

  const startDeviceCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera unavailable', 'Use HTTPS or choose a road video file instead.');
      return;
    }
    releaseSource();
    resetAnalysis();
    setLastError(null);
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setVideoUrl(null);
      setSourceType('camera');
      setSourceReady(false);
      setPlaying(true);
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'The camera permission was denied.';
      setLastError(message);
      toast.error('Could not start camera', message);
    }
  }, [releaseSource, resetAnalysis, toast]);

  const startYouTubeTabCapture = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error('Tab capture unavailable', 'Use a modern browser with screen-sharing support.');
      return;
    }
    releaseSource();
    resetAnalysis();
    setLastError(null);
    setStatus('starting');
    try {
      // This is the no-worker test path: the user selects the already-open
      // YouTube tab in the browser's share dialog. The browser gives CivicEye
      // a MediaStream, so YouTube's cross-origin iframe restriction is avoided.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      track?.addEventListener('ended', () => {
        setPlaying(false);
        setSourceReady(false);
        setSourceType(null);
        setStatus('idle');
        setLastError('YouTube tab sharing stopped.');
      });
      setVideoUrl(null);
      setSourceType('screen');
      setSourceReady(false);
      setPlaying(true);
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Tab sharing was cancelled.';
      setLastError(message);
      toast.error('Could not share YouTube tab', message);
    }
  }, [releaseSource, resetAnalysis, toast]);

  const handleVideoFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('video/')) {
        toast.error('Unsupported file', 'Choose an MP4, WebM or other video file.');
        return;
      }
      releaseSource();
      resetAnalysis();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setVideoUrl(url);
      setSourceType('video');
      setSourceReady(false);
      setPlaying(true);
      setStatus('starting');
    },
    [releaseSource, resetAnalysis, toast],
  );

  const togglePlaying = useCallback(() => {
    if (!isSourceActive) return;
    setPlaying((previous) => {
      const next = !previous;
      const video = videoRef.current;
      if (video) {
        if (next) {
          // A road video is one-pass by design. Pressing play after it
          // finishes starts a fresh analysis from the beginning.
          if (sourceType === 'video' && video.ended) {
            video.currentTime = 0;
            resetAnalysis();
          }
          void video.play();
        } else {
          video.pause();
        }
      }
      return next;
    });
  }, [isSourceActive, resetAnalysis, sourceType]);

  const createAutoReport = useCallback(
    async (event: FeedEvent) => {
      if (!user || !event.category || autoReportInFlight.current) return;
      autoReportInFlight.current = true;
      try {
        const photoUrl = await uploadReportPhoto(event.image, user.id);
        const report = await addReport({
          title: `Live ${categoryById(event.category).label} detected on ${event.camera.name}`,
          description: `${event.summary} Captured from the ${meta.appName} Live AI full-road frame. Please verify the issue before taking action.`,
          coordinates: event.camera.coords,
          locationName: event.camera.area,
          category: event.category,
          severity: event.severity,
          photoUrl,
          author: displayName(profile),
          userId: user.id,
          scope: scopeForBrand(isAmrita ? 'amrita' : 'civiceye'),
          ai: {
            confidence: event.confidence,
            objects: event.boxes.map((box) => `${box.label} (${Math.round(box.confidence * 100)}%)`),
            summary: event.summary,
            model: 'roboflow-detector-live',
            imageQuality: null,
            source: 'live-frame',
            disclaimer:
              'AI confidence is an estimate. This live detection should be verified by neighbours or staff.',
          },
        });
        setReportsCreated((count) => count + 1);
        setFeed((items) =>
          items.map((item) => (item.id === event.id ? { ...item, reportId: report.id } : item)),
        );
        toast.success('Live report created', `${categoryById(event.category).label} saved as a pending report.`);
      } catch (error) {
        toast.error(
          'Could not create live report',
          error instanceof Error ? error.message : 'Check Supabase and Storage configuration.',
        );
      } finally {
        autoReportInFlight.current = false;
      }
    },
    [addReport, isAmrita, meta.appName, profile, toast, user],
  );

  /**
   * Sequential full-frame inference loop. It intentionally waits for
   * Roboflow to finish before capturing the next frame, avoiding stale or
   * overlapping requests on the free inference endpoint.
   */
  useEffect(() => {
    if (!playing || !sourceReady || !hasRoboflowKey) {
      if (sourceReady && !playing && !videoRef.current?.ended) setStatus('paused');
      return;
    }

    let cancelled = false;
    let failed = false;
    let timer: number | undefined;
    const generation = generationRef.current;

    const schedule = (callback: () => void, delay: number) => {
      timer = window.setTimeout(callback, delay);
    };

    const analyseNextFrame = async () => {
      if (cancelled || generation !== generationRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        schedule(() => void analyseNextFrame(), 400);
        return;
      }

      const frameNumber = frameCounterRef.current + 1;
      frameCounterRef.current = frameNumber;
      setFrameIndex(frameNumber);
      setStatus('processing');

      try {
        const captured = captureVideoFrame(video);
        const inference = await detectFrameWithRoboflow(captured.dataUrl);
        if (cancelled || generation !== generationRef.current) return;

        const accepted = inference.predictions
          .filter((prediction) => prediction.confidence >= threshold)
          .sort((a, b) => b.confidence - a.confidence);
        const best = accepted[0];
        const boxes = accepted
          .map((prediction) => predictionToBox(prediction, captured.width, captured.height))
          .filter((box): box is DetectionBox => Boolean(box));
        const category = best ? categoryFromRoboflowLabel(best.class) : null;
        const confidence = best?.confidence ?? 0;
        const annotatedOnly = inference.predictions.length === 0 && Boolean(inference.annotatedImage);
        const image = inference.annotatedImage ?? captured.dataUrl;
        const result: FeedEvent = {
          id: `live-${generation}-${frameNumber}`,
          frameIndex: frameNumber,
          camera,
          category,
          confidence,
          severity: severityFromScore(confidence),
          boxes,
          timestamp: new Date().toISOString(),
          image,
          predictionCount: inference.predictions.length,
          annotatedOnly,
          summary: category
            ? `Detected ${categoryById(category).label.toLowerCase()} across the full road frame on ${camera.name} (${Math.round(confidence * 100)}% confidence).`
            : annotatedOnly
              ? 'CivicLENS AI returned an annotated frame, but this workflow did not expose prediction boxes.'
              : 'Full road frame analysed — no issue met the current confidence threshold.',
        };

        setCurrent(result);
        setFeed((items) => [result, ...items].slice(0, 24));
        if (category) setDetections((count) => count + 1);

        if (category && category !== 'other' && confidence >= threshold) {
          const key = `${camera.id}:${category}`;
          const now = Date.now();
          const previous = tracksRef.current[key];
          const sameObject =
            Boolean(previous?.lastBox && boxes.some((box) => boxesOverlap(box, previous.lastBox as DetectionBox))) ||
            (!previous?.lastBox && now - (previous?.lastSeen ?? 0) < 15_000);
          const track = {
            consecutive: sameObject ? (previous?.consecutive ?? 0) + 1 : 1,
            lastSeen: now,
            lastBox: boxes[0] ?? previous?.lastBox ?? null,
            lastReported: previous?.lastReported ?? 0,
          };
          tracksRef.current[key] = track;

          // Require the same issue in two nearby frames before reporting. This
          // prevents a single noisy inference from creating a database post.
          if (
            autoReport &&
            user &&
            track.consecutive >= 2 &&
            now - track.lastReported >= 120_000
          ) {
            track.lastReported = now;
            void createAutoReport(result);
          }
        }
      } catch (error) {
        if (!cancelled && generation === generationRef.current) {
          failed = true;
          const message = error instanceof Error ? error.message : 'CivicLENS AI could not analyse this frame.';
          setLastError(message);
          setStatus('error');
        }
      } finally {
        if (!cancelled && generation === generationRef.current && !failed) {
          setStatus('running');
          schedule(() => void analyseNextFrame(), intervalMs);
        }
      }
    };

    setLastError(null);
    setStatus('running');
    void analyseNextFrame();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [
    autoReport,
    camera,
    createAutoReport,
    intervalMs,
    playing,
    sourceReady,
    threshold,
    user,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if ((sourceType === 'camera' || sourceType === 'screen') && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => undefined);
    } else if (sourceType === 'video' && videoUrl) {
      video.srcObject = null;
      video.src = videoUrl;
      video.load();
      void video.play().catch(() => undefined);
    }
  }, [sourceType, videoUrl]);

  useEffect(() => {
    return () => {
      releaseSource();
    };
  }, [releaseSource]);

  const handleVideoReady = useCallback(() => {
    setSourceReady(true);
    setPlaying(true);
    setStatus('running');
  }, []);

  const handleVideoEnded = useCallback(() => {
    setPlaying(false);
    setStatus('complete');
  }, []);

  const averageConfidence = useMemo(() => {
    const analysed = feed.filter((event) => event.category);
    if (analysed.length === 0) return 0;
    return Math.round(
      (analysed.reduce((sum, event) => sum + event.confidence, 0) / analysed.length) * 100,
    );
  }, [feed]);

  const statusLabel =
    status === 'processing'
      ? 'ANALYSING'
      : status === 'running'
        ? 'LIVE'
        : status === 'paused'
          ? 'PAUSED'
          : status === 'complete'
            ? 'COMPLETE'
            : status === 'starting'
              ? 'STARTING'
              : status === 'error'
                ? 'ERROR'
                : 'READY';

  const statusDot =
    status === 'error'
      ? 'bg-rose-500'
      : status === 'paused'
        ? 'bg-amber-500'
        : status === 'complete'
          ? 'bg-sky-500'
          : 'bg-emerald-500';

  return (
    <div className="pb-20 pt-[calc(var(--nav-height)+2.5rem)] sm:pt-[calc(var(--nav-height)+3.5rem)]">
      <div className="section-pad">
        {/* Real-model status */}
        <div
          className={cn(
            'mb-6 flex items-start gap-3 rounded-2xl border p-4',
            hasRoboflowKey
              ? 'border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
              : 'border-amber-300/60 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10',
          )}
        >
          {hasRoboflowKey ? (
            <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          )}
          <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {hasRoboflowKey ? (
              <>
                <strong>CivicLENS AI live detection is online.</strong> Every request sends the complete
                road frame through the same workflow/model as Report AI. The next frame is captured only
                after the previous request finishes.
              </>
            ) : (
              <>
                <strong>CivicLENS AI is not active.</strong> {roboflowStatus().reason} Add the same
                CivicLENS AI variables used by Report AI and redeploy; the page will not silently use the
                old mock detector.
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              <Radio className="h-4 w-4" />
              Live AI Detection
            </p>
            <h1 className="heading-xl mt-2">Full-road frame watchtower</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
              Point your device at the road or load a road recording. {meta.appName} sends the entire frame
              to the Report AI model repeatedly and draws every returned pothole box.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip !px-3 !py-1.5">
              <span className="relative flex h-2 w-2">
                {status === 'running' || status === 'processing' ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                ) : null}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusDot)} />
              </span>
              {statusLabel}
            </span>
            <button
              onClick={togglePlaying}
              disabled={!isSourceActive}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl border transition-all',
                playing
                  ? 'border-rose-300 bg-rose-500/10 text-rose-600 dark:border-rose-500/40 dark:text-rose-400'
                  : 'border-emerald-300 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-400',
              )}
              aria-label={playing ? 'Pause live analysis' : 'Resume live analysis'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={stopSource}
              disabled={!sourceType}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-500 transition-all hover:border-rose-300 hover:text-rose-600 disabled:opacity-40 dark:border-white/15 dark:text-slate-400"
              aria-label="Stop live source"
            >
              <Square className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              icon: Activity,
              label: 'Frames analysed',
              value: frameIndex,
              gradient: 'from-primary-500 to-violet-600',
            },
            {
              icon: Eye,
              label: 'Issue frames',
              value: detections,
              gradient: 'from-amber-500 to-orange-600',
            },
            {
              icon: Zap,
              label: 'Reports created',
              value: reportsCreated,
              gradient: 'from-emerald-500 to-teal-600',
            },
            {
              icon: Sparkles,
              label: 'Avg. confidence',
              value: `${averageConfidence}%`,
              gradient: 'from-sky-500 to-blue-600',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card flex items-center gap-3 p-4"
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white',
                  stat.gradient,
                )}
              >
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[11px] font-medium text-slate-400">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="card overflow-hidden">
            <div className="relative">
              {/* Full-frame preview */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  autoPlay
                  loop={false}
                  onLoadedMetadata={handleVideoReady}
                  onCanPlay={handleVideoReady}
                  onEnded={handleVideoEnded}
                  className={cn(
                    'h-full w-full object-contain',
                    current?.image ? 'opacity-0' : 'opacity-100',
                  )}
                  aria-label="Road camera source"
                />
                {current?.image ? (
                  <img
                    src={current.image}
                    alt="Latest full road frame analysed by CivicLENS AI"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : null}
                {!sourceType ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center text-slate-500">
                    <Camera className="h-10 w-10" />
                    <p className="mt-3 text-sm font-semibold text-slate-300">No road source connected</p>
                    <p className="mt-1 max-w-sm px-4 text-xs text-slate-500">
                      Start the device camera, share a YouTube tab, or upload a road video to begin full-frame detection.
                    </p>
                  </div>
                ) : null}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/35" />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
                {[
                  'left-3 top-3 border-l-2 border-t-2',
                  'right-3 top-3 border-r-2 border-t-2',
                  'left-3 bottom-3 border-l-2 border-b-2',
                  'right-3 bottom-3 border-r-2 border-b-2',
                ].map((position) => (
                  <span key={position} className={cn('pointer-events-none absolute h-5 w-5', position)} />
                ))}

                <div className="absolute left-6 top-5 text-white">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest">
                    <span className={cn('h-2 w-2 rounded-full', statusDot)} />
                    {sourceType === 'camera'
                      ? 'CAMERA'
                      : sourceType === 'video'
                        ? 'ROAD VIDEO'
                        : sourceType === 'screen'
                          ? 'YOUTUBE TAB'
                          : 'READY'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/90">{camera.streamLabel}</p>
                  <p className="text-[10px] text-white/60">{camera.name}</p>
                </div>

                <div className="absolute right-6 top-5 text-right">
                  <p className="font-mono text-xs font-semibold text-white/90">
                    {new Date(current?.timestamp ?? Date.now()).toLocaleTimeString('en-IN', {
                      hour12: false,
                    })}
                  </p>
                  <p className="text-[10px] text-white/60">FRAME {frameIndex.toLocaleString()}</p>
                </div>

                <AnimatePresence>
                  {playing ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scan bg-gradient-to-b from-primary-400/20 to-transparent"
                    />
                  ) : null}
                </AnimatePresence>

                {current?.boxes.map((box, index) => (
                  <motion.div
                    key={`${current.id}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      'absolute rounded-md border-2 bg-slate-950/25 backdrop-blur-[1px]',
                      BOX_COLORS[current.severity],
                    )}
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.w}%`,
                      height: `${box.h}%`,
                    }}
                  >
                    <span className="absolute -top-6 left-0 rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
                      {box.label} {Math.round(box.confidence * 100)}%
                    </span>
                  </motion.div>
                ))}

                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3">
                  {current?.category ? (
                    <span
                      className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur',
                        SEVERITY_META[current.severity].bg,
                        SEVERITY_META[current.severity].color,
                      )}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {categoryById(current.category).label} · {Math.round(current.confidence * 100)}%
                    </span>
                  ) : current?.annotatedOnly ? (
                    <span className="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 backdrop-blur">
                      <Info className="h-3.5 w-3.5" />
                      Annotated frame · no box data
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 backdrop-blur">
                      <CircleDot className="h-3.5 w-3.5" />
                      {current ? 'Scene clear' : 'Waiting for frame'}
                    </span>
                  )}
                  <span className="rounded-full bg-slate-950/60 px-3 py-1.5 text-[10px] font-semibold text-white/80 backdrop-blur">
                    {camera.area}
                  </span>
                </div>
              </div>

              {/* YouTube tab capture — direct URL fetching needs a worker. */}
              <div className="border-t border-slate-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label htmlFor="youtube-live-url" className="sr-only">YouTube Live URL</label>
                  <input
                    id="youtube-live-url"
                    value={youtubeUrl}
                    onChange={(event) => setYoutubeUrl(event.target.value)}
                    placeholder="Paste a public YouTube Live URL"
                    className="input-base min-w-0 flex-1 !py-2 text-xs"
                  />
                  <button
                    onClick={() => {
                      try {
                        const url = new URL(youtubeUrl.trim());
                        if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname)) {
                          throw new Error('Please enter a YouTube URL.');
                        }
                        window.open(url.toString(), '_blank', 'noopener,noreferrer');
                      } catch (error) {
                        toast.error('Invalid YouTube URL', error instanceof Error ? error.message : 'Paste a public YouTube link.');
                      }
                    }}
                    disabled={!youtubeUrl.trim()}
                    className="btn-secondary !py-2 text-xs"
                  >
                    Open YouTube
                  </button>
                  <button onClick={() => void startYouTubeTabCapture()} className="btn-primary !py-2 text-xs">
                    <MonitorPlay className="h-4 w-4" />
                    Share YouTube tab
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  No worker test: open the URL, click <strong>Share YouTube tab</strong>, then choose the YouTube tab in the browser share dialog. The selected tab is analyzed with the same Roboflow detector.
                </p>
              </div>

              {/* Source + inference controls */}
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                <button onClick={() => void startDeviceCamera()} className="btn-primary !py-2 text-xs">
                  <Camera className="h-4 w-4" />
                  {sourceType === 'camera' ? 'Restart camera' : 'Use camera'}
                </button>
                <button onClick={() => fileRef.current?.click()} className="btn-secondary !py-2 text-xs">
                  <Upload className="h-4 w-4" />
                  Road video
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    handleVideoFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />

                <select
                  value={camera.id}
                  onChange={(event) => {
                    const next = LIVE_CAMERAS.find((item) => item.id === event.target.value) ?? LIVE_CAMERAS[0];
                    setCamera(next);
                    tracksRef.current = {};
                  }}
                  aria-label="Road location"
                  className="input-base w-auto !py-2 text-xs"
                >
                  {LIVE_CAMERAS.map((item) => (
                    <option key={item.id} value={item.id}>
                      📍 {item.area}
                    </option>
                  ))}
                </select>

                <select
                  value={intervalIdx}
                  onChange={(event) => setIntervalIdx(Number(event.target.value))}
                  aria-label="Inference interval"
                  className="input-base w-auto !py-2 text-xs"
                >
                  {INFERENCE_INTERVALS.map((item, index) => (
                    <option key={item.label} value={index}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Threshold
                  <input
                    type="range"
                    min={50}
                    max={95}
                    value={Math.round(threshold * 100)}
                    onChange={(event) => setThreshold(Number(event.target.value) / 100)}
                    className="w-24 accent-primary-600"
                    aria-label="Confidence threshold"
                  />
                  <span className="tabular-nums text-primary-600 dark:text-primary-400">
                    {Math.round(threshold * 100)}%
                  </span>
                </label>

                <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <button
                    role="switch"
                    aria-checked={autoReport}
                    onClick={() => setAutoReport((enabled) => !enabled)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors',
                      autoReport ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                        autoReport ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </button>
                  Auto-report stable issue
                </label>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 text-xs leading-relaxed text-slate-400 dark:border-white/10">
              <FastForward className="mr-1 inline h-3.5 w-3.5" />
              Full-frame mode does not crop the road. {sourceType === 'video' ? (
                <>
                  The uploaded video is analysed from beginning to end once, sampling one frame every{' '}
                  <strong>{INFERENCE_INTERVALS[intervalIdx].ms / 1000}s</strong>; it stops automatically at
                  the end.
                </>
              ) : sourceType === 'screen' ? (
                <>
                  The shared YouTube tab is sampled every{' '}
                  <strong>{INFERENCE_INTERVALS[intervalIdx].ms / 1000}s</strong> while it is live.
                </>
              ) : (
                <>
                  Camera mode samples one frame every{' '}
                  <strong>{INFERENCE_INTERVALS[intervalIdx].ms / 1000}s</strong>.
                </>
              )}{' '}
              Each request waits for CivicLENS AI to finish, and the optional auto-report requires the same
              issue in two nearby frames.
            </div>
          </div>

          {/* Event feed */}
          <div className="card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Detection feed</p>
              <span className="chip !py-1">{feed.length} frames</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 600 }}>
              <AnimatePresence initial={false}>
                {feed.map((event) => {
                  const meta = event.category ? categoryById(event.category) : null;
                  const Icon = event.category ? CATEGORY_ICONS[event.category] : CircleDot;
                  return (
                    <motion.div
                      key={event.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border p-3',
                        event.category
                          ? 'border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]'
                          : 'border-slate-200/50 bg-slate-50/60 dark:border-white/5 dark:bg-white/[0.02]',
                      )}
                    >
                      {meta ? (
                        <span
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white',
                            meta.gradient,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-400/15 text-slate-400">
                          <Icon className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              'truncate text-sm font-bold',
                              event.category ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400',
                            )}
                          >
                            {event.category ? categoryById(event.category).label : event.annotatedOnly ? 'Annotated frame' : 'Scene clear'}
                          </p>
                          <span className="shrink-0 text-[10px] font-medium text-slate-400">
                            {timeAgo(event.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {event.summary}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${event.confidence * 100}%` }}
                              className={cn(
                                'h-full rounded-full',
                                event.confidence >= 0.8
                                  ? 'bg-emerald-500'
                                  : event.confidence >= 0.6
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500',
                              )}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                            {event.predictionCount ? `${event.predictionCount} · ` : ''}{Math.round(event.confidence * 100)}%
                          </span>
                        </div>
                        {event.reportId ? (
                          <Link
                            to={`/report/${event.reportId}`}
                            className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                          >
                            <Zap className="h-3 w-3" />
                            Auto-report {event.reportId}
                          </Link>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {feed.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center text-sm text-slate-400">
                  <FileVideo className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3">Waiting for the first full-frame inference…</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {lastError ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <strong>Live inference paused:</strong> {lastError}
            </div>
            <button
              onClick={() => {
                setLastError(null);
                if (playing) setPlaying(false);
                window.setTimeout(() => setPlaying(true), 50);
              }}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
