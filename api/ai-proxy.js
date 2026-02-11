import { createClient } from '@supabase/supabase-js';

const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check AI limit
    const { data: limitCheck } = await supabase.rpc('check_ai_limit', { p_user_id: user.id });
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
        model: model || DEFAULT_MODEL,
        temperature: temperature || 0.3,
        max_tokens: max_tokens || 4000,
        ...(response_format ? { response_format } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub Models API error:', response.status, errorText);
      return res.status(502).json({ error: 'AI service error', details: errorText });
    }

    const data = await response.json();

    // Increment usage counter
    await supabase.rpc('increment_ai_usage', { p_user_id: user.id });

    return res.status(200).json(data);
  } catch (error) {
    console.error('AI proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
