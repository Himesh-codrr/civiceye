/**
 * Vercel serverless function — "Report to Authority" email gateway.
 *
 * POST /api/report-authority
 * Body:
 *   {
 *     authorityId: "bbmp-42",                     // required (allow-listed)
 *     message?: "...",                            // optional user note
 *     report: {                                   // required
 *       code? / id?, title, description, category, severity,
 *       locationName?, coordinates?: { lat, lng },
 *       image?, url?, author?, reporterEmail?, scope?
 *     }
 *   }
 *
 * The recipient email is resolved SERVER-SIDE (env override first, then the
 * built-in directory). The client can never choose the "to" address, so this
 * function cannot be abused as an open spam relay.
 *
 * Delivery config (Vercel project → Settings → Environment Variables):
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS   — any SMTP provider
 *   SMTP_FROM                                       — e.g. "CivicEye <alerts@yourdomain.com>"
 *   AUTHORITY_EMAIL_<ID>                            — e.g. AUTHORITY_EMAIL_BBMP_42
 *                                                     (overrides the default official inbox)
 *
 * If SMTP is not configured the function responds 503 with
 * { reason: "EMAIL_NOT_CONFIGURED" } and the UI falls back to a mailto: link,
 * so the feature still works end-to-end during demos.
 */

import nodemailer from 'nodemailer';

const rateMap = new Map();
function rateLimit(ip, max, windowMs) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > windowMs) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
function getClientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown');
}
function sanitizeString(input, maxLen = 5000) {
  if (typeof input !== 'string') return '';
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/javascript\s*:/gi, '').slice(0, maxLen);
  return cleaned.trim();
}

/* Centralised sender/reply-to so every email in CivicEye is consistent.
 * SMTP_FROM env is the source of truth. If it's not set yet we fall back to
 * the canonical info@ address (SMTP_USER still has to be a real Gmail user
 * for auth, but we set From to the branded address). */
const BRAND_EMAIL = 'info@civiceye.co.in';
function fromAddress() {
  return process.env.SMTP_FROM || `CivicEye <${BRAND_EMAIL}>`;
}
function teamReplyTo() {
  return { replyTo: BRAND_EMAIL };
}

/* Built-in authority directory (id → { name, department, email }).
 * All internal CivicEye / Amrita campus addresses route to the single
 * branded inbox; external civic bodies keep their official addresses.
 * Keep in sync with src/data/authorities.ts. Env vars always win. */
const DIRECTORY = {
  'bbmp-42': { name: 'BBMP — Roads & Potholes', department: 'Roads & Infrastructure', email: 'comm@bbmp.gov.in' },
  'bbmp-swm': { name: 'BBMP Solid Waste Management', department: 'Sanitation', email: 'comm@bbmp.gov.in' },
  bwssb: { name: 'BWSSB Helpline', department: 'Water Supply & Sewerage', email: '' },
  bescom: { name: 'BESCOM 1912', department: 'Street Lighting & Power', email: '' },
  'traffic-police': { name: 'Bengaluru Traffic Police', department: 'Traffic & Signals', email: '' },
  'forest-dept': { name: 'BBMP Forest Cell', department: 'Trees & Parks', email: 'comm@bbmp.gov.in' },
  'amrita-estate': { name: 'Campus Estate & Civil Works', department: 'Campus Infrastructure', email: BRAND_EMAIL },
  'amrita-facilities': { name: 'Facilities & Housekeeping', department: 'Sanitation, Water & Electrical', email: BRAND_EMAIL },
  'amrita-security': { name: 'Campus Security Control Room', department: 'Safety & Security', email: BRAND_EMAIL },
  /* SLA-breach higher authorities (city) */
  'bbmp-commissioner': { name: 'BBMP Commissioner', department: 'Office of the Commissioner · Level 1 escalation', email: 'comm@bbmp.gov.in' },
  'bbmp-chief-mayor': { name: 'BBMP Chief Commissioner + Mayor', department: 'Level 2 escalation', email: 'comm@bbmp.gov.in' },
  'ka-udd': { name: 'Karnataka Urban Development Dept', department: 'Principal Secretary UDD · Level 3 escalation', email: 'secyudd@karnataka.gov.in' },
  /* SLA-breach higher authorities (campus) */
  'amrita-dean': { name: 'Dean / Director Office', department: 'Level 1 escalation — Campus Administration', email: BRAND_EMAIL },
  'amrita-vc': { name: 'Vice Chancellor Office', department: 'Level 2 escalation', email: BRAND_EMAIL },
};

// Max overall JSON payload (after parsing) — ~9 MB. After base64 overhead this
// fits a compressed photo (~1 MB JPEG ≈ 1.4 MB base64) plus the annotated
// version plus all metadata without blowing Vercel's 4.5 MB default (we
// already raised bodyParser.sizeLimit to 10 MB above).
const MAX_BODY_CHARS = 9_000_000;
// Max per-image (original or annotated) as base64: ~4 MB ≈ 3 MB JPEG.
// Anything bigger is stripped and sent as a link instead of an attachment.
const MAX_IMG_BASE64_CHARS = 4_000_000;

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  };
}

function emailFor(authorityId) {
  const envKey = `AUTHORITY_EMAIL_${authorityId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return (process.env[envKey] || '').trim() || DIRECTORY[authorityId].email;
}

function originFromReq(req) {
  const host = (process.env.APP_URL || '').replace(/https?:\/\//, '')
    || req.headers['x-forwarded-host']
    || req.headers.host
    || 'civiceye.co.in';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

function buildEmail({ authority, report, message, ref, origin }) {
  const lat = report?.coordinates?.lat;
  const lng = report?.coordinates?.lng;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const mapsDirUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;
  origin = origin || 'https://civiceye.co.in';
  const reportUrl = report.url || (report.id ? `${origin}/report/${report.id}` : null);
  const appName = report.scope === 'campus' ? 'Amrita Eye' : 'CivicEye';
  const isCampus = report.scope === 'campus';
  const severityUpper = String(report.severity || '').toUpperCase();
  const isBreach = Boolean(report.slaBreach);
  const breachLevel = Number(report.escalationLevel) || 1;
  const breachTag = isBreach ? `[SLA ESCALATION · L${breachLevel}] ` : '';
  const severityNote = isBreach
    ? `⚠️ SLA DEADLINE BREACHED — Your Reports have crossed the limited time frame for fixing, SLA escalate now. Escalation Level ${breachLevel}. Please intervene urgently.`
    : report.severity === 'critical' ? 'Immediate action required — safety risk' : report.severity === 'high' ? 'High priority — please act within 48h' : report.severity === 'medium' ? 'Medium priority — 7 days' : 'Low priority — 14 days';

  const ai = report.ai || {};
  const hasAnnotated = Boolean(ai.annotatedImage);

  const rows = [
    ['Reference', ref],
    ['Report', report.code || report.id || '—'],
    ['Title', report.title],
    ['Category', report.category],
    ['Severity', `${severityUpper} — ${severityNote}`],
    ['Location', report.locationName || (hasCoords ? `${lat}, ${lng}` : '—')],
    ['Google Maps', mapsUrl || '—'],
    ['Directions', mapsDirUrl || '—'],
    ['Report Link', reportUrl || '—'],
    ['Reported by', report.author || 'Citizen'],
    ['Citizen reply-to', report.reporterEmail || '—'],
    ['Submitted via', appName + (isCampus ? ' — Estate Office' : ' — BBMP')],
    ['SLA requested', report.severity === 'critical' ? '24 hours' : '7 working days'],
    ai.confidence ? ['AI Confidence', `${Math.round(ai.confidence*100)}%`] : null,
    ai.model ? ['AI Model', ai.model] : null,
    ai.objects ? ['AI Detected', (ai.objects||[]).join(', ')] : null,
  ].filter(Boolean);

  const tableRows = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#0f172a;word-break:break-all;">${esc(v)}</td>
      </tr>`,
    )
    .join('');

  const bannerColor = isBreach ? '#b91c1c' : (isCampus ? '#A51636' : '#4f46e5');
  const breachBanner = isBreach
    ? `<div style="background:#fef2f2;border-bottom:1px solid #fecaca;padding:12px 20px;color:#991b1b;font-size:13px;font-weight:700;line-height:1.4;">⚠️ SLA ESCALATION — Level ${breachLevel}<br><span style="font-weight:600;">Your Reports have crossed the limited time frame for fixing, SLA escalate now.</span></div>`
    : '';

  const html = `<!doctype html>
<html><body style="margin:0;padding:20px;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    ${breachBanner}
    <div style="background:${bannerColor};padding:16px 20px;">
      <p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;">${esc(breachTag)}${esc(appName)} — ${esc(severityUpper)} — ${esc(ref)}</p>
      <h1 style="margin:4px 0 0;color:#ffffff;font-size:18px;">${esc(report.title)}</h1>
    </div>
    <div style="padding:16px 20px;">
      <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
      <div style="margin:14px 0;padding:12px;background:#f8fafc;border-radius:8px;">
        <p style="margin:0;font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(report.description)}</p>
      </div>
      ${hasAnnotated ? `<div style="margin:14px 0;padding:12px;background:#ecfdf5;border-radius:8px;"><p style="margin:0;font-size:13px;color:#065f46;">AI: ${esc(ai.summary)} — ${ai.confidence ? Math.round(ai.confidence*100)+'%' : ''} — ${esc((ai.objects||[]).join(', '))}</p></div>` : ''}
      ${message ? `<div style="margin:14px 0;padding:12px;background:#fff7ed;border-radius:8px;"><p style="margin:0;font-size:13px;white-space:pre-wrap;">Note: ${esc(message)}</p></div>` : ''}
      <div style="margin:16px 0;">
        ${reportUrl ? `<a href="${esc(reportUrl)}" style="display:inline-block;margin:0 6px 6px 0;padding:8px 14px;background:${isCampus ? '#A51636' : '#4f46e5'};color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">View Report</a>` : ''}
        ${mapsUrl ? `<a href="${esc(mapsUrl)}" style="display:inline-block;margin:0 6px 6px 0;padding:8px 14px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">Google Maps — ${esc(severityUpper)}</a>` : ''}
      </div>
      <p style="font-size:11px;color:#94a3b8;">Sent via ${esc(appName)} · ${esc(origin)} · Original &amp; AI-annotated photos attached when available.</p>
    </div>
  </div>
</body></html>`;

  const text = [
    `${appName} — ${severityUpper} — ${report.code || report.id} — ${report.title}`,
    `Category: ${report.category} · Severity: ${severityUpper}`,
    `Location: ${report.locationName} (${lat}, ${lng})`,
    `Maps: ${mapsUrl}`,
    `Report: ${reportUrl}`,
    `Original: ${report.image}`,
    hasAnnotated ? `Annotated: ${ai.annotatedImage}` : '',
    `Description: ${report.description}`,
    message ? `Note: ${message}` : '',
    ai.summary ? `AI: ${ai.summary} ${ai.confidence ? Math.round(ai.confidence*100)+'%' : ''}` : '',
  ].filter(Boolean).join('\n');

  return {
    subject: `${breachTag}[${appName}] ${severityUpper} — ${report.title} — escalation ${ref}`.slice(0, 160),
    html,
    text: (isBreach ? `⚠️ SLA BREACH L${breachLevel} — ` : '') + text,
  };
}

// Allow ~10 MB so base64-encoded phone photos (4–8 MB) don't trip the 4.5 MB
// Vercel default before they even reach our own size check. The API is still
// protected by MAX_BODY_CHARS below and only serves allow-listed recipients.
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const raw = req.body;
  if (!raw || JSON.stringify(raw).length > MAX_BODY_CHARS) {
    res.status(413).json({ error: 'Payload too large.' });
    return;
  }

  const authorityId = String(raw.authorityId || '').trim();
  const authority = DIRECTORY[authorityId];
  if (!authority) {
    res.status(400).json({ error: 'Unknown authorityId.' });
    return;
  }

  const report = raw.report || {};
  if (!report.title || !report.category) {
    res.status(400).json({ error: '`report.title` and `report.category` are required.' });
    return;
  }

  const message = sanitizeString(String(raw.message || ''), 2000);
  const ref = `ESC-${Date.now().toString(36).toUpperCase()}`;
  const to = emailFor(authorityId);

  const smtp = smtpConfig();
  if (!smtp) {
    // Not configured yet — tell the UI to fall back to a mailto: link.
    res.status(503).json({
      reason: 'EMAIL_NOT_CONFIGURED',
      ref,
      to,
      authority: { id: authorityId, name: authority.name, department: authority.department },
    });
    return;
  }

  try {
    const transport = nodemailer.createTransport(smtp);
    const origin = originFromReq(req);
    const mail = buildEmail({ authority, report, message, ref, origin });

    // Attach original + AI annotated pictures as data URLs only if they are
    // not too large (SMTP relays and Vercel response buffering hate multi-MB
    // attachments). Oversize images are still linked in the email body.
    const attachments = [];
    const strippedImages = [];
    const addAttachmentFromDataUrl = (dataUrl, filename) => {
      if (!dataUrl || typeof dataUrl !== 'string') return;
      if (dataUrl.startsWith('data:')) {
        if (dataUrl.length > MAX_IMG_BASE64_CHARS) {
          strippedImages.push(filename);
          return;
        }
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const base64 = match[2];
          attachments.push({
            filename,
            content: Buffer.from(base64, 'base64'),
            contentType,
          });
        }
      }
    };

    // Original photo
    addAttachmentFromDataUrl(report.image, `original-${ref}.jpg`);
    // AI annotated photo
    if (report.ai?.annotatedImage) {
      addAttachmentFromDataUrl(report.ai.annotatedImage, `ai-annotated-${ref}.jpg`);
    }

    // If we stripped oversized images, add a note so the recipient knows to
    // click the Report URL for full-resolution evidence.
    const strippedNote = strippedImages.length
      ? `<p style="font-size:11px;color:#94a3b8;">Note: ${strippedImages.join(' + ')} exceeded email attachment size limits — open the Report link above to view full-resolution evidence.</p>`
      : '';

    // If image is http URL (not data URL), we cannot attach directly without fetching, but we include link in email
    // For data URLs we attach, for http we leave as link (to avoid fetching in serverless)

    await transport.sendMail({
      from: fromAddress(),
      to,
      // When the authority hits Reply, it routes to the CivicEye inbox by
      // default; if the citizen attached their email we include it so the
      // authority can reply directly to the reporter AND copy us.
      replyTo: report.reporterEmail
        ? `${String(report.reporterEmail).slice(0, 254)}, ${BRAND_EMAIL}`
        : BRAND_EMAIL,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: attachments.length ? attachments : undefined,
    });

    res.status(200).json({
      ok: true,
      ref,
      to,
      authority: { id: authorityId, name: authority.name, department: authority.department },
    });
  } catch (err) {
    console.error('[report-authority] send failed:', err);
    res.status(502).json({ error: 'Email delivery failed. Please try again later.', ref });
  }
};
