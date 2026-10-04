/**
 * GET /api/debug/logs?source=supabase|vercel
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

function getDrainedLogs(limit = 100) {
  return drainedLogs.slice(-limit).reverse();
}

function drainedLogsCount() {
  return drainedLogs.length;
}

async function fetchSupabaseLogs({ accessToken, projectRef, lookbackHours = 24, limit = 100, service, errorsOnly = true }) {
  const now = new Date();
  const start = new Date(now.getTime() - Math.max(1, lookbackHours) * 3600_000);

  const where = [];
  if (service) {
    where.push(`source = '${service.replace(/[^a-zA-Z0-9_]/g, "")}'`);
  }
  if (errorsOnly) {
    where.push(`toInt32OrZero(log_attributes['response.status_code']) >= 400`);
  }

  const sql =
    `select timestamp, event_message, source, log_attributes from logs` +
    (where.length ? ` where ${where.join(" and ")}` : "") +
    ` order by timestamp desc limit ${Math.min(Math.max(1, limit), 1000)}`;

  const params = new URLSearchParams({
    sql,
    iso_timestamp_start: start.toISOString(),
    iso_timestamp_end: now.toISOString(),
  });

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/analytics/endpoints/logs?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Management API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return Array.isArray(json) ? json : (json.result ?? []);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ACCESS_KEY = process.env.DEBUG_ACCESS_KEY || '';
  if (ACCESS_KEY) {
    const provided = req.headers['x-debug-key'] || '';
    if (provided !== ACCESS_KEY) {
      res.status(401).json({ error: 'Unauthorized — wrong or missing debug access key.' });
      return;
    }
  }

  const source = req.query.source || 'supabase';

  try {
    if (source === 'supabase') {
      const token = process.env.SUPABASE_ACCESS_TOKEN;
      const ref = process.env.SUPABASE_PROJECT_REF;
      if (!token || !ref) {
        res.status(400).json({
          error: 'Supabase live logs not configured. Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF',
        });
        return;
      }
      const rows = await fetchSupabaseLogs({
        accessToken: token,
        projectRef: ref,
        service: req.query.service || undefined,
        errorsOnly: req.query.errorsOnly !== '0',
        lookbackHours: Number(req.query.lookbackHours || '24') || 24,
        limit: Number(req.query.limit || '100') || 100,
      });
      res.status(200).json({ source: 'supabase', count: rows.length, rows });
      return;
    }

    if (source === 'vercel') {
      res.status(200).json({
        source: 'vercel',
        count: drainedLogsCount(),
        note: 'These logs were PUSHED here by a Vercel Log Drain (configure one to point at /api/debug/drain). On serverless, this buffer is per-instance and ephemeral.',
        rows: getDrainedLogs(200),
      });
      return;
    }

    res.status(400).json({ error: `Unknown source "${source}". Use supabase or vercel.` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch logs.' });
  }
}
