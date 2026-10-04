/**
 * Security patches for CivicEye / Amrita Eye
 */

export function sanitizeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeInput(input: string): string {
  let cleaned = String(input);
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*[^\s>]+/gi, '');
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, '');
  cleaned = cleaned.slice(0, 5000);
  return cleaned.trim();
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024;
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type ${file.type}. Only JPEG, PNG, WebP allowed.` };
  }
  if (file.size > maxSize) {
    return { valid: false, error: `File too large ${Math.round(file.size/1024/1024)}MB. Max 10MB.` };
  }
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: `Invalid extension ${ext}` };
  }
  return { valid: true };
}

export function validateImageDataUrl(dataUrl: string): { valid: boolean; error?: string } {
  if (!dataUrl.startsWith('data:image/')) {
    return { valid: false, error: 'Not an image data URL' };
  }
  const allowedPrefixes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];
  if (!allowedPrefixes.some((p) => dataUrl.startsWith(p))) {
    return { valid: false, error: 'Invalid image format in data URL' };
  }
  const maxDataUrlLength = 14 * 1024 * 1024;
  if (dataUrl.length > maxDataUrlLength) {
    return { valid: false, error: 'Image data URL too large' };
  }
  return { valid: true };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self)',
  };
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export interface AuditLog {
  action: string;
  userId?: string;
  reportId?: string;
  timestamp: string;
  ip?: string;
  details?: string;
}

const auditLogs: AuditLog[] = [];
const MAX_AUDIT_LOGS = 500;

export function logAudit(action: string, details: { userId?: string; reportId?: string; details?: string }) {
  auditLogs.push({
    action,
    userId: details.userId,
    reportId: details.reportId,
    timestamp: new Date().toISOString(),
    details: details.details,
  });
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.splice(0, auditLogs.length - MAX_AUDIT_LOGS);
  }
  console.log(`[AUDIT] ${action}`, details);
}

export function getAuditLogs(): AuditLog[] {
  return [...auditLogs].reverse();
}

export function containsSuspiciousContent(input: string): boolean {
  const suspicious = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /document\.write/i,
    /innerHTML/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  return suspicious.some((pattern) => pattern.test(input));
}

export function secureRandomId(prefix = '', length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
