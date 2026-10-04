/**
 * Vercel serverless function — "Report Resolved" thank-you email.
 *
 * POST /api/report-resolved
 * Body:
 *   {
 *     report: {
 *       id, code?, title, description, category, severity,
 *       locationName?, coordinates?, image?, url?,
 *       author?, reporterEmail, resolvedAt?, resolverName?
 *     }
 *   }
 *
 * Called by the authorities dashboard (or a Supabase webhook/cron in future)
 * after a report is marked resolved. Sends a thank-you email to the original
 * reporter crediting them for helping keep the city safe.
 *
 * Same SMTP config and rate-limit as api/report-authority.js.
 */

import nodemailer from 'nodemailer';

const BRAND_EMAIL = 'info@civiceye.co.in';
function fromAddress() {
  return process.env.SMTP_FROM || `CivicEye <${BRAND_EMAIL}>`;
}

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

function originFromReq(req) {
  const host = (process.env.APP_URL || '').replace(/https?:\/\//, '')
    || req.headers['x-forwarded-host']
    || req.headers.host
    || 'civiceye.co.in';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

function buildThanksEmail({ report, origin }) {
  origin = origin || 'https://civiceye.co.in';
  const appName = report.scope === 'campus' ? 'Amrita Eye' : 'CivicEye';
  const brandColor = report.scope === 'campus' ? '#A51636' : '#4f46e5';
  const reporterName = report.author || 'Citizen';
  const code = report.code || report.id || '';
  const reportUrl = report.url || (report.id ? `${origin}/report/${report.id}` : origin);
  const resolvedAt = report.resolvedAt
    ? new Date(report.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const resolver = report.resolverName || 'the concerned authority';

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f0fdf4;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #bbf7d0;box-shadow:0 8px 24px rgba(16,185,129,0.08);">
    <div style="background:linear-gradient(135deg,${brandColor},#10b981);padding:28px 24px;text-align:center;">
      <div style="font-size:36px;line-height:1;">🎉</div>
      <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:800;">Your report was fixed!</h1>
      <p style="margin:6px 0 0;color:#ffffff;font-size:14px;opacity:0.9;">Thank you for helping keep the city safe.</p>
    </div>
    <div style="padding:28px 24px;color:#0f172a;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Hi <strong>${esc(reporterName)}</strong>,
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
        Great news — your report <strong>${esc(report.title)}</strong>${code ? ` (<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;">${esc(code)}</code>)` : ''}
        was marked resolved by ${esc(resolver)} on <strong>${esc(resolvedAt)}</strong>.
      </p>

      <div style="margin:0 0 20px;padding:16px;background:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#065f46;">
          🙏 You made a real difference. Civic issues only get fixed when people like you speak up —
          and your report helped the team prioritise and resolve this issue for everyone in
          ${esc(report.locationName || 'your neighbourhood')}.
        </p>
      </div>

      <div style="margin:0 0 20px;padding:16px;background:#f8fafc;border-radius:8px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Issue</p>
        <p style="margin:0;font-size:14px;font-weight:600;">${esc(report.title)}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${esc(report.locationName || '')}</p>
      </div>

      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
        You can view the resolution, before/after proof, and leave feedback on your report page:
      </p>

      <p style="margin:0 0 24px;text-align:center;">
        <a href="${esc(reportUrl)}" style="display:inline-block;padding:12px 24px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
          View your report →
        </a>
      </p>

      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">
        See something else that needs fixing? Every report counts:
      </p>
      <p style="margin:0 0 24px;">
        <a href="${esc(origin)}/report" style="display:inline-block;padding:10px 18px;background:#f1f5f9;color:#0f172a;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
          Report another issue
        </a>
      </p>

      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        Thanks again for being a civic changemaker. 💚<br/>
        — The ${esc(appName)} Team
      </p>
    </div>
    <div style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
      You're receiving this because you submitted a report on ${esc(appName)} (${esc(origin)}).<br/>
      Questions? Reply to this email or write to <a href="mailto:info@civiceye.co.in" style="color:#64748b;">info@civiceye.co.in</a>.
    </div>
  </div>
</body></html>`;

  const text = [
    `🎉 Your report was fixed! — ${appName}`,
    ``,
    `Hi ${reporterName},`,
    ``,
    `Your report "${report.title}"${code ? ` (${code})` : ''} was marked resolved by ${resolver} on ${resolvedAt}.`,
    ``,
    `Thank you for helping keep the city safe. Your report made a real difference for ${report.locationName || 'your neighbourhood'}.`,
    ``,
    `View your report: ${reportUrl}`,
    `Report another issue: ${origin}/report`,
    ``,
    `— The ${appName} Team`,
    `  ${origin} · info@civiceye.co.in`,
  ].join('\n');

  return {
    subject: `[${appName}] 🎉 Your report was fixed — ${report.title}`.slice(0, 160),
    html,
    text,
  };
}

// Allow small payloads (no big photos on this email — we only link out).
export const config = { api: { bodyParser: { sizeLimit: '256kb' } } };

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown';
  if (!rateLimit(ip, 20, 60_000)) {
    res.status(429).json({ error: 'Too many requests.' });
    return;
  }

  // Require an internal shared secret so the public can't spam arbitrary
  // citizens. The dashboard sets this header from a build-time env var. If
  // the secret is not configured the endpoint stays disabled (fail-closed).
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ reason: 'EMAIL_WEBHOOK_SECRET_NOT_CONFIGURED' });
    return;
  }
  const provided = req.headers['x-webhook-secret'] || '';
  if (provided !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const raw = req.body || {};
  const report = raw.report || {};
  const reporterEmail = String(report.reporterEmail || '').trim().toLowerCase();

  // Basic email shape validation.
  if (!reporterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
    res.status(400).json({ error: 'report.reporterEmail must be a valid email address.' });
    return;
  }
  if (!report.title) {
    res.status(400).json({ error: 'report.title is required.' });
    return;
  }

  const smtp = smtpConfig();
  if (!smtp) {
    res.status(503).json({ reason: 'EMAIL_NOT_CONFIGURED' });
    return;
  }

  try {
    const transport = nodemailer.createTransport(smtp);
    const origin = originFromReq(req);
    const mail = buildThanksEmail({ report, origin });

    await transport.sendMail({
      from: fromAddress(),
      to: reporterEmail,
      replyTo: BRAND_EMAIL,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    res.status(200).json({ ok: true, to: reporterEmail });
  } catch (err) {
    console.error('[report-resolved] send failed:', err);
    res.status(502).json({ error: 'Email delivery failed.' });
  }
}
