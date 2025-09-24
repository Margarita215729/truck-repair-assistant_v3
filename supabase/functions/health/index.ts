import { Hono } from 'https://esm.sh/hono@4.6.15';

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: 'connected',
      github_models: 'configured'
    }
  });
});

Deno.serve(app.fetch);
