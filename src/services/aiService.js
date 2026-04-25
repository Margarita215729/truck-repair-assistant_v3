/**
 * AI Service (LLM Integration)
 * Uses server-side AI proxy (/api/ai-proxy) to keep API keys secure.
 * Falls back to direct GitHub Models API call only in dev with VITE_GITHUB_TOKEN.
 *
 * Models:
 *   DEFAULT_MODEL  – fast & cheap, used for text-only tasks (chat, reports, guides)
 *   VISION_MODEL   – supports image_url content, used for photo analysis
 */
import { env } from '@/config/env';
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const AI_PROXY_URL = '/api/ai-proxy';
const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const VISION_MODEL  = 'openai/gpt-4o';
const DIAGNOSTIC_MODEL = 'openai/gpt-4o';

/**
 * Call the LLM API via secure server proxy.
 *
 * @param {Object} opts
 * @param {string}   opts.prompt                  – user message text
 * @param {Object}  [opts.response_json_schema]   – if provided, force JSON mode
 * @param {boolean} [opts.add_context_from_internet] – hint for system prompt
 * @param {string}  [opts.model]                  – override model id
 * @param {string[]}[opts.image_urls]             – public URLs of images (triggers vision model)
 */
export async function invokeLLM({
  prompt,
  response_json_schema,
  add_context_from_internet = false,
  model,
  image_urls,
  // Legacy alias used by PartPhotoAnalyzer / AudioRecorder
  file_urls,
}) {
  // Merge legacy field
  const images = image_urls || file_urls || [];

  // Pick model: explicit override → vision model if images → default
  const effectiveModel = model || (images.length > 0 ? VISION_MODEL : DEFAULT_MODEL);

  const systemPrompt = buildSystemPrompt(response_json_schema, add_context_from_internet);

  // Build user content — multimodal when images are present
  let userContent;
  if (images.length > 0) {
    userContent = [
      { type: 'text', text: prompt },
      ...images.map(url => ({
        type: 'image_url',
        image_url: { url, detail: 'auto' },
      })),
    ];
  } else {
    userContent = prompt;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  try {
    // Try server-side proxy first (production path)
    if (hasSupabaseConfig && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const data = await callViaProxy(messages, response_json_schema, session.access_token, effectiveModel);
        return parseResponse(data, response_json_schema);
      }
    }

    // Dev fallback: direct API call with client-side token
    const devToken = env.GITHUB_TOKEN;
    if (devToken) {
      const data = await callDirect(messages, response_json_schema, devToken, effectiveModel);
      return parseResponse(data, response_json_schema);
    }

    const err = new Error('Diagnostic service unavailable — no active session.');
    err.code = 'NO_AI_SERVICE';
    throw err;
  } catch (error) {
    // If rate limited (429), throw specific error for UI to handle
    if (error.status === 429 || error.message?.includes('limit')) {
      throw error;
    }
    console.error('LLM invocation failed:', error.message, error.stack);
    console.error('Full error details:', JSON.stringify({ message: error.message, status: error.status, name: error.name }));
    error.code = error.code || 'LLM_FAILED';
    throw error;
  }
}

async function callViaProxy(messages, schema, accessToken, model) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        messages,
        model: model || DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 16384,
        ...(schema ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (response.status === 429) {
      const err = await response.json().catch(() => ({}));
      const error = new Error(err.error || 'Daily request limit reached');
      error.status = 429;
      error.limit = err.limit;
      throw error;
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const detail = errBody?.error || `Proxy error ${response.status}`;
      console.error('Diagnostic proxy responded with error:', response.status, detail);
      const err = new Error(detail);
      err.status = response.status;
      throw err;
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callDirect(messages, schema, token, model) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        messages,
        model: model || DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 16384,
        ...(schema ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub Models API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseResponse(data, schema) {
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from LLM');
  }

  if (schema) {
    try {
      return JSON.parse(content);
    } catch {
      return { response: content };
    }
  }

  return { response: content };
}

function buildSystemPrompt(schema, useInternet) {
  let systemMsg = `You are Truck Repair Assistant AI — an expert truck mechanic with 20+ years of experience diagnosing and repairing heavy-duty commercial trucks (Peterbilt, Kenworth, Freightliner, Volvo, Mack, International, Western Star and others).

You have deep expertise in:
- Cummins, Detroit Diesel, PACCAR, Volvo D11/D13, Navistar engines
- Eaton Fuller, Allison, Volvo I-Shift transmissions
- Aftertreatment systems: DPF, SCR, DEF, EGR, DOC
- J1939/J1708 diagnostic protocols and DTC codes (SPN/FMI)
- Air brake systems (FMVSS 121), ABS (Bendix, Wabco, Meritor)
- Electrical systems, ECM/ECU diagnostics, CAN bus

RULES:
- Answer in the SAME LANGUAGE as the user's message.
- Be practical and actionable — get the driver back on the road.
- NEVER say "General truck issue detected" or give vague generic answers.
- ALWAYS provide specific diagnosis based on the symptoms and truck model.
- NEVER invent URLs, phone numbers, addresses, or usernames.
- If uncertain between multiple causes, list them ranked by probability.
- Include specific part numbers when you know them (e.g. Cummins ISX EGR valve P/N 4352824).
- Reference TSBs and common failure points for the specific engine/truck combo.`;

  if (useInternet) {
    systemMsg += `\n\nUse your training knowledge to provide accurate information. You may reference well-known truck forums (TruckersReport, TheDieselStop, Reddit r/Truckers) as general sources, but NEVER fabricate specific posts, usernames, or URLs.`;
  }

  if (schema) {
    systemMsg += `\n\nIMPORTANT: You MUST respond with valid JSON matching this schema. Every field must be populated with useful content — NEVER leave repair_instructions or suggested_parts as empty arrays if you have any diagnostic information.\n${JSON.stringify(schema, null, 2)}`;
  }

  return systemMsg;
}

// generateFallbackResponse removed — production path must not serve hardcoded diagnoses.

/**
 * Invoke Gemini 2.0 Flash for visual diagnostics (photo / video analysis).
 * Uses a dedicated server-side proxy (/api/gemini-proxy) with truck-specific
 * system instructions and content filtering (rejects non-truck images).
 *
 * @param {Object} opts
 * @param {Array<{file: File}>} opts.media - Array of image/video File objects
 * @param {string} [opts.prompt]           - Optional user description
 * @param {Object} [opts.truck_context]    - { year, make, model, engine, vin }
 * @returns {Promise<Object>} Structured diagnostic result or { rejected, reason }
 */
export async function invokeGeminiVision({ media, prompt, truck_context }) {
  if (!media || media.length === 0) {
    throw new Error('At least one image or video is required');
  }

  const guessMimeType = (file) => {
    if (file.type) return file.type;
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const map = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/mp4', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    return map[ext] || 'application/octet-stream';
  };

  // Production: upload to Supabase Storage → send refs to proxy (avoids Vercel body size limit)
  // Files are sent at FULL resolution for maximum diagnostic quality
  if (hasSupabaseConfig && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return await analyzeViaStorage(media, prompt, truck_context, session, guessMimeType);
    }
  }

  // Dev fallback: convert to base64 and call Gemini directly (no Vercel limit in local dev)
  const devKey = env.GEMINI_API_KEY || env.GOOGLE_MAPS_API_KEY;
  if (devKey) {
    const mediaPayload = await Promise.all(
      media.map(async ({ file }) => {
        const base64 = await fileToBase64(file);
        return { data: base64, mimeType: guessMimeType(file) };
      })
    );
    return await callGeminiDirect(mediaPayload, prompt, truck_context, devKey);
  }

  throw new Error('No Gemini API configuration available');
}

/**
 * Upload media to Supabase Storage, send lightweight refs to the server proxy.
 * The proxy downloads full-quality files server-side, sends to Gemini, then deletes them.
 * This avoids Vercel's 4.5MB request body limit while preserving original image quality.
 */
async function analyzeViaStorage(media, prompt, truckContext, session, guessMimeType) {
  const storagePaths = [];

  try {
    const mediaRefs = [];
    for (const { file } of media) {
      const ext = file.name?.split('.').pop() || 'bin';
      const path = `${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const mime = guessMimeType(file);

      const { error } = await supabase.storage
        .from('vision-temp')
        .upload(path, file, { contentType: mime, upsert: false });

      if (error) {
        throw new Error(`Failed to upload file for analysis: ${error.message}`);
      }

      storagePaths.push(path);
      mediaRefs.push({ storagePath: path, mimeType: mime });
    }

    // Proxy receives tiny JSON payload (~200 bytes per file instead of megabytes)
    return await callGeminiProxy(mediaRefs, prompt, truckContext, session.access_token);
  } catch (error) {
    // Server cleans up on success; client cleans up on client-side / network errors
    if (storagePaths.length > 0) {
      supabase.storage.from('vision-temp').remove(storagePaths).catch(() => {});
    }
    if (error.status === 429 || error.message?.includes('limit')) {
      throw error;
    }
    console.error('Gemini Vision invocation failed:', error.message);
    throw error;
  }
}

async function callGeminiProxy(mediaRefs, prompt, truckContext, accessToken) {
  const response = await fetch('/api/gemini-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ mediaRefs, prompt, truck_context: truckContext }),
  });

  // Read body once as text, then parse — avoids double-read bug
  const bodyText = await response.text().catch(() => '');
  let bodyJson;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = null;
  }

  if (response.status === 429) {
    const error = new Error(bodyJson?.error || 'Daily request limit reached');
    error.status = 429;
    error.limit = bodyJson?.limit;
    throw error;
  }

  if (!response.ok) {
    const errorMessage = bodyJson?.error || bodyText || `Gemini proxy error: ${response.status}`;
    console.error('Gemini proxy error:', response.status, errorMessage);
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  if (!bodyJson) {
    throw new Error('Invalid JSON response from Gemini proxy');
  }

  return bodyJson;
}

async function callGeminiDirect(media, prompt, truckContext, apiKey) {
  let userPrompt = '';
  if (truckContext) {
    userPrompt += `TRUCK CONTEXT: ${truckContext.year || ''} ${truckContext.make || ''} ${truckContext.model || ''}`;
    if (truckContext.engine) userPrompt += `, Engine: ${truckContext.engine}`;
    userPrompt += '\n\n';
  }
  userPrompt += prompt || 'Analyze this image/video and provide a diagnostic assessment.';

  const parts = [
    ...media.map(item => ({ inlineData: { mimeType: item.mimeType, data: item.data } })),
    { text: userPrompt },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are a HEAVY-DUTY TRUCK Visual Diagnostic System. Analyze ONLY truck-related images (Class 5-8). If the image is not truck-related, set is_truck_related=false. Respond in JSON with fields: is_truck_related, image_category, findings, dashboard_lights, fluid_analysis, smoke_analysis, extracted_text, safety_assessment, probable_diagnosis.' }],
        },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  try {
    return JSON.parse(text);
  } catch {
    return { is_truck_related: true, image_category: 'unknown', raw_response: text };
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip the data URL prefix (data:image/jpeg;base64,...)
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a file to storage
 * Uses Supabase Storage or returns a local blob URL
 */
export async function uploadFile({ file }) {
  // Try Supabase Storage
  try {
    const { supabase, hasSupabaseConfig } = await import('@/api/supabaseClient');
    if (hasSupabaseConfig && supabase) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(fileName);
        return { file_url: urlData.publicUrl };
      }
    }
  } catch (e) {
    console.warn('Supabase storage upload failed:', e);
  }

  // Fallback: create local blob URL
  const localUrl = URL.createObjectURL(file);
  return { file_url: localUrl };
}

export default { invokeLLM, invokeGeminiVision, uploadFile };
