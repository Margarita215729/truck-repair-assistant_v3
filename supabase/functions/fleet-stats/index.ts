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

// Get fleet statistics
app.get('/', async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get diagnostics count
    const { data: diagnostics, error: diagnosticsError } = await supabase
      .from('diagnostics')
      .select('id, created_at, truck_make, truck_model, cost_estimate')
      .eq('user_id', userId);

    if (diagnosticsError) {
      console.error('Database error:', diagnosticsError);
      return c.json({ error: 'Failed to load fleet stats' }, 500);
    }

    // Get reports count
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('id, created_at, type')
      .eq('user_id', userId);

    if (reportsError) {
      console.error('Database error:', reportsError);
    }

    // Calculate statistics
    const totalDiagnostics = diagnostics?.length || 0;
    const totalReports = reports?.length || 0;
    const totalCosts = diagnostics?.reduce((sum, diag) => sum + (diag.cost_estimate || 0), 0) || 0;
    const avgCost = totalDiagnostics > 0 ? totalCosts / totalDiagnostics : 0;

    // Get most common truck makes
    const truckMakes = diagnostics?.reduce((acc, diag) => {
      acc[diag.truck_make] = (acc[diag.truck_make] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const mostCommonMake = Object.entries(truckMakes).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return c.json({
      success: true,
      stats: {
        totalDiagnostics,
        totalReports,
        totalCosts,
        avgCost,
        mostCommonMake,
        diagnosticsByMake: truckMakes
      }
    });

  } catch (error) {
    console.error('Fleet stats error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

Deno.serve(app.fetch);
