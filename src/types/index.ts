/**
 * Core domain types for CivicEye.
 * These model the civic-issue reporting domain end to end.
 */

/** Categories a citizen can report. */
export type CategoryId =
  | 'pothole'
  | 'broken-road'
  | 'garbage'
  | 'sidewalk'
  | 'manhole'
  | 'fallen-tree'
  | 'street-light'
  | 'water-leakage'
  | 'sewage'
  | 'illegal-dumping'
  | 'traffic-signal'
  | 'accident'
  | 'security'
  | 'other';

/** Perceived severity used by both citizens and authorities. */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** Lifecycle of a report. */
export type ReportStatus = 'pending' | 'verified' | 'in-progress' | 'resolved' | 'rejected';

/** A geographic point. */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** A single civic issue report. */
export interface Report {
  id: string;
  code?: string;
  title: string;
  description: string;
  coordinates: Coordinates;
  locationName: string;
  category: CategoryId;
  severity: Severity;
  status: ReportStatus;
  image: string;
  upvotes: number;
  downvotes: number;
  votes: number;
  confirms: number;
  rejects: number;
  date: string;
  verified: boolean;
  author: string;
  assignedTo?: string;
  userId?: string;
  scope: 'city' | 'campus';
  ai?: {
    confidence?: number;
    objects?: string[];
    summary?: string;
    model?: string;
    imageQuality?: string | null;
    disclaimer?: string;
    annotatedImage?: string | null;
    originalImage?: string | null;
  } | null;
  proof?: {
    beforeImage: string;
    afterImage: string;
    fixedDate: string;
    verifiedByAI?: boolean;
    aiConfidence?: number;
    description?: string;
  } | null;
  escalation?: {
    level: number;
    escalatedAt: string;
    reason: string;
    nextAuthority?: string;
  } | null;
  sla?: {
    deadline: string;
    status: 'on-track' | 'at-risk' | 'breached';
    escalated: boolean;
    createdAt: string;
  } | null;
}

/** A user profile (mirrors the `profiles` table). */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  /** True for any email ending in "amrita.edu" (any campus). */
  is_amrita: boolean;
  created_at: string;
}

/** Which branded product is active. */
export type BrandId = 'civiceye' | 'amrita';

/** Vote types supported by the `vote_on_report` RPC. */
export type VoteType = 'up' | 'down' | 'confirm' | 'reject';

/** A user-written review on a report, with agree/disagree tallies. */
export interface Review {
  id: string;
  reportId: string | null;
  userId: string | null;
  authorName: string;
  content: string;
  agrees: number;
  disagrees: number;
  date: string;
  /** Populated when reviews are fetched with their report (landing). */
  reportTitle?: string;
}

/** A report still being drafted inside the multi-step wizard. */
export interface ReportDraft {
  category: CategoryId;
  photo: string | null;
  analysis: AnalysisResult | null;
  coordinates: Coordinates | null;
  locationName: string;
  title: string;
  description: string;
}

/** Result of the (mocked) computer-vision photo analysis. */
export interface AnalysisResult {
  category: CategoryId;
  confidence: number;
  description: string;
  objects: string[];
  severity: Severity;
  coordinates: Coordinates | null;
  timestamp: string;
  /** Raw tags produced by the model. */
  tags: string[];
  /** AI's judgment of photo quality — used to warn when the image is unclear. */
  imageQuality?: 'clear' | 'blurry' | 'unclear' | 'low-light';
  /** Human-readable reason for the quality flag. */
  qualityNote?: string;
  /** Which engine produced this result. */
  engine?: 'ondevice' | 'roboflow' | 'huggingface' | 'mock';
  /** Annotated (drawn-on) image from a Roboflow workflow, as a data URL. */
  annotatedImage?: string | null;
  /** Raw Roboflow predictions (class + confidence + bbox/polygon), used for
   *  drawing exact outlines server-side and for the admin backfill tool. */
  predictions?: Array<{
    class: string;
    confidence: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: Array<{ x: number; y: number }>;
  }>;
}

/** A toast notification shown by the ToastProvider. */
export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

/** A notification in the notification bell. */
export interface AppNotification {
  id: string;
  type: 'report' | 'verify' | 'resolve' | 'system';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

/** A government / civic authority that reports can be assigned to. */
export interface Authority {
  id: string;
  name: string;
  department: string;
  color: string;
  /**
   * Which product scope this authority serves:
   * - 'city'   → CivicEye (government / municipal bodies)
   * - 'campus' → Amrita Eye (campus offices)
   */
  scope: 'city' | 'campus';
  /** Report categories this authority is responsible for. */
  categories: CategoryId[];
  /**
   * Official inbox that receives escalated report packages.
   * Leave EMPTY when a department publishes no grievance email — the UI then
   * steers citizens to the phone / WhatsApp / portal channels instead.
   */
  email: string;
  /** Public phone line. Use a full dialable number (e.g. "+918022660000"). */
  phone?: string;
  /** Human label for the phone row, e.g. "Helpline 1533 · 24×7". */
  phoneNote?: string;
  /** WhatsApp numbers in international format without '+', e.g. ["919448197197"]. */
  whatsapp?: string[];
  /** Short label for the WhatsApp row (e.g. "BBMP waste WhatsApp"). */
  whatsappNote?: string;
  /** Postal / office address. */
  address?: string;
  /** Office hours label, e.g. "Mon–Sat 9:30–17:30". */
  hours?: string;
  /**
   * Official complaint/grievance portal URL. When set, the UI offers a
   * prominent "file officially" action (verified working portal, e.g. BBMP
   * official site / Namma Bengaluru).
   */
  portalUrl?: string;
  /** Short label for the portal button, e.g. "BBMP official site". */
  portalLabel?: string;
  /** Provenance note for sample/derived contact data. */
  source?: string;
}

/** A logged escalation of a report to an authority (the `authority_reports` table). */
export interface AuthorityEscalation {
  id: string;
  report_id: string | null;
  report_code: string | null;
  authority_id: string;
  authority_email: string;
  channel: 'email' | 'whatsapp' | 'phone' | 'sms' | 'mailto';
  reporter_id: string | null;
  reporter_email: string | null;
  message: string | null;
  created_at: string;
}

/** Chart-friendly aggregation bucket. */
export interface CategoryStat {
  category: CategoryId;
  count: number;
}

export interface SeverityStat {
  severity: Severity;
  count: number;
}

/** Filters used across the map and community feed. */
export interface ReportFilters {
  categories: CategoryId[];
  severities: Severity[];
  status: ReportStatus[];
  verifiedOnly: boolean;
  search: string;
  /** Scope filter — 'all' shows everything, otherwise city or campus only. */
  scope: ScopeFilter;
}

/** What scope a feed is filtered to. */
export type ScopeFilter = 'all' | 'city' | 'campus';

export type SortKey = 'newest' | 'oldest' | 'votes' | 'confirms' | 'severity';
