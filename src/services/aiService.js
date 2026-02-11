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

    console.warn('No AI service configured, using fallback');
    return generateFallbackResponse(prompt, response_json_schema);
  } catch (error) {
    // If rate limited (429), throw specific error for UI to handle
    if (error.status === 429 || error.message?.includes('limit')) {
      throw error;
    }
    console.error('LLM invocation failed:', error);
    return generateFallbackResponse(prompt, response_json_schema);
  }
}

async function callViaProxy(messages, schema, accessToken, model) {
  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages,
      model: model || DEFAULT_MODEL,
      temperature: 0.2,
      max_tokens: 4096,
      ...(schema ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (response.status === 429) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error || 'Daily AI request limit reached');
    error.status = 429;
    error.limit = err.limit;
    throw error;
  }

  if (!response.ok) {
    throw new Error(`AI proxy error: ${response.status}`);
  }

  return response.json();
}

async function callDirect(messages, schema, token, model) {
  const response = await fetch(GITHUB_MODELS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model: model || DEFAULT_MODEL,
      temperature: 0.2,
      max_tokens: 4096,
      ...(schema ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub Models API error: ${response.status} - ${errorText}`);
  }

  return response.json();
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

RULES:
- Answer in the SAME LANGUAGE as the user's message.
- Be practical and actionable — get the driver back on the road.
- NEVER invent URLs, phone numbers, addresses, or usernames.
- If you are unsure, say so honestly and suggest next diagnostic steps.`;

  if (useInternet) {
    systemMsg += `\n\nUse your training knowledge to provide accurate information. You may reference well-known truck forums (TruckersReport, TheDieselStop, Reddit r/Truckers) as general sources, but NEVER fabricate specific posts, usernames, or URLs.`;
  }

  if (schema) {
    systemMsg += `\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;
  }

  return systemMsg;
}

function generateFallbackResponse(prompt, schema) {
  const promptLower = prompt.toLowerCase();

  // Basic keyword-based fallback
  let diagnosis = 'General truck issue detected. Please provide more details for accurate diagnosis.';
  let urgency = 'medium';

  if (promptLower.includes('engine') && promptLower.includes('knock')) {
    diagnosis = 'Engine knocking detected — possible bearing wear, low oil pressure, or piston slap. Stop driving immediately if knocking is severe.';
    urgency = 'high';
  } else if (promptLower.includes('overheat')) {
    diagnosis = 'Engine overheating — check coolant level, thermostat, water pump, and radiator. Do NOT continue driving.';
    urgency = 'critical';
  } else if (promptLower.includes('brake')) {
    diagnosis = 'Brake system issue — check air pressure, brake pads, rotors, and ABS sensors. Limited driving at reduced speed.';
    urgency = 'high';
  } else if (promptLower.includes('transmission') || promptLower.includes('gear')) {
    diagnosis = 'Transmission issue — check fluid level and condition, listen for grinding. Avoid heavy loads.';
    urgency = 'medium';
  } else if (promptLower.includes('check engine') || promptLower.includes('cel')) {
    diagnosis = 'Check Engine Light — scan for DTC codes with a J1939 scanner. Multiple possible causes.';
    urgency = 'medium';
  }

  if (schema) {
    return {
      response: diagnosis,
      clarifying_questions: [
        {
          question: 'When does this problem occur?',
          quick_answers: ['Cold start', 'While driving', 'At idle', 'Under load'],
          reasoning: 'Timing helps narrow down the root cause.',
        },
        {
          question: 'Are there any warning lights on the dashboard?',
          quick_answers: ['Check Engine', 'Oil Pressure', 'Temperature', 'None'],
          reasoning: 'Warning lights can point to specific systems.',
        },
      ],
      repair_instructions: [],
      suggested_parts: [],
      sources: [],
      follow_up_questions: ['What is your truck make and model?', 'How many miles on the odometer?'],
    };
  }

  return { response: diagnosis };
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

export default { invokeLLM, uploadFile };
