/**
 * POST /api/debug/chat — Backend debug assistant for developers
 * Uses civicEyeBackendPrompt, reasoning, 16 history, 40 logs context
 */

function getEnv(name) {
  return (process.env[name] || '').trim();
}

function getLlmConfig() {
  const genericBase = getEnv('LLM_BASE_URL');
  if (genericBase) {
    return {
      provider: 'custom',
      baseUrl: genericBase.replace(/\/+$/, ''),
      apiKey: getEnv('LLM_API_KEY') || getEnv('DEEPSEEK_API_KEY') || getEnv('OPENCODE_API_KEY') || getEnv('OPENROUTER_API_KEY'),
      model: getEnv('LLM_MODEL') || 'deepseek/deepseek-chat:free',
      debugModel: getEnv('LLM_DEBUG_MODEL') || 'deepseek/deepseek-chat:free',
      fallbacks: ['meta-llama/llama-3.1-8b-instruct:free'],
      extraHeaders: {},
    };
  }
  if (getEnv('OPENCODE_API_KEY')) {
    return {
      provider: 'opencode',
      baseUrl: 'https://opencode.ai/zen/v1',
      apiKey: getEnv('OPENCODE_API_KEY'),
      model: getEnv('LLM_MODEL') || 'deepseek/deepseek-chat:free',
      debugModel: getEnv('LLM_DEBUG_MODEL') || 'deepseek/deepseek-chat:free',
      fallbacks: ['meta-llama/llama-3.1-8b-instruct:free'],
      extraHeaders: {},
    };
  }
  if (getEnv('OPENROUTER_API_KEY')) {
    return {
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: getEnv('OPENROUTER_API_KEY'),
      model: getEnv('LLM_MODEL') || 'deepseek/deepseek-chat:free',
      debugModel: getEnv('LLM_DEBUG_MODEL') || 'deepseek/deepseek-r1:free',
      fallbacks: [],
      extraHeaders: {
        'HTTP-Referer': getEnv('LLM_HTTP_REFERER') || 'https://civiceye.co.in',
        'X-Title': getEnv('LLM_X_TITLE') || 'CivicEye Debug',
      },
    };
  }
  return {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: getEnv('DEEPSEEK_API_KEY'),
    model: getEnv('LLM_MODEL') || 'deepseek/deepseek-chat:free',
    debugModel: getEnv('LLM_DEBUG_MODEL') || 'deepseek/deepseek-r1:free',
    fallbacks: [],
    extraHeaders: {},
  };
}

function civicEyeBackendPrompt(extraContext) {
  const extra = extraContext?.trim();
  return [
    `You are the CivicEye Platform Engineer — a rigorous, no-nonsense debugging assistant.`,
    ``,
    `YOUR #1 RULE: ACCURACY OVER COMPLETENESS. Never bullshit. If you are not sure, say so.`,
    ``,
    `HARD RULES:`,
    `- Only state something as fact if you are confident it is correct.`,
    `- NEVER invent or guess: error text, exact URLs, rate limits, pricing, env-var names, config keys, SDK/API names, or fixes.`,
    `- If the pasted input doesn't contain enough information to diagnose, do NOT make up a diagnosis. Ask for exactly what's missing.`,
    `- When unsure about a specific number, say "check the official docs / dashboard" instead of quoting a number.`,
    `- Clearly separate: (a) what the error message actually says, (b) what you know for sure, (c) possibilities worth investigating.`,
    `- Only give a fix you are confident applies; otherwise give a short checklist of things to verify.`,
    `- Be concise and specific. No filler, no generic advice.`,
    ``,
    `This chat server uses Vercel serverless. Main CivicEye website is React + Vite, separate from chatbot. Relevant services: Supabase, CivicLENS AI, Vercel, OpenRouter/DeepSeek.`,
    ``,
    `RESPONSE FORMAT (when given concrete error):`,
    `1. WHAT IT MEANS — 1-2 lines`,
    `2. LIKELY ROOT CAUSE — only if confident; otherwise "Not enough info — I need: ..."`,
    `3. FIX — numbered, concrete, testable steps`,
    `4. VERIFY / PREVENT — how to confirm fixed and prevent recurrence`,
    ``,
    `If nothing pasted, ask which service failed and request exact error text.`,
    extra ? `\nADDITIONAL CONTEXT:\n${extra}` : ``,
  ].filter(Boolean).join('\n');
}

// Simple rate limit
const rateMap = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateMap.set(key, { count: 1, start: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

async function streamLLM({ model, messages, apiKey, baseUrl, extraHeaders, thinking = false, maxTokens = 2048, temperature = 0.6 }, onChunk) {
  const body = {
    model,
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
  };

  if (thinking) {
    body.reasoning_effort = 'high';
  }

  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let detail = '';
    try {
      const j = JSON.parse(text);
      detail = j?.error?.message || j?.error || text.slice(0, 400);
    } catch {
      detail = text.slice(0, 400);
    }
    if (/FreeTierError|only be used from within OpenCode/i.test(detail)) {
      throw new Error(`FreeTierError: ${detail} — OpenCode free tier blocked for standalone use, use OpenRouter`);
    }
    if (/model.*not supported|not found|unavailable/i.test(detail)) {
      const err = new Error(`Model unavailable: ${detail}`);
      err.retryableModel = true;
      throw err;
    }
    throw new Error(`LLM error ${res.status}: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta || {};
        const reasoning = delta.reasoning_content || delta.reasoning || '';
        const content = delta.content || '';
        if (reasoning) onChunk({ type: 'reasoning', text: reasoning });
        if (content) onChunk({ type: 'content', text: content });
      } catch {
        // ignore
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || 'unknown';
  if (!rateLimit(`debug:${ip}`, 30, 60_000)) {
    res.status(429).json({ error: 'Too many requests. Wait a minute.' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    body = req.body;
  }

  const messages = (body?.messages || []).filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'));
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Expected conversation ending with user message' });
    return;
  }

  const logsText = (body?.logs || []).slice(0, 40).map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n');

  let system = civicEyeBackendPrompt(process.env.CIVICEYE_EXTRA_CONTEXT);
  if (logsText.trim()) {
    system += `\n\nLIVE LOG CONTEXT (most recent first):\n${logsText}`;
  }

  const CFG = getLlmConfig();
  const MOCK = process.env.MOCK_LLM === '1';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    if (!CFG.apiKey || MOCK) {
      const mockText = `⚙️ Fixed demo reply — mock mode is enabled or no LLM API key is configured.\n\nLive analysis requires a configured key and provider permission for standalone API use. Set OPENROUTER_API_KEY or DEEPSEEK_API_KEY + LLM_DEBUG_MODEL in Vercel env vars.\n\nTry pasting a real error, or click "Fetch Supabase logs" once SUPABASE_ACCESS_TOKEN is set.`;
      for (const word of mockText.split(/(\s+)/)) {
        send({ type: 'content', text: word });
        await new Promise((r) => setTimeout(r, 10));
      }
    } else {
      const history = messages.slice(-16);
      const models = [CFG.debugModel, ...CFG.fallbacks];
      let emitted = false;
      let lastErr = null;
      for (const model of models) {
        try {
          await streamLLM(
            {
              model,
              messages: [{ role: 'system', content: system }, ...history],
              apiKey: CFG.apiKey,
              baseUrl: CFG.baseUrl,
              extraHeaders: CFG.extraHeaders,
              thinking: CFG.provider === 'deepseek' || /pro/i.test(model),
              maxTokens: 2048,
            },
            (chunk) => {
              if (chunk.type === 'reasoning' || chunk.type === 'content') emitted = true;
              send(chunk);
            }
          );
          break;
        } catch (err) {
          lastErr = err;
          if (emitted) throw err;
          if (!err.retryableModel) throw err;
        }
      }
      if (lastErr && !emitted) throw lastErr;
    }
    send({ type: 'done' });
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong' });
  } finally {
    res.end();
  }
}
