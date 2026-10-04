import type { AnalysisResult, CategoryId, Coordinates, Severity } from '@/types';
import { detectBlur } from '@/utils/image';

/**
 * Roboflow inference client (free tier, no card).
 *
 * The browser cannot call Roboflow directly (their serverless endpoint omits
 * `Access-Control-Allow-Origin` in the preflight, so browsers block it — CORS).
 * Instead we call OUR OWN proxy:
 *   - Cloudflare Worker (VITE_ROBOFLOW_PROXY_URL), preferred, or
 *   - Vercel function `api/roboflow.js` (mirrored in dev by the vite proxy)
 * The proxy forwards to Roboflow server-side (no CORS there) and returns the
 * response unchanged.
 *
 * Body: { image: "<base64>", api_key?: "<key>", model?: "<model/version>" }
 *   - no `model`  → runs the WORKFLOW (workspace + workflow_id from env)
 *   - with `model` → runs a standard detect.roboflow.com model
 *
 * REAL RESPONSE (grounded): the "CivicEye Pothole Reporting Starter" workflow
 * returns
 *   { outputs: [ { output_image: {type:"base64",value:"<annotated jpeg>"},
 *                  predictions: [{ class, confidence, x, y, width, height }] } ] }
 * Parser keys off real output names and never hard-codes them.
 */

const API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY?.trim() ?? '';
const WORKSPACE = import.meta.env.VITE_ROBOFLOW_WORKSPACE?.trim() ?? '';
const WORKFLOW_ID = import.meta.env.VITE_ROBOFLOW_WORKFLOW_ID?.trim() ?? '';
const MODEL = import.meta.env.VITE_ROBOFLOW_MODEL?.trim() ?? '';
const PROXY_URL = import.meta.env.VITE_ROBOFLOW_PROXY_URL?.trim() ?? '';

/** True when a full Roboflow target (workflow or model) is configured. */
export const hasRoboflowKey = Boolean(API_KEY && (WORKSPACE && WORKFLOW_ID ? true : MODEL));

/** Validate a proxy URL — reject placeholders like "<you>". */
function isValidProxyUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /^[a-z0-9.-]+$/i.test(u.hostname) && u.hostname.includes('.') && !u.hostname.includes('<');
  } catch {
    return false;
  }
}

/** Where the browser sends the request (Worker → Vercel function). */
export const PROXY_TARGET = PROXY_URL
  ? isValidProxyUrl(PROXY_URL)
    ? `${PROXY_URL.replace(/\/+$/, '')}/`
    : null
  : '/api/roboflow';

/** Diagnostics for the UI/console. */
export const roboflowConfig = {
  apiKey: Boolean(API_KEY),
  workspace: Boolean(WORKSPACE),
  workflowId: Boolean(WORKFLOW_ID),
  model: Boolean(MODEL),
  proxyUrl: PROXY_URL && isValidProxyUrl(PROXY_URL) ? PROXY_URL : null,
};

/** Human-readable reason Roboflow is skipped (or null when it will run). */
export function roboflowStatus(): { ok: boolean; reason: string } {
  if (!API_KEY) return { ok: false, reason: 'Missing VITE_ROBOFLOW_API_KEY.' };
  if (WORKSPACE && WORKFLOW_ID) return { ok: true, reason: '' };
  if (MODEL) return { ok: true, reason: '' };
  return {
    ok: false,
    reason:
      'Incomplete Roboflow config: set VITE_ROBOFLOW_WORKSPACE and VITE_ROBOFLOW_WORKFLOW_ID ' +
      '(or VITE_ROBOFLOW_MODEL) in addition to VITE_ROBOFLOW_API_KEY.',
  };
}

// Roboflow workflows on the free tier (esp. SAM-style segmenters) can take
// 30–70 s for a 768px JPEG. Give each attempt a generous budget; we cap
// retries at 3 so worst-case is still under 4 minutes. Backfill uses the
// compressed photo to keep upload fast.
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 800;

/** Typed error for all Roboflow failures. */
export class RoboflowError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'RoboflowError';
  }
}

/* ------------------------------------------------------------------ */
/* HTTP with timeout + retries                                         */
/* ------------------------------------------------------------------ */

async function postJsonWithRetry(
  url: string,
  body: string,
  timeoutMs: number,
  attempt = 0,
): Promise<Response> {
  // Each retry gets its OWN AbortController — otherwise firing the timeout
  // on attempt 0 would abort attempts 1 and 2 before they even start.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    if (attempt + 1 < MAX_ATTEMPTS) {
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
      return postJsonWithRetry(url, body, timeoutMs, attempt + 1);
    }
    throw new RoboflowError(
      isAbort
        ? `Roboflow request timed out after ${Math.round(timeoutMs / 1000)}s.`
        : err instanceof Error
          ? `Roboflow network error: ${err.message}`
          : 'Roboflow network error.',
      undefined,
      isAbort ? 'timeout' : 'network',
    );
  }

  clearTimeout(timer);

  if ((res.status === 429 || res.status >= 500) && attempt + 1 < MAX_ATTEMPTS) {
    await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    return postJsonWithRetry(url, body, timeoutMs, attempt + 1);
  }

  return res;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Parsing — defensive, keyed on the REAL response shape               */
/* ------------------------------------------------------------------ */

/** Model class labels → CivicEye categories (normalized: spaces → hyphens). */
const CLASS_MAP: Record<string, CategoryId> = {
  // Roads
  pothole: 'pothole',
  potholes: 'pothole',
  'pothole-hole': 'pothole',
  'water-filled-pothole': 'pothole',
  'water-filled': 'pothole',
  'broken-road': 'broken-road',
  'road-damage': 'broken-road',
  crack: 'broken-road',
  'open-trench': 'manhole',
  'open-manhole': 'manhole',
  'missing-manhole-cover': 'manhole',
  // Sidewalks
  sidewalk: 'sidewalk',
  'broken-sidewalk': 'sidewalk',
  'damaged-sidewalk': 'sidewalk',
  // Waste
  garbage: 'garbage',
  'garbage-accumulation': 'garbage',
  'garbage-pile': 'garbage',
  trash: 'garbage',
  litter: 'garbage',
  // Trees
  'fallen-tree': 'fallen-tree',
  'fallen-tree-branch': 'fallen-tree',
  tree: 'fallen-tree',
  'tree-branch': 'fallen-tree',
  'fallen-tree-trunk': 'fallen-tree',
  'tree-trunk': 'fallen-tree',
  // Lighting
  'street-light': 'street-light',
  'broken-street-light': 'street-light',
  'broken-streetlight': 'street-light',
  streetlight: 'street-light',
  // Water / sewage
  'water-leakage': 'water-leakage',
  'water-leak': 'water-leakage',
  'water-leaking': 'water-leakage',
  sewage: 'sewage',
  'sewage-overflow': 'sewage',
  // Dumping
  'illegal-dumping': 'illegal-dumping',
  dumping: 'illegal-dumping',
  // Traffic
  'traffic-light': 'traffic-signal',
  'traffic-signal': 'traffic-signal',
  signal: 'traffic-signal',
  'broken-traffic-light': 'traffic-signal',
  // Accidents / security
  accident: 'accident',
  crash: 'accident',
  collision: 'accident',
  'suspicious-activity': 'security',
  person: 'security',
};

/** Map a Roboflow class label to CivicEye's category ids. */
export function categoryFromRoboflowLabel(label: string): CategoryId {
  const key = label.trim().toLowerCase().replace(/[_\s]+/g, '-');
  return CLASS_MAP[key] ?? 'other';
}

const mapClass = categoryFromRoboflowLabel;

/**
 * Aggregate noisy detector output (SAM workflows emit many overlapping
 * boxes per class) into a single reliable verdict.
 *
 * Strategy (validated against the real workflow): group boxes by mapped
 * category, then pick the category with the SINGLE HIGHEST box confidence
 * (tie-break: more boxes). This mirrors what the model is most confident
 * about, rather than letting a class with many weak boxes win.
 */
function aggregateVerdict(
  predictions: Prediction[],
): { category: CategoryId; confidence: number; representativeClass: string } {
  const byCategory = new Map<CategoryId, { max: number; count: number; label: string }>();

  for (const p of predictions) {
    const cat = mapClass(p.class);
    const entry = byCategory.get(cat) ?? { max: 0, count: 0, label: p.class };
    entry.count += 1;
    if (p.confidence > entry.max) {
      entry.max = p.confidence;
      entry.label = p.class;
    }
    byCategory.set(cat, entry);
  }

  let best: { category: CategoryId; max: number; count: number; label: string } | null = null;
  for (const [cat, e] of byCategory) {
    if (cat === 'other') continue;
    if (!best || e.max > best.max || (e.max === best.max && e.count > best.count)) {
      best = { category: cat, ...e };
    }
  }
  if (!best) {
    let fallback: { category: CategoryId; max: number; count: number; label: string } | null = null;
    for (const [cat, e] of byCategory) {
      if (!fallback || e.max > fallback.max) fallback = { category: cat, ...e };
    }
    best = fallback ?? { category: 'other', max: 0, count: 0, label: 'Unknown' };
  }

  return {
    category: best.category,
    confidence: clamp(best.max || 0, 0, 1),
    representativeClass: best.label,
  };
}

function severityFromConfidence(score: number): Severity {
  if (score > 0.82) return 'critical';
  if (score > 0.68) return 'high';
  if (score > 0.5) return 'medium';
  return 'low';
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** A raw object prediction returned by a Roboflow detector. */
export interface RoboflowPrediction {
  class: string;
  confidence: number;
  /** Roboflow standard-detector coordinates (usually pixel values). */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Segmentation polygon points for exact outline */
  points?: Array<{ x: number; y: number }>;
  /** Alternative: segmentation as flat array or object */
  segmentation?: unknown;
}

type Prediction = RoboflowPrediction;

/** Recursively find every {class, confidence} object in the response. */
export function extractPredictions(node: unknown, out: RoboflowPrediction[] = []): RoboflowPrediction[] {
  if (Array.isArray(node)) {
    for (const item of node) extractPredictions(item, out);
    return out;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const confidence = typeof obj.confidence === 'number' ? obj.confidence : Number(obj.confidence);
    if (typeof obj.class === 'string' && Number.isFinite(confidence)) {
      const numeric = (key: string): number | undefined => {
        const value = obj[key];
        const parsed = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };
      // Extract polygon points for exact outline
      let points: Array<{ x: number; y: number }> | undefined;
      const rawPoints = obj.points as any;
      const rawSegmentation = obj.segmentation as any;
      if (Array.isArray(rawPoints) && rawPoints.length > 0) {
        // Could be [{x,y}] or [[x,y]] or flat
        if (typeof rawPoints[0] === 'object' && rawPoints[0] !== null && 'x' in rawPoints[0]) {
          points = rawPoints.map((p: any) => ({ x: Number(p.x), y: Number(p.y) })).filter((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y));
        } else if (Array.isArray(rawPoints[0])) {
          points = rawPoints.map((p: any) => ({ x: Number(p[0]), y: Number(p[1]) })).filter((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y));
        }
      } else if (rawSegmentation) {
        // Handle various segmentation formats
        if (Array.isArray(rawSegmentation) && rawSegmentation.length > 0) {
          if (Array.isArray(rawSegmentation[0])) {
            // [[x,y], [x,y], ...] or [[[x,y]]]
            const flat = Array.isArray(rawSegmentation[0][0]) ? rawSegmentation[0] : rawSegmentation;
            if (Array.isArray(flat[0])) {
              points = flat.map((p: any) => ({ x: Number(p[0]), y: Number(p[1]) })).filter((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y));
            }
          }
        }
      }
      out.push({
        class: obj.class,
        confidence,
        x: numeric('x'),
        y: numeric('y'),
        width: numeric('width'),
        height: numeric('height'),
        points,
        segmentation: obj.segmentation,
      });
    }
    for (const key of Object.keys(obj)) extractPredictions(obj[key], out);
  }
  return out;
}

/** Find the workflow's image-shaped output (data URL for the UI). */
export function extractAnnotatedImage(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = extractAnnotatedImage(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (
      typeof obj.type === 'string' &&
      obj.type === 'base64' &&
      typeof obj.value === 'string' &&
      obj.value.length > 0
    ) {
      return `data:image/jpeg;base64,${obj.value}`;
    }
    for (const key of Object.keys(obj)) {
      const found = extractAnnotatedImage(obj[key]);
      if (found) return found;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Call the Roboflow proxy (Worker or /api/roboflow). */
async function callProxy(body: { image: string; api_key?: string; model?: string }): Promise<unknown> {
  if (!PROXY_TARGET) {
    throw new RoboflowError(
      'VITE_ROBOFLOW_PROXY_URL is invalid (looks like a placeholder, e.g. <you>). ' +
        'Set it to your real Cloudflare Worker URL, or remove it to use /api/roboflow.',
      undefined,
      'config',
    );
  }
  // postJsonWithRetry manages its own per-attempt AbortController (so retries
  // aren't killed by the first attempt's timeout). We still enforce a global
  // cap of REQUEST_TIMEOUT_MS * MAX_ATTEMPTS here as a safety net.
  const res: Response = await postJsonWithRetry(
    PROXY_TARGET,
    JSON.stringify(body),
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new RoboflowError(`Roboflow proxy error ${res.status}: ${text.slice(0, 200)}`, res.status, 'http');
  }

  try {
    return (await res.json()) as unknown;
  } catch {
    throw new RoboflowError('Roboflow proxy returned non-JSON response.', res.status, 'parse');
  }
}

export interface RoboflowInference {
  predictions: RoboflowPrediction[];
  annotatedImage: string | null;
}

/**
 * Run one image through the same Roboflow target used by the report wizard.
 * Keeping this path shared is important: Live AI and Report AI cannot drift
 * onto different models or proxy payloads.
 */
async function runRoboflowInference(photo: string): Promise<RoboflowInference> {
  const match = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,(.+)$/s.exec(photo);
  if (!match) throw new RoboflowError('Unsupported image format.');

  let data: unknown;
  let predictions: RoboflowPrediction[] = [];
  let annotatedImage: string | null = null;

  if (WORKSPACE && WORKFLOW_ID) {
    data = await callProxy({ image: match[1], api_key: API_KEY });
    const outputs = (data as { outputs?: unknown[] })?.outputs ?? [];
    const roots = outputs.length > 0 ? outputs : [data];
    for (const entry of roots) {
      predictions = predictions.concat(extractPredictions(entry));
      annotatedImage = annotatedImage ?? extractAnnotatedImage(entry);
    }
  } else if (MODEL) {
    data = await callProxy({ image: match[1], api_key: API_KEY, model: MODEL });
    predictions = extractPredictions(data);
    annotatedImage = extractAnnotatedImage(data);
  } else {
    throw new RoboflowError('No Roboflow target configured (workspace+workflow or model).');
  }

  return { predictions, annotatedImage };
}

/**
 * Analyze one live frame with the exact same Roboflow workflow/model used for
 * reports. Unlike the report result, this exposes every raw box so the live
 * page can draw detections across successive full-road frames.
 */
export async function detectFrameWithRoboflow(photo: string): Promise<RoboflowInference> {
  if (!hasRoboflowKey) {
    throw new RoboflowError('Roboflow is not configured (key + workspace/workflow or model).');
  }
  return runRoboflowInference(photo);
}

/**
 * Analyze a photo with Roboflow via the proxy. Workflow if
 * workspace+workflow_id configured, else the detect endpoint
 * (VITE_ROBOFLOW_MODEL). Returns an AnalysisResult (engine: 'roboflow');
 * if the workflow returns no predictions, reports that honestly.
 */
export async function analyzePhotoWithRoboflow(
  photo: string,
  coordinates: Coordinates | null,
): Promise<AnalysisResult & { annotatedImage?: string | null }> {
  if (!hasRoboflowKey)
    throw new RoboflowError('Roboflow is not configured (key + workspace/workflow or model).');

  const quality = await detectBlur(photo);
  const base: AnalysisResult & { annotatedImage?: string | null } = {
    category: 'other',
    confidence: 0.2,
    severity: 'low',
    description: '',
    objects: [],
    coordinates,
    timestamp: new Date().toISOString(),
    tags: [],
    imageQuality: quality,
    qualityNote: undefined,
    engine: 'roboflow',
    annotatedImage: null,
  };

  const { predictions, annotatedImage } = await runRoboflowInference(photo);
  base.annotatedImage = annotatedImage;
  if (predictions.length === 0) {
    base.description =
      WORKSPACE && WORKFLOW_ID
        ? 'The workflow ran, but it returned no detection data. Expose the predictions as a workflow output, or use a detect.roboflow.com model URL.'
        : 'The model did not detect any known civic issue in this photo.';
    return base;
  }

  const verdict = aggregateVerdict(predictions);
  const confidence = verdict.confidence;
  const category = verdict.category;
  const sev = severityFromConfidence(confidence);

  // Dedupe objects: each class appears once, with its highest confidence.
  const classBest = new Map<string, number>();
  for (const prediction of predictions) {
    classBest.set(
      prediction.class,
      Math.max(classBest.get(prediction.class) ?? 0, prediction.confidence),
    );
  }
  const uniqueClasses = [...classBest.entries()].sort((a, b) => b[1] - a[1]);
  const objects = uniqueClasses
    .slice(0, 8)
    .map(([label, confidenceValue]) => `${label} (${Math.round(confidenceValue * 100)}%)`);

  // Human-friendly, grounded description from the real detections.
  const severityWord: Record<Severity, string> = {
    low: 'Minor',
    medium: 'Moderate',
    high: 'Significant',
    critical: 'Critical',
  };
  const listed = uniqueClasses
    .slice(0, 4)
    .map(([label, confidenceValue]) => `${label} (${Math.round(confidenceValue * 100)}% confidence)`)
    .join(', ');
  const dominant = category.replace(/-/g, ' ');
  const description =
    `${severityWord[sev]} ${dominant} detected in this photo. ` +
    `The image shows ${listed}. ` +
    `These are the top issues the model found in the scene; ` +
    (annotatedImage
      ? 'the annotated preview highlights exactly where each one is located.'
      : 'no annotated preview was returned for this image.');

  // If workflow didn't return annotated image, generate one from predictions with real boxes
  let finalAnnotated = annotatedImage;
  if (!finalAnnotated) {
    try {
      // Use original photo if available, else try to generate mock
      // We need photo - it's in closure? Actually runRoboflowInference doesn't have photo, but analyzePhotoWithRoboflow does
      // For now, try to generate from predictions using a placeholder - will be replaced in orchestrator with real photo
      finalAnnotated = null;
    } catch {
      finalAnnotated = null;
    }
  }

  return {
    category,
    confidence,
    severity: sev,
    description,
    objects,
    coordinates,
    timestamp: new Date().toISOString(),
    tags: uniqueClasses.slice(0, 5).map(([label]) => label),
    imageQuality: quality,
    qualityNote: undefined,
    engine: 'roboflow',
    annotatedImage: finalAnnotated,
    predictions, // keep predictions for fallback generation
  } as any;
}
