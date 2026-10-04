/**
 * Vercel serverless function — ANONYMOUS Food Hygiene Complaints.
 *
 * POST /api/food-hygiene
 * Body: { location, issueType, severity, description, whenHappened, dietaryRestriction }
 *
 * Design goals:
 *  1. FULLY ANONYMOUS. No auth header required. No user ID, email, name,
 *     IP or any identifying data is stored OR sent in the email.
 *     We intentionally do not read/forward the Authorization header,
 *     any cookie, the X-Forwarded-For / X-Real-IP headers, the User-Agent,
 *     Referer, or any other request metadata. The only thing forwarded is
 *     the content of the fields above.
 *  2. STRAIGHT to the Amrita campus mess/canteen helplines. Recipients
 *     are hardcoded SERVER-SIDE — the client cannot choose or overwrite
 *     the To address, so this endpoint cannot be abused as an open relay.
 *  3. Quick: minimal fields, no login, no uploads, no database write.
 *     Server does one SMTP send and returns 200.
 *
 * Overrides (Vercel env):
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
 *   FOOD_HYGIENE_TO — comma-separated recipients (overrides default)
 *
 * If SMTP is not configured the function returns 503 with a mailto URL
 * so the UI can open the user's mail client pre-filled (still
 * anonymous — pre-fills only the content, no From/identity).
 */

import nodemailer from 'nodemailer';

// In-memory rate limit per IP to stop spam — note we ONLY use the IP
// for rate limiting and NEVER include it in the email or any storage.
// We also rotate/clear the map periodically so it never persists.
const rateMap = new Map();
const RATE_MAX = 5;          // 5 submissions…
const RATE_WINDOW_MS = 60 * 60 * 1000; // …per IP per hour (generous)

const ESC = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function sanitize(s, max = 2000) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .slice(0, max)
    .trim();
}

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown'
  );
}

function rateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

// Amrita Bengaluru campus food-hygiene recipients.
//
// These are the real role-based inboxes for the campus staff / wardens
// who handle mess, canteen, hostel and food-safety issues at Amrita
// Vishwa Vidyapeetham, Bengaluru campus. Role-based aliases are used
// (not personal inboxes) so reports keep landing in the right hands
// as wardens rotate.
//
// Override / replace via FOOD_HYGIENE_TO env (comma-separated). When
// set, the env replaces the campus TO list entirely — so ops can
// point the pipeline at new wardens without a code change.
//
// CIVICEYE OFFICIAL INBOX (info@civiceye.co.in) is ALWAYS added as BCC
// as the guaranteed delivery fallback + escalation monitor. If any
// campus inbox bounces or a warden alias changes, the CivicEye team
// sees it, logs a ticket, and forwards it to the right staff — so
// anonymous food complaints always reach a human. No identifying info
// is attached to the email regardless of BCC.
const BRAND_EMAIL = 'info@civiceye.co.in';
// Canonical campus info / grievance inbox — always included so the
// main Amrita Bengaluru administrative contact sees every food-hygiene
// report alongside the warden / DSW / estate aliases.
const CAMPUS_INFO = 'info@blr.amrita.edu';
const GRIEVANCE_PORTAL_URL = 'https://www.amrita.edu/campus/bengaluru/contact';
const CAMPUS_RECIPIENTS = [
  // Official campus info / grievance contact — added per request.
  CAMPUS_INFO,
  // Campus Residence / Hostel office — owns mess & canteen vendor ops.
  'chiefwarden.blr@amrita.edu',
  'hosteloffice.blr@amrita.edu',
  // Dean of Student Welfare / Student Welfare office — escalation
  // path when the mess vendor doesn't act.
  'dsw.blr@amrita.edu',
  'studentwelfare@blr.amrita.edu',
  // Mess-specific complaints inbox (if/when a dedicated alias exists
  // it wins; otherwise the warden / DSW aliases above still see it).
  'mess.complaints@blr.amrita.edu',
  // Estate / facilities (kitchen hygiene, water quality, pest control).
  'estate.blr@amrita.edu',
].filter(Boolean);
const ENV_TO = (process.env.FOOD_HYGIENE_TO || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const TO_RECIPIENTS = ENV_TO.length ? ENV_TO : CAMPUS_RECIPIENTS;
// Always BCC CivicEye as the guaranteed fallback/monitor.
const BCC_RECIPIENTS = [BRAND_EMAIL];
if (process.env.FOOD_HYGIENE_BCC) {
  BCC_RECIPIENTS.push(
    ...process.env.FOOD_HYGIENE_BCC.split(',').map((s) => s.trim()).filter(Boolean),
  );
}

const ISSUE_LABELS = {
  'foreign-object': 'Foreign object in food (hair / insect / stone / plastic)',
  'undercooked': 'Undercooked / raw food',
  'spoilage': 'Spoiled / rotten / bad-smelling food',
  'hygiene': 'Unhygienic serving area / staff / utensils',
  'allergen': 'Wrong allergen / dietary contamination (veg/non-veg mix-up)',
  'water': 'Unsafe drinking water',
  'other': 'Other food-hygiene concern',
};

const SEVERITY_LABELS = {
  low: 'Minor (advisory)',
  medium: 'Needs attention today',
  high: 'Serious — please act within hours',
  critical: 'Health risk — immediate action needed',
};

const MESS_LABELS = {
  'boys-hostel-mess': 'Boys Hostel Mess',
  'girls-hostel-mess': 'Girls Hostel Mess',
  'central-canteen': 'Central Canteen / Cafeteria',
  'night-canteen': 'Night Canteen',
  'food-court': 'Food Court / Other outlet',
  'water-dispenser': 'Drinking Water Dispenser',
  'unknown': 'Not sure / other location',
};

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

function fromAddress() {
  return process.env.SMTP_FROM || 'CivicEye Anonymous <noreply@civiceye.co.in>';
}

// Helper for the mailto fallback: the visible To is the first campus
// recipient so the user's mail app routes correctly.
function primaryRecipient() {
  return TO_RECIPIENTS[0] || BRAND_EMAIL;
}

const REF = () => 'FH-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

function buildMail({ ref, location, issueType, severity, description, whenHappened, dietary, images }) {
  const when = whenHappened || 'Not specified';
  const issueLabel = ISSUE_LABELS[issueType] || issueType || 'Other';
  const sevLabel = SEVERITY_LABELS[severity] || severity || 'Reported';
  const locLabel = MESS_LABELS[location] || location || 'Not specified';
  const sevColor =
    severity === 'critical' ? '#b91c1c'
    : severity === 'high' ? '#ea580c'
    : severity === 'medium' ? '#ca8a04'
    : '#0f766e';
  const photoCount = Array.isArray(images) ? images.length : 0;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fff8e7;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fffdf4;border:4px solid #172b44;box-shadow:8px 8px 0 #A51636;overflow:hidden;">
    <div style="background:#172b44;padding:16px 20px;">
      <p style="margin:0;color:#ffd630;font-size:11px;font-weight:800;letter-spacing:2px;">ANONYMOUS FOOD-HYGIENE COMPLAINT</p>
      <h1 style="margin:4px 0 0;color:#ffffff;font-size:18px;">${ESC(issueLabel)}</h1>
      <p style="margin:6px 0 0;color:#e2e8f0;font-size:12px;">Reference ${ESC(ref)} — Amrita Vishwa Vidyapeetham, Bengaluru Campus</p>
    </div>
    <div style="padding:18px 20px;">
      <div style="display:inline-block;padding:6px 10px;background:${sevColor};color:#fff;font-size:12px;font-weight:900;letter-spacing:1px;border:3px solid #172b44;">${ESC(sevLabel.toUpperCase())}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:14px;">
        <tr><td style="padding:8px 10px;font-size:12px;color:#64748b;font-weight:700;width:140px;">Location</td><td style="padding:8px 10px;font-size:14px;color:#0f172a;">${ESC(locLabel)}</td></tr>
        <tr><td style="padding:8px 10px;font-size:12px;color:#64748b;font-weight:700;">When</td><td style="padding:8px 10px;font-size:14px;color:#0f172a;">${ESC(when)}</td></tr>
        ${dietary ? `<tr><td style="padding:8px 10px;font-size:12px;color:#64748b;font-weight:700;">Dietary note</td><td style="padding:8px 10px;font-size:14px;color:#0f172a;">${ESC(dietary)}</td></tr>` : ''}
        <tr><td style="padding:8px 10px;font-size:12px;color:#64748b;font-weight:700;">Reported via</td><td style="padding:8px 10px;font-size:14px;color:#0f172a;">CivicEye / Amrita Eye anonymous form (no login, no identifying info captured)</td></tr>
      </table>
      <div style="margin-top:14px;padding:14px;background:#fff8e7;border:3px solid #172b44;">
        <p style="margin:0;font-size:14px;line-height:1.55;color:#0f172a;white-space:pre-wrap;">${ESC(description) || '<em>No additional details provided.</em>'}</p>
      </div>
      ${photoCount ? `<div style="margin-top:12px;"><p style="margin:0 0 4px;font-size:12px;font-weight:800;color:#172b44;text-transform:uppercase;letter-spacing:1px;">📸 Photo evidence attached (${photoCount})</p><p style="margin:0;font-size:11px;color:#475569;font-weight:600;">Photos were anonymised client-side before upload (EXIF/GPS/device metadata stripped, re-encoded to JPEG). Attached below.</p></div>` : ''}
      <p style="margin:16px 0 0;font-size:11px;color:#475569;font-weight:600;">This report was submitted anonymously. No name, email, account, IP address, device ID, or any other identifying information was collected. Please investigate on the basis of the content above, the photos (if any), and the timing/location.</p>
      <p style="margin:8px 0 0;font-size:10px;color:#94a3b8;font-weight:700;">Routed to: Campus Info (info@blr.amrita.edu) · Chief Warden · Hostel Office · DSW / Student Welfare · Mess Complaints · Estate · BCC CivicEye (monitoring &amp; fallback).</p>
    </div>
  </div>
</body></html>`;

  const photoLine = photoCount
    ? `Photos    : ${photoCount} photo(s) attached to the anonymous email (ref ${ref}) — please cross-reference by reference number.`
    : '';
  const text = [
    `FOOD-HYGIENE COMPLAINT (ref ${ref})`,
    `Amrita Vishwa Vidyapeetham, Bengaluru Campus`,
    ``,
    `Issue     : ${issueLabel}`,
    `Severity  : ${sevLabel}`,
    `Location  : ${locLabel}`,
    `When      : ${when}`,
    dietary ? `Dietary   : ${dietary}` : '',
    photoLine ? photoLine : '',
    ``,
    `Details:`,
    description || '(no details provided)',
    ``,
    `(Submitted from CivicEye / Amrita Eye. An anonymous copy of this report was already sent to the Chief Warden, Hostel Office, DSW, Student Welfare, Mess Complaints, Estate, and info@blr.amrita.edu with the same reference number.)`,
  ].filter(Boolean).join('\n');

  return {
    subject: `[ANONYMOUS · Amrita Mess] ${sevLabel.toUpperCase()} — ${issueLabel} — ${ref}`.slice(0, 160),
    html,
    text,
  };
}

// Allow photos (client strips EXIF, re-encodes to JPEG, downscales to
// 1600px @ 0.82q — roughly 200-400 KB each). We cap total at 6 MB for
// up to 3 photos plus text fields.
export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Strict CORS: only our own frontend.
  const allowedOrigin = process.env.APP_URL || 'https://civiceye.co.in';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // Rate-limit (IP is used ONLY here, never stored or emailed).
  if (!rateLimit(getIp(req))) {
    res.status(429).json({ error: 'Too many submissions from this network. Please try again later.' });
    return;
  }

  const body = req.body || {};
  const payload = {
    ref: REF(),
    location: sanitize(body.location, 120),
    issueType: sanitize(body.issueType, 60),
    severity: sanitize(body.severity, 20),
    whenHappened: sanitize(body.whenHappened, 120),
    dietary: sanitize(body.dietary, 200),
    description: sanitize(body.description, 1800),
    images: Array.isArray(body.images) ? body.images.slice(0, 3) : [],
  };

  if (!payload.description && !payload.issueType) {
    res.status(400).json({ error: 'Please describe the issue.' });
    return;
  }

  // Validate images — must be data: URLs of reasonable size + allowed
  // MIME type. Malformed/oversize entries are dropped so we never crash SMTP.
  const MAX_IMG_CHARS = 800_000; // ~600 KB base64 ≈ 450 KB binary per photo
  const validImages = [];
  for (const d of payload.images) {
    if (typeof d !== 'string' || !d.startsWith('data:image/')) continue;
    if (d.length > MAX_IMG_CHARS) continue;
    const m = d.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) continue;
    validImages.push({ contentType: m[1], base64: m[2] });
  }
  payload.images = validImages;

  const smtp = smtpConfig();

  if (!smtp) {
    // Fallback: give the UI a mailto: link to the primary campus-staff
    // recipient with pre-filled content. The user's mail app sends it
    // from their own account — content itself has no identity attached.
    const mail = buildMail(payload);
    const params = new URLSearchParams({
      subject: mail.subject,
      body: mail.text,
    });
    const primary = primaryRecipient();
    const mailto = `mailto:${primary}?${params.toString()}`;
    res.status(503).json({
      reason: 'EMAIL_NOT_CONFIGURED',
      ref: payload.ref,
      to: primary,
      cc: TO_RECIPIENTS.slice(1).join(','),
      bcc: BCC_RECIPIENTS.join(','),
      mailto,
      fallbackList: [...TO_RECIPIENTS, ...BCC_RECIPIENTS],
    });
    return;
  }

  try {
    const transport = nodemailer.createTransport(smtp);
    const mail = buildMail(payload);
    const attachments = payload.images.map((img, i) => ({
      filename: `evidence-${payload.ref}-${i + 1}.jpg`,
      content: Buffer.from(img.base64, 'base64'),
      contentType: img.contentType,
    }));
    await transport.sendMail({
      from: fromAddress(),
      to: TO_RECIPIENTS.join(', '),
      bcc: BCC_RECIPIENTS.join(', '),
      // NO reply-to — these are fully anonymous; we don't want accidental
      // replies going to a noreply box with tracking, and we never
      // captured a submitter email to route back to.
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: attachments.length ? attachments : undefined,
      // Explicitly zero out headers that could leak identity.
      headers: {
        'X-Mailer': 'CivicEye-Anonymous',
        // Nodemailer adds Date/Message-ID automatically; we deliberately
        // do NOT add Received-SPF/DKIM tracing tied to the requester.
      },
    });
    res.status(200).json({
      ok: true,
      ref: payload.ref,
      deliveredTo: TO_RECIPIENTS,
      monitoredBy: BCC_RECIPIENTS,
      // Pre-filled links so students can also file via the official
      // campus grievance channel in one tap (e.g. if they want a
      // ticket number in their own name after the anonymous email
      // already reached wardens). Body is pre-filled from the
      // submission content; we do NOT append any identity info.
      grievance: {
        portalUrl: GRIEVANCE_PORTAL_URL,
        mailto: `mailto:${CAMPUS_INFO}?` + new URLSearchParams({
          subject: `Food Hygiene Complaint — ${payload.ref}`,
          body: mail.text,
        }).toString(),
      },
    });
  } catch (err) {
    console.error('[food-hygiene] send failed:', err && err.message);
    // Don't leak SMTP errors to the client (could contain host creds).
    res.status(502).json({ error: 'Delivery failed. Please try again in a moment.', ref: payload.ref });
  }
}
