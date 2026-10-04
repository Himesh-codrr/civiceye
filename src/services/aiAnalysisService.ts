import type { AnalysisResult, CategoryId, Coordinates, Severity } from '@/types';
import { CATEGORIES, categoryById } from '@/data/categories';
import { compressImageForAI, generateMockAnnotatedImage } from '@/utils/image';
import { analyzePhotoWithRoboflow, hasRoboflowKey, roboflowStatus } from './roboflowService';
import { analyzeOnDevice, onDeviceEnabled } from './onDeviceService';
import { analyzeWithHuggingFace, hasHuggingFaceKey } from './huggingfaceService';

/**
 * Mock computer-vision photo analysis.
 *
 * Simulates an ML pipeline (object detection → classification → severity
 * estimation) with staged progress and a deterministic "model output"
 * seeded from the photo bytes, so the same photo always yields the same
 * result — like a real model would.
 */

export interface AnalysisStage {
  label: string;
  detail: string;
  duration: number; // ms
}

/** Progress stages shown during analysis. */
export const ANALYSIS_STAGES: AnalysisStage[] = [
  {
    label: 'Uploading evidence photo',
    detail: 'Compressing and hashing the image…',
    duration: 900,
  },
  {
    label: 'Detecting objects',
    detail: 'Running YOLO-style detector over 640×480 grid…',
    duration: 1100,
  },
  { label: 'Classifying issue', detail: 'Matching against 12 civic categories…', duration: 900 },
  { label: 'Estimating severity', detail: 'Scoring damage extent & public risk…', duration: 800 },
  { label: 'Generating description', detail: 'Composing human-readable summary…', duration: 600 },
];

export interface AnalysisProgress {
  /** 0..1 */
  progress: number;
  stageIndex: number;
  stage: AnalysisStage | null;
}

/** Deterministic hash of a string (FNV-1a) — seeds the pseudo model. */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small seeded PRNG so the "model" is reproducible. */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OBJECT_POOL: Record<CategoryId, string[]> = {
  pothole: ['asphalt', 'cracked road', 'pothole', 'gravel debris'],
  'broken-road': ['eroded asphalt', 'cracks', 'exposed aggregate', 'loose stones'],
  garbage: ['plastic waste', 'food scraps', 'overflowing bin', 'paper litter'],
  sidewalk: ['concrete tiles', 'broken slab', 'uneven surface', 'trip hazard'],
  manhole: ['open manhole', 'iron ring', 'dark shaft', 'missing cover'],
  'fallen-tree': ['tree trunk', 'exposed roots', 'canopy', 'blocked path'],
  'street-light': ['lamp pole', 'damaged housing', 'exposed wires', 'dark lens'],
  'water-leakage': ['burst pipe', 'water flow', 'wet asphalt', 'erosion'],
  sewage: ['overflowing drain', 'sewage water', 'clogged grate', 'bad odour zone'],
  'illegal-dumping': ['construction debris', 'bricks', 'rubble pile', 'vacant plot'],
  'traffic-signal': ['signal housing', 'dark lamps', 'damaged casing', 'hanging wires'],
  accident: ['damaged car body', 'crash debris', 'stopped traffic', 'collision marks'],
  security: ['unattended bag', 'person in restricted area', 'unusual activity', 'forced entry marks'],
  other: ['public structure', 'damage marks', 'metal parts', 'wear & tear'],
};

const OBJECT_CONFIDENCE = ['0.82', '0.76', '0.68', '0.61'];

/** Compose the AI-generated description from the category + severity. */
function describe(category: CategoryId, severity: Severity): string {
  const meta = categoryById(category);
  const lead: Record<Severity, string> = {
    low: `Minor ${meta.short.toLowerCase()} visible in the image.`,
    medium: `Moderate ${meta.short.toLowerCase()} with clear visible impact.`,
    high: `Significant ${meta.short.toLowerCase()} — likely to affect daily use.`,
    critical: `Critical ${meta.short.toLowerCase()} posing an immediate public risk.`,
  };
  return `${lead[severity]} The scene shows typical signs consistent with ${meta.label.toLowerCase()} damage in a public area. Recommend inspection by the relevant ward team.`;
}

/** Map confidence → severity (deterministic). */
export function severityFromScore(score: number): Severity {
  if (score > 0.82) return 'critical';
  if (score > 0.68) return 'high';
  if (score > 0.5) return 'medium';
  return 'low';
}

export interface AnalysisInput {
  photo: string; // data URL
  coordinates: Coordinates | null;
}

export interface AnalysisOutput extends AnalysisResult {
  /** The photo that was analysed (echoed back). */
  photo: string;
}

/**
 * Run the full (mock) analysis synchronously given a photo + coordinates.
 */
export function analyzePhoto(input: AnalysisInput): AnalysisOutput {
  const hash = hashString(input.photo.slice(0, 4000));
  const rand = mulberry32(hash);

  // Confidence per category — the "true" category gets the top score.
  const scores = CATEGORIES.map((c) => ({ category: c.id, score: 0.35 + rand() * 0.4 }));
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const confidence = 0.62 + top.score * 0.35; // ~0.73–0.97

  const category: CategoryId = top.category;
  const severity = severityFromScore(confidence);
  const objects = OBJECT_POOL[category]
    .map((label, i) => ({ label, conf: OBJECT_CONFIDENCE[i] }))
    .sort(() => rand() - 0.5)
    .slice(0, 3 + Math.floor(rand() * 2))
    .map((o) => `${o.label} (${o.conf})`);

  const tags = OBJECT_POOL[category].slice(0, 3);

  return {
    photo: input.photo,
    category,
    confidence: Math.round(confidence * 100) / 100,
    description: describe(category, severity),
    objects,
    severity,
    coordinates: input.coordinates,
    timestamp: new Date().toISOString(),
    tags,
  };
}

/** Total duration of the animation in ms. */
export function analysisTotalMs(): number {
  return ANALYSIS_STAGES.reduce((sum, s) => sum + s.duration, 0);
}

/**
 * Orchestrator: try the REAL engines in order (Roboflow → on-device →
 * Hugging Face), falling back to the built-in mock estimate only if all fail
 * (no keys, offline, or rate limited). Result is tagged with the engine used.
 * Photos are compressed before hitting the APIs to stay under quotas.
 */
export async function runImageAnalysis(
  photo: string,
  coordinates: Coordinates | null,
): Promise<AnalysisOutput> {
  // Compress once for all real-model calls (keeps payloads small).
  let aiPhoto = photo;
  try {
    aiPhoto = await compressImageForAI(photo);
  } catch {
    aiPhoto = photo; // fall back to original if compression fails
  }

  // 1) ROBOFLOW (CivicLENS) — PRIMARY cloud engine, trained on civic issues.
  //    Most accurate for civic detection, so it runs first when configured.
  if (hasRoboflowKey) {
    try {
      const real = await analyzePhotoWithRoboflow(aiPhoto, coordinates);
      let annotatedImage: string | null = (real as any).annotatedImage || null;
      const predictions = (real as any).predictions || [];
      if (!annotatedImage) {
        try {
          const { generateAnnotatedFromPredictions } = await import('@/utils/image');
          if (predictions.length > 0) {
            annotatedImage = await generateAnnotatedFromPredictions(photo, predictions, real.category, real.confidence);
          } else {
            annotatedImage = await generateMockAnnotatedImage(photo, real.category, real.confidence, real.objects);
          }
        } catch (e) {
          console.warn('Failed to generate annotated from predictions', e);
          try {
            annotatedImage = await generateMockAnnotatedImage(photo, real.category, real.confidence, real.objects);
          } catch {
            annotatedImage = null;
          }
        }
      }
      return { ...real, photo, annotatedImage };
    } catch (err) {
      console.warn('[CivicEye] Roboflow unavailable:', err);
    }
  } else {
    console.warn('[CivicEye] Roboflow is NOT configured correctly —', roboflowStatus().reason);
  }

  // 2) ON-DEVICE — free, private, offline-capable FALLBACK. Only trusted when
  //    it maps to a real civic category with enough confidence.
  if (onDeviceEnabled) {
    try {
      const { confident, result } = await analyzeOnDevice(aiPhoto, coordinates);
      if (confident) {
        let annotatedImage: string | null = (result as any).annotatedImage || null;
        if (!annotatedImage) {
          try {
            annotatedImage = await generateMockAnnotatedImage(photo, result.category, result.confidence, result.objects);
          } catch {
            annotatedImage = null;
          }
        }
        return { ...result, photo, annotatedImage };
      }
      console.warn('[CivicEye] on-device AI not confident — using cloud engines.');
    } catch (err) {
      console.warn('[CivicEye] on-device AI unavailable:', err);
    }
  }

  // 3) Hugging Face Inference API — cloud backup (after Roboflow + on-device).
  if (hasHuggingFaceKey) {
    try {
      const real = await analyzeWithHuggingFace(aiPhoto, coordinates);
      let annotatedImage: string | null = (real as any).annotatedImage || null;
      if (!annotatedImage) {
        try {
          annotatedImage = await generateMockAnnotatedImage(photo, real.category, real.confidence, real.objects);
        } catch {
          annotatedImage = null;
        }
      }
      return { ...real, photo, annotatedImage };
    } catch (err) {
      console.warn('[CivicEye] Hugging Face unavailable:', err);
    }
  }
  const mock = analyzePhoto({ photo, coordinates });
  let annotatedImage: string | null = null;
  try {
    annotatedImage = await generateMockAnnotatedImage(photo, mock.category, mock.confidence, mock.objects);
  } catch {
    annotatedImage = null;
  }
  return { ...mock, engine: 'mock' as const, annotatedImage };
}
