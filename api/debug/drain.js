/**
 * POST /api/debug/drain — Vercel Log Drain receiver
 * Point Vercel Log Drain at https://your-app/api/debug/drain
 */

let drainedLogs = [];
let seq = 0;
const MAX_LOGS = 1000;

function asRecord(v) {
  return typeof v === 'object' && v !== null ? v : null;
}

function pushLogs(entries) {
  for (const raw of entries) {
    const r = asRecord(raw);
    if (!r) continue;
    const tsRaw = r.timestamp ?? r.time ?? r.ts;
    const ts =
      typeof tsRaw === 'number'
        ? new Date(tsRaw).toISOString()
        : typeof tsRaw === 'string'
        ? tsRaw
        : new Date().toISOString();

    drainedLogs.push({
      id: ++seq,
      ts,
      source: String(r.source ?? r.type ?? 'vercel'),
      level: String(r.level ?? r.logType ?? r.severity ?? 'info'),
      message: String(r.message ?? r.text ?? r.event ?? JSON.stringify(raw).slice(0, 1000)),
      raw,
    });
  }
  if (drainedLogs.length > MAX_LOGS) {
    drainedLogs.splice(0, drainedLogs.length - MAX_LOGS);
  }
  return drainedLogs.length;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const SECRET = process.env.VERCEL_DRAIN_SECRET || '';
  if (SECRET) {
    const auth = req.headers.authorization || '';
    if (!auth.includes(SECRET)) {
      res.status(401).send('Unauthorized');
      return;
    }
  }

  const contentType = req.headers['content-type'] || '';
  let entries = [];

  if (contentType.includes('ndjson')) {
    const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    entries = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } else {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    entries = Array.isArray(body) ? body : [body];
  }

  const count = pushLogs(entries);
  res.status(200).json({ received: count });
}

// Export for logs.js to use (shared in-memory)
export function getDrainedLogs(limit = 100) {
  return drainedLogs.slice(-limit).reverse();
}

export function drainedLogsCount() {
  return drainedLogs.length;
}
