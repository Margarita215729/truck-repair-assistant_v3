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

// Save voice recording
app.post('/', async (c) => {
  try {
    const userId = await requireAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const recordingData = await c.req.json();

    const { data, error } = await supabase
      .from('voice_recordings')
      .insert([{
        user_id: userId,
        duration: recordingData.duration,
        file_url: recordingData.fileUrl,
        transcript: recordingData.transcript,
        diagnostic_id: recordingData.diagnosticId
      }])
      .select();

    if (error) {
      console.error('Database error:', error);
      return c.json({ error: 'Failed to save voice recording' }, 500);
    }

    return c.json({
      success: true,
      recording: data[0]
    });

  } catch (error) {
    console.error('Voice recording save error:', error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

Deno.serve(app.fetch);
