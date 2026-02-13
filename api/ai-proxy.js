import { createClient } from '@supabase/supabase-js';

const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const ALLOWED_MODELS = new Set(['openai/gpt-4o-mini', 'openai/gpt-4o']);
const MAX_MESSAGES = 50;
const MAX_TOKENS_LIMIT = 4096;

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check AI limit
    const { data: limitCheck } = await getSupabase().rpc('check_ai_limit', { p_user_id: user.id });
    if (limitCheck && !limitCheck.allowed) {
      return res.status(429).json({
        error: 'Daily AI request limit reached',
        limit: limitCheck,
      });
    }

    const { messages, model, temperature, max_tokens, response_format } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing messages array' });
    }

    // Input validation
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Too many messages (max ${MAX_MESSAGES})` });
    }

    // Validate model against allowlist
    const safeModel = (model && ALLOWED_MODELS.has(model)) ? model : DEFAULT_MODEL;
    const safeMaxTokens = Math.min(Number(max_tokens) || 4000, MAX_TOKENS_LIMIT);
    const safeTemperature = Math.max(0, Math.min(Number(temperature) || 0.3, 2));

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // Call GitHub Models API
    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: safeModel,
        temperature: safeTemperature,
        max_tokens: safeMaxTokens,
        ...(response_format ? { response_format } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub Models API error:', response.status, errorText);
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await response.json();

    // Increment usage counter (await to ensure it completes)
    try {
      await getSupabase().rpc('increment_ai_usage', { p_user_id: user.id });
    } catch (usageErr) {
      console.warn('Failed to increment AI usage:', usageErr);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('AI proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
