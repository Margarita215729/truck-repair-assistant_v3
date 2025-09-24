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

// Generate report
app.post('/', async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportData = await c.req.json();

    // Generate comprehensive report
    const report = {
      id: `report_${userId}_${Date.now()}`,
      userId,
      type: reportData.type || 'diagnostic',
      title: reportData.title || 'Truck Diagnostic Report',
      summary: reportData.summary || 'Comprehensive diagnostic analysis',
      details: reportData.details || {},
      recommendations: reportData.recommendations || [],
      costEstimate: reportData.costEstimate || 0,
      generatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('reports')
      .insert([report])
      .select();

    if (error) {
      console.error('Database error:', error);
      return c.json({ error: 'Failed to generate report' }, 500);
    }

    return c.json({
      success: true,
      report: data[0]
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

Deno.serve(app.fetch);
