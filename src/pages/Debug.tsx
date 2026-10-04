import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { isAdminEmail } from '@/data/admins';
import { PageHeader } from '@/components/PageHeader';

type Msg = { role: 'user' | 'assistant'; content: string };
type LogRow = Record<string, unknown> & {
  timestamp?: string;
  event_message?: string;
  source?: string;
  message?: string;
  level?: string;
  ts?: string;
};

export function Debug() {
  const { user } = useAuth();
  const { brand } = useBrand();
  const isAdmin = isAdminEmail(user?.email, brand);
  const [unlocked, setUnlocked] = useState(false);
  const [requiresKey, setRequiresKey] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ hasApiKey?: boolean; supabaseConfigured?: boolean; mockMode?: boolean; provider?: string; model?: string }>({});

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState('');

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsSource, setLogsSource] = useState<'supabase' | 'vercel'>('supabase');
  const [logsMeta, setLogsMeta] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('');

  const [toast, setToast] = useState('');
  const msgsRef = useRef<HTMLDivElement>(null);

  const getKey = () => localStorage.getItem('civiceye_debug_key') || '';

  useEffect(() => {
    fetch('/api/debug/info')
      .then((r) => r.json())
      .then((info) => {
        setRequiresKey(info.requiresKey);
        setStatus(info);
        if (!info.requiresKey) setUnlocked(true);
        else if (getKey()) setUnlocked(true);
      })
      .catch(() => setRequiresKey(false));
  }, []);

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const hdrs = useCallback((): Record<string, string> => {
    const k = getKey();
    return k ? { 'Content-Type': 'application/json', 'x-debug-key': k } : { 'Content-Type': 'application/json' };
  }, []);

  const fetchLogs = async (source: 'supabase' | 'vercel') => {
    setLogsLoading(true);
    setLogsMeta('');
    try {
      const params = new URLSearchParams({
        source,
        service: serviceFilter,
        errorsOnly: '1',
        lookbackHours: '24',
        limit: '100',
      });
      const res = await fetch(`/api/debug/logs?${params.toString()}`, {
        headers: hdrs(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLogs(data.rows || []);
      setLogsMeta(`${data.source}: ${data.count} rows${data.note ? ` — ${data.note}` : ''}`);
    } catch (err) {
      setLogsMeta(`Failed: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: t }]);
    setBusy(true);
    setThinking('');

    const history = [...messages, { role: 'user', content: t } as Msg];
    const contextLogs = logs.slice(0, 20).map((l) => `[${l.timestamp || l.ts || '?'}] (${l.source || l.level || 'log'}) ${l.event_message || l.message || JSON.stringify(l).slice(0, 300)}`);

    try {
      const res = await fetch('/api/debug/chat', {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ messages: history, logs: contextLogs }),
      });
      if (res.status === 401) {
        setBusy(false);
        setToast('Unauthorized — check your debug access key.');
        return;
      }
      if (!res.ok || !res.body) {
        setBusy(false);
        setMessages((m) => [...m, { role: 'assistant', content: `Request failed HTTP ${res.status}` }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      setMessages((m) => [...m, { role: 'assistant', content: '' }]);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;
          try {
            const obj = JSON.parse(s.slice(5).trim());
            if (obj.type === 'content') {
              acc += obj.text;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            } else if (obj.type === 'reasoning') {
              setThinking((th) => th + obj.text);
            } else if (obj.type === 'error') {
              acc = obj.message || 'Error';
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Failed: ${err instanceof Error ? err.message : 'unknown'}` }]);
    } finally {
      setBusy(false);
    }
  };

  const quickFixes = [
    { label: 'Supabase RLS error', text: 'Supabase RLS error: new row violates row-level security policy for table "reports". I tried to insert with user_id ...' },
    { label: 'Roboflow 403', text: 'Roboflow proxy error 403: {"error":"FreeTierError","message":"OpenCode\'s free tier can only be used from within OpenCode"}' },
    { label: 'Vercel timeout', text: 'Vercel function timeout after 10s on /api/roboflow — payload 2MB image' },
  ];

  if (!isAdmin) {
    return (
      <div className="section-pad py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold">Developer only</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">This debug console is for verified staff. Sign in with admin account. Backend chatbot uses OpenRouter DeepSeek with real replies when OPENROUTER_API_KEY set.</p>
        <Link to="/login" className="btn-primary mt-6">Sign in as developer</Link>
      </div>
    );
  }

  if (requiresKey && !unlocked) {
    return (
      <div className="min-h-screen bg-[#0b1020] text-white p-8" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif' }}>
        <div className="max-w-md mx-auto mt-20 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-bold">Debug Access Required</h1>
          <p className="mt-2 text-sm text-white/60">Enter DEBUG_ACCESS_KEY to unlock backend chatbot</p>
          <input
            type="password"
            placeholder="Debug access key"
            className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value;
                if (val) {
                  localStorage.setItem('civiceye_debug_key', val);
                  setUnlocked(true);
                  setToast('Unlocked');
                }
              }
            }}
          />
          <p className="mt-3 text-xs text-white/40">Key stored in localStorage as civiceye_debug_key</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1020] text-[#e5e7eb] pb-20 pt-[calc(var(--nav-height)+1rem)]" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif' }}>
      <PageHeader
        eyebrow="Developer"
        title="Platform Ops — Debug Console"
        description="Backend chatbot for developers — paste Supabase / Roboflow / Vercel / LLM errors for AI diagnosis. Live logs from Supabase Management API + Vercel drain."
      >
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-bold ${status.hasApiKey ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {status.hasApiKey ? `● LLM: ${status.provider} ${status.model}` : '○ No LLM key — mock mode'}
          </span>
          <span className={`rounded-full px-3 py-1 font-bold ${status.supabaseConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
            {status.supabaseConfigured ? '● Supabase logs configured' : '○ Supabase logs not configured'}
          </span>
          {status.mockMode ? <span className="rounded-full bg-amber-500/20 px-3 py-1 font-bold text-amber-300">Mock LLM = 1</span> : null}
        </div>
      </PageHeader>

      {toast ? (
        <div className="section-pad">
          <div className="rounded-xl bg-amber-500/20 p-3 text-sm text-amber-200">{toast} <button onClick={() => setToast('')} className="ml-3 underline">Dismiss</button></div>
        </div>
      ) : null}

      <div className="section-pad mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left: chat */}
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] flex flex-col h-[calc(100vh-200px)] min-h-[520px]">
          <div ref={msgsRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="rounded-xl bg-[#0f172a] p-4 text-sm text-white/60">
                Paste a Supabase / Roboflow / Vercel / LLM error to get diagnosis. The backend bot uses <b>civicEyeBackendPrompt</b> with accuracy-first rules — it won't invent fixes.
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-[#1e3a5f] text-[#dbeafe]' : 'bg-[#0f172a] border border-[#1f2937]'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {thinking ? (
              <details className="text-xs text-white/40">
                <summary className="cursor-pointer">🧠 reasoning…</summary>
                <pre className="mt-2 whitespace-pre-wrap">{thinking}</pre>
              </details>
            ) : null}
            {busy ? <div className="text-sm text-white/40">▍ thinking…</div> : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#1f2937] p-3">
            {quickFixes.map((q) => (
              <button key={q.label} onClick={() => void send(q.text)} className="rounded-full border border-[#1f2937] bg-[#0f172a] px-3 py-1.5 text-xs font-semibold hover:bg-white/5">
                {q.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t border-[#1f2937] p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder="Paste Supabase / Roboflow / Vercel / LLM error here… Enter to send, Shift+Enter newline"
              rows={3}
              className="flex-1 resize-y rounded-xl border border-[#1f2937] bg-[#0f172a] px-4 py-3 text-xs outline-none min-h-[64px]"
            />
            <button onClick={() => void send()} disabled={busy} className="rounded-xl bg-teal-500 px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
              {busy ? '…' : 'Send'}
            </button>
          </div>
        </div>

        {/* Right: logs */}
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] flex flex-col h-[calc(100vh-200px)] min-h-[520px]">
          <div className="border-b border-[#1f2937] p-4">
            <div className="text-sm font-bold mb-3">Live logs</div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setLogsSource('supabase'); setLogs([]); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${logsSource === 'supabase' ? 'bg-teal-500 text-black' : 'bg-[#0f172a] border border-[#1f2937]'}`}>Supabase</button>
              <button onClick={() => { setLogsSource('vercel'); setLogs([]); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${logsSource === 'vercel' ? 'bg-teal-500 text-black' : 'bg-[#0f172a] border border-[#1f2937]'}`}>Vercel drain</button>
            </div>
            {logsSource === 'supabase' ? (
              <div className="flex gap-2">
                <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="flex-1 rounded-lg border border-[#1f2937] bg-[#0f172a] px-3 py-2 text-xs">
                  <option value="">All services</option>
                  <option value="edge_logs">edge_logs</option>
                  <option value="auth">auth</option>
                  <option value="postgres">postgres</option>
                  <option value="storage">storage</option>
                  <option value="realtime">realtime</option>
                  <option value="edge_functions">edge_functions</option>
                </select>
                <button onClick={() => void fetchLogs(logsSource)} disabled={logsLoading} className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-bold text-black disabled:opacity-50">
                  {logsLoading ? '…' : 'Fetch'}
                </button>
              </div>
            ) : (
              <button onClick={() => void fetchLogs('vercel')} disabled={logsLoading} className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-bold text-black">
                {logsLoading ? '…' : 'Refresh drain buffer'}
              </button>
            )}
          </div>
          <div className="border-b border-[#1f2937] p-3 text-xs text-white/40 min-h-[20px]">
            {logsMeta || (logsSource === 'vercel' ? 'Vercel logs: On Hobby plan, copy from Vercel Dashboard → Logs tab and paste into chat. Log Drains are Pro only.' : 'Supabase logs: Needs Management API PAT (sbp_...) from supabase.com/dashboard/account/tokens — NOT sb_publishable_... anon key. Project → API Keys shows publishable/secret (new) and anon/service_role (legacy) — those are for DB, not Management API. If you only see sb_publishable_... and JWT keys, go to Account → Access Tokens → Create token (sbp_...). If analytics is Pro only on your plan, just paste logs manually.')}
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1.5 font-mono text-[11px]">
            {logs.length === 0 ? <div className="p-4 text-white/30">No logs yet</div> : logs.map((l, i) => {
              const lvl = String(l.level || 'info').toLowerCase();
              const color = lvl.includes('err') || lvl.includes('fatal') ? '#f87171' : lvl.includes('warn') ? '#f59e0b' : '#14b8a6';
              return (
                <div key={i} className="rounded-lg p-2" style={{ borderLeft: `2px solid ${color}`, background: '#0f172a', marginBottom: '6px' }}>
                  <div className="text-white/40">{String(l.timestamp || l.ts || '').slice(0,19)} <span style={{ color }}>{String(l.source || l.level || 'log')}</span></div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-white/80">{String(l.event_message || l.message || '').slice(0,600)}</div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-[#1f2937] p-3">
            <button onClick={() => void send(`Analyze the ${logs.length} log entries loaded and summarize top errors with fixes.`)} disabled={busy || logs.length === 0} className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black disabled:opacity-40">
              🤖 Analyze these logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
