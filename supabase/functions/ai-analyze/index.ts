import { Hono } from 'https://esm.sh/hono@4.6.15';
import { requireAuth, getErrorMessage } from '../_shared/utils.ts';

const app = new Hono();

// Simple CORS headers
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Headers', '*');
  c.header('Access-Control-Allow-Methods', '*');
  await next();
});

// Simple test endpoint - no auth required
app.get('/', (c) => {
  return c.json({
    status: 'Supabase Edge Function is running',
    message: 'Environment variables test',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for environment variables - no auth required
app.get('/test-env', (c) => {
  const githubToken = Deno.env.get('VITE_GITHUB_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  return c.json({
    status: 'testing environment variables',
    env: {
      githubTokenExists: !!githubToken,
      supabaseUrlExists: !!supabaseUrl,
      anonKeyExists: !!anonKey,
      githubTokenLength: githubToken?.length || 0,
      supabaseUrl: supabaseUrl
    },
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for environment variables
app.get('/env', (c) => {
  const githubToken = Deno.env.get('VITE_GITHUB_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  return c.json({
    status: 'testing environment variables',
    env: {
      githubTokenExists: !!githubToken,
      supabaseUrlExists: !!supabaseUrl,
      anonKeyExists: !!anonKey,
      githubTokenLength: githubToken?.length || 0,
      supabaseUrl: supabaseUrl
    },
    timestamp: new Date().toISOString()
  });
});

// AI Analysis with GitHub Models
app.post('/', async (c) => {
  try {
    // Debug: Check environment variables
    const githubToken = Deno.env.get('VITE_GITHUB_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    console.log('Debug - GitHub Token exists:', !!githubToken);
    console.log('Debug - Supabase URL:', supabaseUrl);

    // Skip auth for testing
    const userId = 'test-user-id';

    const { symptoms, truckModel, audioTranscript, audioAnalysis } = await c.req.json();

    let prompt = `You are a truck diagnostic AI expert helping a truck driver on the road.

Truck Model: ${truckModel || 'Unknown'}
Symptoms/Issues: ${symptoms || audioTranscript}`;

    // Add audio analysis context if available
    if (audioAnalysis) {
      prompt += `

AUDIO ANALYSIS RESULTS:
- Component Detected: ${audioAnalysis.component}
- Failure Type: ${audioAnalysis.failure_type}
- Confidence: ${Math.round(audioAnalysis.confidence * 100)}%
- Severity: ${audioAnalysis.severity}
- Anomaly Score: ${audioAnalysis.anomaly_score}`;
    }

    prompt += `

Provide comprehensive diagnostic analysis with:
1. Most likely cause (consider audio analysis if provided)
2. Urgency level (Low/Medium/High/Critical)
3. Can driver continue safely? (Yes/No with detailed explanation)
4. Immediate actions to take
5. Estimated repair cost range with parts breakdown
6. Whether this needs professional help or driver can fix
7. Safety warnings and precautions

Keep response practical and emergency-focused for a driver stranded on the road.`;

    // Call GitHub Models API
    const response = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('VITE_GITHUB_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: prompt }
        ],
        model: 'xai/grok-3',
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('GitHub Models API error:', response.status, errorText);
      return c.json({ error: `AI analysis failed: ${response.status} - ${errorText}` }, 500);
    }

    const result = await response.json();

    if (!result.choices || !result.choices[0] || !result.choices[0].message || !result.choices[0].message.content) {
      console.log('Invalid response format from GitHub Models API:', result);
      return c.json({ error: 'Invalid response format from AI service' }, 500);
    }

    const analysis = result.choices[0].message.content;

    return c.json({
      success: true,
      debug: {
        githubTokenExists: !!githubToken,
        supabaseUrl,
        userId
      },
      analysis: {
        aiResponse: analysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

Deno.serve(app.fetch);
