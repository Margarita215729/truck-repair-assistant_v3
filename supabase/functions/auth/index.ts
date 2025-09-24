import { Hono } from 'https://esm.sh/hono@4.6.15';
import { requireAuth, getErrorMessage, supabase } from '../_shared/utils.ts';

const app = new Hono();

// Simple CORS headers
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Headers', '*');
  c.header('Access-Control-Allow-Methods', '*');
  await next();
});

// User signup
app.post('/', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({
      success: true,
      user: data.user,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

Deno.serve(app.fetch);
