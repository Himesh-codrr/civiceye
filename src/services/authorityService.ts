import type { Authority, CategoryId, Report } from '@/types';
import { authorityForCategory, mailToLink, smsLink, whatsAppLinks } from '@/data/authorities';
import { supabase } from '@/lib/supabase';
import emailjs from '@emailjs/browser';

/**
 * Client-side email fallback via EmailJS (https://www.emailjs.com/) — a
 * third-party sender that needs no server at all. Configure with the
 * VITE_EMAILJS_* env vars (see ENVIRONMENT.md). The public key is safe for
 * the browser; restrict it to your domain in the EmailJS dashboard.
 */
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim() ?? '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim() ?? '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim() ?? '';

export const isEmailJSConfigured = Boolean(
  EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY,
);

export const newEscalationRef = (): string =>
  `ESC-${Date.now().toString(36).toUpperCase()}`;

/**
 * Send the escalation via EmailJS from the browser. Variable names here must
 * match the EmailJS template (documented in ENVIRONMENT.md).
 */
export async function sendEscalationViaEmailJS(
  report: Report,
  authority: Authority,
  reporterEmail: string | null,
  message: string | undefined,
  ref: string,
  opts: { slaBreach?: boolean; level?: number } = {},
): Promise<void> {
  const reportUrl = `${window.location.origin}/report/${report.id}`;
  const mapsUrl = `https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`;
  const mapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.coordinates.lat},${report.coordinates.lng}`;
  const ai = report.ai;
  const appName = report.scope === 'campus' ? 'Amrita Eye' : 'CivicEye';
  const breachPrefix = opts.slaBreach ? `[SLA BREACH L${opts.level ?? 1}] ` : '';
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: authority.email,
      authority_name: authority.name,
      department: authority.department,
      app_name: appName,
      ref,
      report_code: report.code ?? report.id,
      title: report.title,
      subject: `${breachPrefix}[${appName}] ${report.severity.toUpperCase()} — ${report.title} — ${ref}`,
      category: report.category,
      severity: report.severity,
      severity_upper: report.severity.toUpperCase(),
      location_name: report.locationName,
      coordinates: `${report.coordinates.lat}, ${report.coordinates.lng}`,
      maps_url: mapsUrl,
      maps_dir_url: mapsDirUrl,
      report_url: reportUrl,
      image_url: report.image,
      annotated_image_url: ai?.annotatedImage ?? '',
      ai_confidence: ai?.confidence ? Math.round(ai.confidence * 100) + '%' : '',
      ai_objects: (ai?.objects || []).join(', '),
      ai_summary: ai?.summary ?? '',
      ai_model: ai?.model ?? '',
      author: report.author,
      reporter_email: reporterEmail ?? '—',
      description: report.description,
      message: message ?? '',
      sla: report.severity === 'critical' ? '24 hours' : '7 working days',
      is_sla_breach: opts.slaBreach ? 'yes' : '',
      escalation_level: opts.slaBreach ? String(opts.level ?? 1) : '',
    },
    { publicKey: EMAILJS_PUBLIC_KEY },
  );
}

/** Payload sent to POST /api/report-authority. */
export interface EscalationPayload {
  authorityId: string;
  message?: string;
  report: {
    id?: string;
    code?: string;
    title: string;
    description: string;
    category: CategoryId | string;
    severity: string;
    locationName?: string;
    coordinates?: { lat: number; lng: number } | null;
    image?: string;
    url?: string;
    author?: string;
    reporterEmail?: string;
    scope?: 'city' | 'campus';
    ai?: {
      annotatedImage?: string;
      confidence?: number;
      summary?: string;
      model?: string;
      objects?: string[];
    };
    slaBreach?: boolean;
    escalationLevel?: number;
  };
}

export interface EscalationResult {
  status: 'sent' | 'not-configured';
  ref: string;
  to?: string;
  authorityName?: string;
}

/**
 * If a data: URL is too big to send inline via JSON, downscale + re-encode it
 * as a smaller JPEG. Returns a Promise resolving to a (possibly smaller)
 * data URL. http(s) URLs pass through unchanged.
 */
async function shrinkForTransport(url: string | null | undefined, maxBytes = 900_000): Promise<string | undefined> {
  if (!url || typeof url !== 'string') return undefined;
  if (!url.startsWith('data:')) return url; // leave http(s) URLs alone
  if (url.length <= maxBytes) return url;

  try {
    const { compressImageForAI } = await import('@/utils/image');
    const compressed = await compressImageForAI(url);
    // If compression still didn't shrink enough, bail out — send as link only.
    if (compressed.length > maxBytes * 1.4) return undefined;
    return compressed;
  } catch {
    return undefined;
  }
}

/** Build the escalation payload for a report + authority pair. */
export async function buildEscalationPayload(
  report: Report,
  authority: Authority,
  reporterEmail: string | null,
  message?: string,
  opts: { slaBreach?: boolean; level?: number } = {},
): Promise<EscalationPayload> {
  const ai = report.ai;
  // Compress large inline data URLs before sending so we don't blow the
  // Vercel 4.5 MB body limit with base64-encoded phone photos. HTTP URLs
  // (Supabase storage) are passed through as links — the server will
  // attach them as links rather than embedding.
  const image = await shrinkForTransport(report.image);
  const annotatedImage = ai?.annotatedImage
    ? await shrinkForTransport(ai.annotatedImage as string)
    : undefined;
  return {
    authorityId: authority.id,
    message,
    report: {
      id: report.id,
      code: report.code,
      title: report.title,
      description: report.description,
      category: report.category,
      severity: report.severity,
      locationName: report.locationName,
      coordinates: report.coordinates,
      image: image ?? report.image, // fall back to original ref (URL) if too big
      url: `${window.location.origin}/report/${report.id}`,
      author: report.author,
      reporterEmail: reporterEmail ?? undefined,
      scope: report.scope,
      ai: ai
        ? {
            annotatedImage,
            confidence: ai.confidence,
            summary: ai.summary,
            model: ai.model,
            objects: ai.objects,
          }
        : undefined,
      slaBreach: opts.slaBreach,
      escalationLevel: opts.level,
    },
  };
}

/**
 * Ask the server to email the report package to the authority.
 * Throws only on network errors; delivery problems come back as a result.
 */
export async function sendEscalationEmail(payload: EscalationPayload): Promise<EscalationResult> {
  const res = await fetch('/api/report-authority', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 503) {
    const data = await res.json().catch(() => ({}));
    return {
      status: 'not-configured',
      ref: data.ref ?? '',
      to: data.to,
      authorityName: data.authority?.name,
    };
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Delivery failed (${res.status})`);
  }
  const data = await res.json();
  return { status: 'sent', ref: data.ref, to: data.to, authorityName: data.authority?.name };
}

/**
 * The pre-filled email body used for mailto: fallback and for auto BBMP/Estate email.
 * Includes attached picture with AI annotations, Google Maps coordinate link with severity, and link to report on website — same for Amrita Eye.
 */
export function escalationEmailText(
  report: Report,
  _authority: Authority,
  _reporterEmail: string | null,
  message?: string,
  opts: { slaBreach?: boolean; level?: number } = {},
): { subject: string; body: string } {
  const url = `${window.location.origin}/report/${report.id}`;
  const appName = report.scope === 'campus' ? 'Amrita Eye' : 'CivicEye';
  const mapsLink = `https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`;
  const severityUpper = report.severity.toUpperCase();
  const breachTag = opts.slaBreach ? `[SLA BREACH · L${opts.level ?? 1}] ` : '';
  const subject = `${breachTag}[${appName}] ${severityUpper} — ${report.title} — ${report.code ?? report.id}`;
  const ai = report.ai;

  const bodyLines = [
    opts.slaBreach
      ? `⚠️ SLA BREACH ESCALATION (Level ${opts.level ?? 1}): This report has exceeded its response deadline and is being escalated to your office. Please review and act.`
      : '',
    `${appName} — ${severityUpper} — ${report.code ?? report.id} — ${report.title}`,
    `Category: ${report.category} · Severity: ${severityUpper}`,
    `Location: ${report.locationName} (${report.coordinates.lat}, ${report.coordinates.lng})`,
    `Maps: ${mapsLink}`,
    `Report: ${url}`,
    `Original: ${report.image}`,
    ai?.annotatedImage ? `Annotated: ${ai.annotatedImage}` : '',
    `Description: ${report.description}`,
    message ? `Note: ${message}` : '',
    ai?.summary ? `AI: ${ai.summary} ${ai.confidence ? Math.round(ai.confidence*100)+'%' : ''} ${ai.model ?? ''}` : '',
  ].filter(Boolean);
  return { subject, body: bodyLines.join('\n') };
}

/** WhatsApp deep links — includes both original and AI annotated links + Google Maps + severity + report link */
export function escalationWhatsAppTargets(
  report: Report,
  authority: Authority,
  opts: { slaBreach?: boolean; level?: number } = {},
): { number: string; url: string }[] {
  const appName = report.scope === 'campus' ? 'Amrita Eye' : 'CivicEye';
  const mapsLink = `https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`;
  const reportUrl = `${window.location.origin}/report/${report.id}`;
  const ai = report.ai;
  const header = opts.slaBreach
    ? `⚠️ SLA BREACH (L${opts.level ?? 1}) — `
    : '';
  const text = [
    `${header}${appName} — ${report.severity.toUpperCase()} — ${report.title}`,
    `Code: ${report.code ?? report.id}`,
    `Category: ${report.category} · Severity: ${report.severity.toUpperCase()}`,
    `Location: ${report.locationName}`,
    `Maps: ${mapsLink}`,
    `Report: ${reportUrl}`,
    `Original Photo: ${report.image}`,
    ai?.annotatedImage ? `AI Annotated: ${ai.annotatedImage}` : '',
    ai?.summary ? `AI: ${ai.summary} (${ai.confidence ? Math.round(ai.confidence*100)+'%' : ''})` : '',
  ].filter(Boolean).join('\n');
  return whatsAppLinks(authority, text);
}

/** The SMS deep link for texting the authority about a report. */
export function escalationSmsUrl(
  report: Report,
  authority: Authority,
  opts: { slaBreach?: boolean; level?: number } = {},
): string | undefined {
  const appName = report.scope === 'campus' ? 'Amrita Eye' : 'CivicEye';
  const header = opts.slaBreach ? `SLA BREACH L${opts.level ?? 1}: ` : '';
  const text = [
    `${header}${appName} report: ${report.title}`,
    `Category: ${report.category} · Severity: ${report.severity}`,
    `Location: ${report.locationName} (${report.coordinates.lat}, ${report.coordinates.lng})`,
    `Details: ${window.location.origin}/report/${report.id}`,
  ].join('\n');
  return smsLink(authority, text);
}

/** The mailto: fallback link for a report escalation. */
export function escalationMailToUrl(
  report: Report,
  authority: Authority,
  reporterEmail: string | null,
  message?: string,
  opts: { slaBreach?: boolean; level?: number } = {},
): string {
  const { subject, body } = escalationEmailText(report, authority, reporterEmail, message, opts);
  return mailToLink(authority, subject, body);
}

/**
 * Best-effort log of the escalation in Supabase (`authority_reports` table —
 * see supabase/authority-reports.sql). Never throws: the escalation itself
 * must succeed even before the migration is run.
 */
export async function logEscalation(entry: {
  report: Report | null;
  authority: Authority;
  channel: 'email' | 'whatsapp' | 'phone' | 'sms' | 'mailto';
  reporterId?: string | null;
  reporterEmail?: string | null;
  message?: string;
}): Promise<void> {
  if (!supabase) return;
  try {
    const { report, authority, channel, reporterId, reporterEmail, message } = entry;
    await supabase.from('authority_reports').insert({
      report_id: report?.id ?? null,
      report_code: report?.code ?? null,
      authority_id: authority.id,
      authority_email: authority.email,
      channel,
      reporter_id: reporterId ?? null,
      reporter_email: reporterEmail ?? null,
      message: message ?? null,
    });
  } catch {
    /* audit logging is best-effort only */
  }
}

/** Which authority handles this report's category in its scope. */
export function responsibleAuthority(report: Pick<Report, 'category' | 'scope'>): Authority {
  return authorityForCategory(report.category, report.scope);
}
