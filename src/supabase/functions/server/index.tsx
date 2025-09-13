import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}));
app.use('*', logger(console.log));

// Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Routes prefix
const PREFIX = '/make-server-92d4f459';

// Authentication middleware
async function requireAuth(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken || accessToken === Deno.env.get('SUPABASE_ANON_KEY')) {
    return null;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user?.id) {
    return null;
  }
  
  return user.id;
}

// User signup
app.post(`${PREFIX}/auth/signup`, async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ user: data.user });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Save diagnostic session
app.post(`${PREFIX}/diagnostics`, async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const diagnosticData = await c.req.json();
    const diagnosticId = `diagnostic_${userId}_${Date.now()}`;
    
    // Store diagnostic session
    await kv.set(diagnosticId, {
      id: diagnosticId,
      userId,
      timestamp: new Date().toISOString(),
      ...diagnosticData
    });
    
    // Update user's diagnostic history
    const historyKey = `history_${userId}`;
    const existingHistory = await kv.get(historyKey) || [];
    const updatedHistory = [diagnosticId, ...existingHistory.slice(0, 49)]; // Keep last 50
    await kv.set(historyKey, updatedHistory);
    
    return c.json({ diagnosticId, message: 'Diagnostic saved successfully' });
  } catch (error) {
    console.log('Error saving diagnostic:', error);
    return c.json({ error: 'Failed to save diagnostic session' }, 500);
  }
});

// Get user's diagnostic history
app.get(`${PREFIX}/diagnostics/history`, async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const historyKey = `history_${userId}`;
    const diagnosticIds = await kv.get(historyKey) || [];
    
    if (diagnosticIds.length === 0) {
      return c.json({ diagnostics: [] });
    }
    
    const diagnostics = await kv.mget(diagnosticIds);
    
    return c.json({ 
      diagnostics: diagnostics.filter(d => d !== null).map(d => ({
        id: d.id,
        timestamp: d.timestamp,
        truckModel: d.truckModel,
        symptoms: d.symptoms,
        analysisType: d.analysisType,
        primaryIssue: d.primaryIssue,
        status: d.status || 'completed'
      }))
    });
  } catch (error) {
    console.log('Error fetching diagnostic history:', error);
    return c.json({ error: 'Failed to fetch diagnostic history' }, 500);
  }
});

// Get specific diagnostic
app.get(`${PREFIX}/diagnostics/:id`, async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const diagnosticId = c.req.param('id');
    const diagnostic = await kv.get(diagnosticId);
    
    if (!diagnostic || diagnostic.userId !== userId) {
      return c.json({ error: 'Diagnostic not found' }, 404);
    }
    
    return c.json({ diagnostic });
  } catch (error) {
    console.log('Error fetching diagnostic:', error);
    return c.json({ error: 'Failed to fetch diagnostic' }, 500);
  }
});

// Save voice recording metadata
app.post(`${PREFIX}/voice/recording`, async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { duration, analysisResults, symptoms } = await c.req.json();
    const recordingId = `recording_${userId}_${Date.now()}`;
    
    await kv.set(recordingId, {
      id: recordingId,
      userId,
      timestamp: new Date().toISOString(),
      duration,
      analysisResults,
      symptoms,
      type: 'voice_recording'
    });
    
    return c.json({ recordingId, message: 'Recording metadata saved' });
  } catch (error) {
    console.log('Error saving recording metadata:', error);
    return c.json({ error: 'Failed to save recording metadata' }, 500);
  }
});

// Get fleet statistics
app.get(`${PREFIX}/fleet/stats`, async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user's diagnostic history
    const historyKey = `history_${userId}`;
    const diagnosticIds = await kv.get(historyKey) || [];
    
    if (diagnosticIds.length === 0) {
      return c.json({
        totalDiagnostics: 0,
        activeIssues: 0,
        resolvedToday: 0,
        pendingAnalysis: 0,
        systemHealth: 100
      });
    }
    
    const diagnostics = await kv.mget(diagnosticIds);
    const validDiagnostics = diagnostics.filter(d => d !== null);
    
    // Calculate stats
    const today = new Date().toDateString();
    const resolvedToday = validDiagnostics.filter(d => 
      new Date(d.timestamp).toDateString() === today && d.status === 'completed'
    ).length;
    
    const activeIssues = validDiagnostics.filter(d => 
      d.primaryIssue?.severity === 'High' && d.status !== 'resolved'
    ).length;
    
    const pendingAnalysis = validDiagnostics.filter(d => 
      d.status === 'pending' || d.status === 'analyzing'
    ).length;
    
    return c.json({
      totalDiagnostics: validDiagnostics.length,
      activeIssues,
      resolvedToday,
      pendingAnalysis,
      systemHealth: Math.max(70, 100 - (activeIssues * 5))
    });
  } catch (error) {
    console.log('Error fetching fleet stats:', error);
    return c.json({ error: 'Failed to fetch fleet statistics' }, 500);
  }
});

// Generate report
app.post(`${PREFIX}/reports/generate`, async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { reportType, timeRange, startDate, endDate } = await c.req.json();
    
    // Get user's diagnostic history
    const historyKey = `history_${userId}`;
    const diagnosticIds = await kv.get(historyKey) || [];
    const diagnostics = await kv.mget(diagnosticIds);
    const validDiagnostics = diagnostics.filter(d => d !== null);
    
    // Filter by date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filteredDiagnostics = validDiagnostics.filter(d => {
      const date = new Date(d.timestamp);
      return date >= start && date <= end;
    });
    
    // Generate report data
    const reportId = `report_${userId}_${Date.now()}`;
    const reportData = {
      id: reportId,
      userId,
      timestamp: new Date().toISOString(),
      reportType,
      timeRange,
      startDate,
      endDate,
      totalDiagnostics: filteredDiagnostics.length,
      vehicles: [...new Set(filteredDiagnostics.map(d => d.truckModel))].length,
      issues: filteredDiagnostics.filter(d => d.primaryIssue).length,
      resolved: filteredDiagnostics.filter(d => d.status === 'completed').length,
      costEstimate: filteredDiagnostics.reduce((sum, d) => 
        sum + (d.costEstimate || Math.floor(Math.random() * 1000) + 200), 0
      ),
      data: filteredDiagnostics
    };
    
    await kv.set(reportId, reportData);
    
    return c.json({ 
      reportId, 
      report: reportData,
      message: 'Report generated successfully' 
    });
  } catch (error) {
    console.log('Error generating report:', error);
    return c.json({ error: 'Failed to generate report' }, 500);
  }
});

// AI Analysis with GitHub Models
app.post(`${PREFIX}/ai/analyze`, async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
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
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GITHUB_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: prompt }
        ],
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.log('GitHub Models API error:', response.status, await response.text());
      return c.json({ error: 'AI analysis failed' }, 500);
    }

    const result = await response.json();
    const analysis = result.choices[0].message.content;
    
    // Parse the AI response to extract structured data
    const analysisData = {
      id: `analysis_${userId}_${Date.now()}`,
      userId,
      timestamp: new Date().toISOString(),
      symptoms,
      truckModel,
      aiResponse: analysis,
      // Extract urgency from response
      urgency: analysis.toLowerCase().includes('high') ? 'High' : 
               analysis.toLowerCase().includes('medium') ? 'Medium' : 'Low',
      // Extract safety info
      canContinue: analysis.toLowerCase().includes('yes') || 
                   analysis.toLowerCase().includes('safe to continue'),
      estimatedCost: 'AI analysis complete - see details',
      type: 'ai_analysis'
    };
    
    // Save analysis
    await kv.set(analysisData.id, analysisData);
    
    return c.json({ 
      analysis: analysisData,
      message: 'AI analysis completed successfully' 
    });
    
  } catch (error) {
    console.log('Error in AI analysis:', error);
    return c.json({ error: 'Failed to complete AI analysis' }, 500);
  }
});

// Health check
app.get(`${PREFIX}/health`, (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize demo user if needed (optional for demo purposes)
async function initializeDemoUser() {
  try {
    // Only initialize demo user in development
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      await supabase.auth.admin.createUser({
        email: 'demo@truckdiag.com',
        password: 'demo123',
        user_metadata: { name: 'Demo User' },
        email_confirm: true
      });
      console.log('Demo user available for development');
    }
  } catch (error) {
    // User might already exist, which is fine
    console.log('Demo user already exists or creation failed');
  }
}

Deno.serve(app.fetch);