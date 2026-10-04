/**
 * Shared security utilities for Vercel API routes
 */

const rateMap = new Map();

export function rateLimit(ip, max, windowMs) {
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

export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.headers['x-vercel-forwarded-for'] ||
    'unknown'
  );
}

export function allowedOrigin(origin) {
  const cfg = (process.env.CIVICEYE_ORIGIN || '*').trim();
  if (cfg === '*') return '*';
  const allowed = cfg.split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) return origin;
  return null;
}

export function securityHeaders(origin) {
  const ao = allowedOrigin(origin);
  return {
    ...(ao ? { 'Access-Control-Allow-Origin': ao } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, x-debug-key, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store',
  };
}

export function sanitizeString(input, maxLen = 5000) {
  if (typeof input !== 'string') return '';
  let cleaned = input;
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.slice(0, maxLen);
  return cleaned.trim();
}

export function isValidBase64Image(str) {
  if (typeof str !== 'string') return false;
  if (str.length > 15 * 1024 * 1024) return false;
  return /^[A-Za-z0-9+/=]+$/.test(str.slice(0, 100)) || str.startsWith('data:image/');
}
