import { createClient } from '@supabase/supabase-js';

const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const ALLOWED_MODELS = new Set(['openai/gpt-4o-mini', 'openai/gpt-4o']);
const MAX_MESSAGES = 50;
const MAX_TOKENS_LIMIT = 16384;
const FREE_DAILY_LIMIT = 5;

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

    // Check usage limit (direct query — service role cannot use auth.uid()-based RPCs)
    const { data: sub } = await getSupabase()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single();

    const isPro = sub && ['pro', 'lifetime', 'owner', 'fleet'].includes(sub.plan)
      && ['active', 'trialing'].includes(sub.status);

    if (!isPro) {
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await getSupabase()
        .from('usage_tracking')
        .select('ai_requests_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      const used = usage?.ai_requests_count || 0;
      if (used >= FREE_DAILY_LIMIT) {
        return res.status(429).json({
          error: 'Daily request limit reached',
          limit: { allowed: false, plan: sub?.plan || 'free', used, limit: FREE_DAILY_LIMIT, remaining: 0 },
        });
      }
    }

    const { messages, model, temperature, max_tokens, response_format } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing messages array' });
    }

    // Input validation
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Too many messages (max ${MAX_MESSAGES})` });
    }

    // Sanitize message roles — only allow 'user' and 'assistant' from client
    const ALLOWED_ROLES = new Set(['user', 'assistant']);
    const sanitizedMessages = messages
      .filter(m => m && typeof m === 'object' && ALLOWED_ROLES.has(m.role) && m.content != null)
      .map(m => ({ role: m.role, content: m.content }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({ error: 'No valid messages after sanitization' });
    }

    // Validate response_format — only allow known types
    const ALLOWED_RESPONSE_FORMATS = new Set(['json_object', 'text']);
    const safeResponseFormat = response_format && ALLOWED_RESPONSE_FORMATS.has(response_format?.type)
      ? { type: response_format.type } : undefined;

    // Validate model against allowlist
    const safeModel = (model && ALLOWED_MODELS.has(model)) ? model : DEFAULT_MODEL;
    const safeMaxTokens = Math.min(Number(max_tokens) || 4000, MAX_TOKENS_LIMIT);
    const safeTemperature = Math.max(0, Math.min(Number(temperature) || 0.3, 2));

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_TOKEN environment variable is not set');
      return res.status(500).json({ error: 'Diagnostic service not configured' });
    }

    // Call GitHub Models API
    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: sanitizedMessages,
        model: safeModel,
        temperature: safeTemperature,
        max_tokens: safeMaxTokens,
        ...(safeResponseFormat ? { response_format: safeResponseFormat } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub Models API error:', response.status, errorText);

      // Parse the upstream error for an actionable detail
      let detail = 'Diagnostic service temporarily unavailable';
      try {
        const errObj = JSON.parse(errorText);
        const msg = errObj?.error?.message || errObj?.message || '';
        if (response.status === 401 || response.status === 403) {
          detail = 'GitHub token is invalid or lacks Models API access. Check GITHUB_TOKEN.';
        } else if (response.status === 404) {
          detail = `Model "${safeModel}" not found on GitHub Models. It may have been deprecated.`;
        } else if (response.status === 429) {
          detail = 'GitHub Models rate limit exceeded. Please try again in a moment.';
        } else if (msg) {
          detail = msg.slice(0, 200);
        }
      } catch { /* not JSON */ }

      return res.status(502).json({ error: detail, upstream_status: response.status });
    }

    const data = await response.json();

    // Increment usage counter (direct query — service role cannot use auth.uid()-based RPCs)
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: cur } = await getSupabase()
        .from('usage_tracking')
        .select('ai_requests_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      const newCount = (cur?.ai_requests_count || 0) + 1;
      await getSupabase()
        .from('usage_tracking')
        .upsert(
          { user_id: user.id, date: today, ai_requests_count: newCount },
          { onConflict: 'user_id,date' }
        );
    } catch (usageErr) {
      console.warn('Failed to increment usage:', usageErr);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Diagnostic proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
