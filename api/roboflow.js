/**
 * Vercel serverless function — Roboflow proxy (working version)
 * Fixes NetworkError by adding 8s timeout to avoid Hobby 10s kill
 */

const WORKFLOW_BASE = 'https://serverless.roboflow.com';
const DETECT_BASE = 'https://detect.roboflow.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const apiKey =
    process.env.ROBOFLOW_API_KEY ||
    process.env.VITE_ROBOFLOW_API_KEY ||
    req.body?.api_key ||
    '';

  const workspace =
    process.env.ROBOFLOW_WORKSPACE ||
    process.env.VITE_ROBOFLOW_WORKSPACE ||
    'aswathram-kumar';
  const workflowId =
    process.env.ROBOFLOW_WORKFLOW_ID ||
    process.env.VITE_ROBOFLOW_WORKFLOW_ID ||
    'civiceye-pothole-reporting-starter-1786336062967';
  const model = req.body?.model?.trim() || '';
  const image = req.body?.image;

  if (!image) {
    res.status(400).json({ error: '`image` (base64) is required.' });
    return;
  }

  if (image.length > 12 * 1024 * 1024) {
    res.status(413).json({ error: 'Image too large. Max ~8MB base64.' });
    return;
  }

  let target;
  let payload;
  if (model) {
    target = `${DETECT_BASE}/${model.replace(/^\/+/, '')}?api_key=${encodeURIComponent(apiKey)}`;
    payload = JSON.stringify({ image });
  } else {
    target = `${WORKFLOW_BASE}/${encodeURIComponent(workspace)}/workflows/${encodeURIComponent(workflowId)}`;
    payload = JSON.stringify({
      api_key: apiKey,
      inputs: { image: { type: 'base64', value: image } },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const rf = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const text = await rf.text();
    res.status(rf.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    const isAbort = err.name === 'AbortError';
    console.error('[roboflow proxy] error:', err.message);
    res.status(isAbort ? 504 : 502).json({ 
      error: `Roboflow proxy failed: ${err?.message ?? err}`,
      hint: isAbort ? 'Timeout after 8s — Vercel Hobby limit 10s, workflow may be slow. Will fallback to on-device AI with exact outline.' : 'Check ROBOFLOW_API_KEY in Vercel env, or will fallback to exact outline mock',
      fallback: true
    });
  }
}
