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

// Save diagnostic
app.post('/', async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const diagnosticData = await c.req.json();

    const { data, error } = await supabase
      .from('diagnostics')
      .insert([{
        user_id: userId,
        truck_make: diagnosticData.truckMake,
        truck_model: diagnosticData.truckModel,
        symptoms: diagnosticData.symptoms,
        error_code: diagnosticData.errorCode,
        audio_analysis: diagnosticData.audioAnalysis,
        diagnostic_result: diagnosticData,
        cost_estimate: diagnosticData.costEstimate || 0
      }])
      .select();

    if (error) {
      console.error('Database error:', error);
      return c.json({ error: 'Failed to save diagnostic' }, 500);
    }

    return c.json({
      success: true,
      diagnostic: data[0]
    });

  } catch (error) {
    console.error('Diagnostics save error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// Get diagnostic history
app.get('/diagnostics/history', async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data, error } = await supabase
      .from('diagnostics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return c.json({ error: 'Failed to load diagnostic history' }, 500);
    }

    return c.json({
      success: true,
      diagnostics: data
    });

  } catch (error) {
    console.error('Diagnostics history error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// Get specific diagnostic
app.get('/diagnostics/:id', async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const diagnosticId = c.req.param('id');

    const { data, error } = await supabase
      .from('diagnostics')
      .select('*')
      .eq('id', diagnosticId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return c.json({ error: 'Diagnostic not found' }, 404);
    }

    return c.json({
      success: true,
      diagnostic: data
    });

  } catch (error) {
    console.error('Get diagnostic error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

Deno.serve(app.fetch);
