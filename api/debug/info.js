export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const hasApiKey = Boolean(
    process.env.OPENCODE_API_KEY || 
    process.env.OPENROUTER_API_KEY || 
    process.env.DEEPSEEK_API_KEY ||
    process.env.LLM_API_KEY
  );

  res.status(200).json({
    requiresKey: Boolean(process.env.DEBUG_ACCESS_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_PROJECT_REF),
    hasApiKey,
    provider: process.env.OPENCODE_API_KEY ? 'opencode' : process.env.OPENROUTER_API_KEY ? 'openrouter' : process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'none',
    mockMode: process.env.MOCK_LLM === '1',
    model: process.env.LLM_DEBUG_MODEL || process.env.LLM_MODEL || 'deepseek/deepseek-chat:free',
  });
}
