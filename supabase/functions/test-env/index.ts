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

// Test POST endpoint
app.post('/', async (c) => {
  const githubToken = Deno.env.get('VITE_GITHUB_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  return c.json({
    status: 'POST Test - Environment Variables',
    method: 'POST',
    env: {
      githubTokenExists: !!githubToken,
      supabaseUrlExists: !!supabaseUrl,
      anonKeyExists: !!anonKey,
      serviceRoleKeyExists: !!serviceRoleKey,
      githubTokenLength: githubToken?.length || 0,
      supabaseUrl: supabaseUrl
    },
    timestamp: new Date().toISOString()
  });
});

Deno.serve(app.fetch);

Deno.serve(app.fetch);
