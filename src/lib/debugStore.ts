/**
 * In-memory store for Vercel logs + rate limiter for debug APIs
 * Ephemeral per serverless instance - fine for debug view
 */
export interface StoredLog {
  id: number;
  ts: string;
  source: string;
  level: string;
  message: string;
  raw: unknown;
}

const MAX_LOGS = 1000;
let seq = 0;
const drainedLogs: StoredLog[] = [];

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

export function pushLogs(entries: unknown[]): number {
  for (const raw of entries) {
    const r = asRecord(raw);
    if (!r) continue;
    const tsRaw = r.timestamp ?? r.time ?? r.ts;
    const ts =
      typeof tsRaw === "number"
        ? new Date(tsRaw).toISOString()
        : typeof tsRaw === "string"
        ? tsRaw
        : new Date().toISOString();

    drainedLogs.push({
      id: ++seq,
      ts,
      source: String(r.source ?? r.type ?? "vercel"),
      level: String(r.level ?? r.logType ?? r.severity ?? "info"),
      message: String(
        r.message ?? r.text ?? r.event ?? JSON.stringify(raw).slice(0, 1000)
      ),
      raw,
    });
  }
  if (drainedLogs.length > MAX_LOGS) {
    drainedLogs.splice(0, drainedLogs.length - MAX_LOGS);
  }
  return drainedLogs.length;
}

export function getDrainedLogs(limit = 100): StoredLog[] {
  return drainedLogs.slice(-limit).reverse();
}

export function drainedLogsCount(): number {
  return drainedLogs.length;
}

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}
