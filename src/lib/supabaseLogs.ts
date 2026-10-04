/**
 * Fetch Supabase logs via Management API
 */

export interface SupabaseLogRow {
  timestamp: string;
  event_message: string;
  source?: string;
  log_attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FetchSupabaseLogsOptions {
  accessToken: string;
  projectRef: string;
  lookbackHours?: number;
  limit?: number;
  service?: string;
  errorsOnly?: boolean;
}

export async function fetchSupabaseLogs(
  opts: FetchSupabaseLogsOptions
): Promise<SupabaseLogRow[]> {
  const {
    accessToken,
    projectRef,
    lookbackHours = 24,
    limit = 100,
    service,
    errorsOnly = true,
  } = opts;

  const now = new Date();
  const start = new Date(now.getTime() - Math.max(1, lookbackHours) * 3600_000);

  const where: string[] = [];
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
    throw new Error(
      `Supabase Management API error ${res.status}: ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as
    | SupabaseLogRow[]
    | { result?: SupabaseLogRow[] };

  return Array.isArray(json) ? json : (json.result ?? []);
}
