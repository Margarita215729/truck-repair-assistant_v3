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

    console.warn('No AI service configured (no Supabase session and no dev token), using fallback');
    return generateFallbackResponse(prompt, response_json_schema);
  } catch (error) {
    // If rate limited (429), throw specific error for UI to handle
    if (error.status === 429 || error.message?.includes('limit')) {
      throw error;
    }
    console.error('LLM invocation failed:', error.message, error.stack);
    console.error('Full error details:', JSON.stringify({ message: error.message, status: error.status, name: error.name }));
    const fallback = generateFallbackResponse(prompt, response_json_schema);
    // Tag fallback so UI can optionally show a warning
    fallback._isFallback = true;
    fallback._errorMessage = error.message;
    return fallback;
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
      max_tokens: 16384,
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
    const errorBody = await response.text().catch(() => 'no body');
    console.error('AI proxy responded with error:', response.status, errorBody);
    const err = new Error(`AI proxy error: ${response.status} — ${errorBody}`);
    err.status = response.status;
    throw err;
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
      max_tokens: 16384,
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

function generateFallbackResponse(prompt, schema) {
  const promptLower = prompt.toLowerCase();

  // Enhanced keyword-based fallback with real diagnostic info
  let diagnosis = '';
  let urgency = 'medium';
  let repairSteps = [];
  let parts = [];

  if (promptLower.includes('engine') && promptLower.includes('knock')) {
    diagnosis = '⚠️ [Offline Mode] Engine knocking detected — likely causes ranked by probability:\n\n1. **Rod/main bearing wear** (most common on high-mileage engines) — low oil pressure accelerates this\n2. **Injector timing issue** — especially on Cummins ISX, check injector cups\n3. **Piston slap** — more noticeable on cold starts, lessens when warm\n4. **Wrist pin wear** — sharp metallic knock at idle\n\nSTOP driving immediately if knocking is severe or oil pressure is low.';
    urgency = 'high';
    repairSteps = [
      { step: 1, title: 'Check oil level and condition', description: 'Pull dipstick — look for metal flakes, milky appearance (coolant), or very dark sludgy oil. Low oil = stop immediately.', estimated_time: '5 min' },
      { step: 2, title: 'Read oil pressure', description: 'Connect mechanical oil pressure gauge to engine block. At idle: minimum 10 PSI. At operating RPM: 40-60 PSI. Below spec = bearing failure likely.', estimated_time: '15 min' },
      { step: 3, title: 'Cylinder contribution test', description: 'Use diagnostic scanner to run cylinder cutout test. If knock disappears when one cylinder is cut, that cylinder has the issue.', estimated_time: '20 min' },
      { step: 4, title: 'Inspect injector cups (Cummins)', description: 'If coolant in oil, injector cups are leaking. Common on ISX engines above 500K miles.', estimated_time: '30 min' },
    ];
  } else if (promptLower.includes('overheat') || promptLower.includes('перегрев') || promptLower.includes('температур')) {
    diagnosis = '🔴 [Offline Mode] Engine overheating — CRITICAL. Do NOT continue driving.\n\nMost likely causes:\n1. **Low coolant** — check for leaks at hoses, water pump weep hole, radiator seams\n2. **Failed thermostat** — stuck closed, not allowing coolant flow\n3. **Water pump failure** — check belt, listen for bearing noise\n4. **Plugged radiator** — external debris or internal scale buildup\n5. **Failed fan clutch** — fan should engage at ~200°F';
    urgency = 'critical';
    repairSteps = [
      { step: 1, title: 'STOP and let engine cool', description: 'Park safely, turn off engine. Wait at least 30 minutes before opening radiator cap. Opening hot cap causes severe burns.', estimated_time: '30 min' },
      { step: 2, title: 'Check coolant level', description: 'Check overflow tank first. If empty, carefully check radiator when cool. Look for leaks under truck — green/orange puddles.', estimated_time: '10 min' },
      { step: 3, title: 'Inspect belts and hoses', description: 'Check serpentine belt tension and condition. Inspect all radiator hoses for bulging, cracks, or soft spots. Check water pump weep hole for drips.', estimated_time: '15 min' },
      { step: 4, title: 'Test thermostat', description: 'Feel upper and lower radiator hoses when engine warms up. If upper hose stays cold while engine heats up, thermostat is stuck closed.', estimated_time: '15 min' },
    ];
  } else if (promptLower.includes('brake') || promptLower.includes('тормоз')) {
    diagnosis = '⚠️ [Offline Mode] Brake system issue — requires immediate attention.\n\nCommon causes:\n1. **Low air pressure** — check compressor, air dryer, and for air leaks (listen for hissing)\n2. **Worn brake pads/shoes** — visual inspection through wheel\n3. **Brake chamber problem** — push rod stroke above 2 inches = out of adjustment\n4. **ABS sensor fault** — check wheel speed sensor gaps and wiring';
    urgency = 'high';
    repairSteps = [
      { step: 1, title: 'Check air pressure gauges', description: 'Both primary and secondary should build to 120-140 PSI. If below 60 PSI, do not drive. Listen for air leaks around chambers and connections.', estimated_time: '5 min' },
      { step: 2, title: 'Check push rod stroke', description: 'Mark push rod at chamber, apply brakes, measure travel. Type 30 chamber: max 2 inches. Over limit = needs adjustment or new chamber.', estimated_time: '20 min' },
      { step: 3, title: 'Visual brake inspection', description: 'Check pad/shoe thickness through inspection ports. Minimum thickness: 1/4 inch. Check rotors/drums for scoring or cracks.', estimated_time: '15 min' },
    ];
  } else if (promptLower.includes('transmission') || promptLower.includes('gear') || promptLower.includes('трансмисс') || promptLower.includes('передач')) {
    diagnosis = '⚠️ [Offline Mode] Transmission issue detected.\n\nCommon causes:\n1. **Low/contaminated fluid** — check level and smell for burnt odor\n2. **Shift linkage/cable** — especially on manual transmissions, check for wear\n3. **Clutch wear** (manual) — slipping under load, high engagement point\n4. **Solenoid/valve body** (automatic/automated) — electronic shift issues';
    urgency = 'medium';
    repairSteps = [
      { step: 1, title: 'Check transmission fluid', description: 'With engine running, check fluid level on dipstick. Should be pink/red. Dark brown or burnt smell = internal damage. Milky = water contamination.', estimated_time: '10 min' },
      { step: 2, title: 'Scan for fault codes', description: 'Use J1939 scanner to read transmission ECU codes. Common: P0700 series for auto, Eaton codes for Fuller transmissions.', estimated_time: '15 min' },
      { step: 3, title: 'Check clutch adjustment (manual)', description: 'Measure clutch pedal free play — should be 1.5-2 inches. Check clutch brake engagement at bottom of pedal travel.', estimated_time: '10 min' },
    ];
  } else if (promptLower.includes('check engine') || promptLower.includes('cel') || promptLower.includes('чек')) {
    diagnosis = '⚠️ [Offline Mode] Check Engine Light active.\n\nThis could indicate many issues. Most common on heavy trucks:\n1. **Aftertreatment system** — DPF full, SCR efficiency low, DEF quality\n2. **EGR system** — stuck EGR valve, cooler leak, delta-P sensor\n3. **Turbo boost** — wastegate, boost leak, VGT actuator\n4. **Fuel system** — rail pressure, injector balance rates\n\nA J1939/J1708 scan is essential to read SPN/FMI fault codes.';
    urgency = 'medium';
    repairSteps = [
      { step: 1, title: 'Read fault codes', description: 'Use J1939-compatible scanner (Cummins Insite, Detroit DDDL, Volvo PTT, or universal like Noregon). Write down all active and inactive SPN/FMI codes.', estimated_time: '15 min' },
      { step: 2, title: 'Check for derate', description: 'If engine is in derate (reduced power), check dashboard for 25%/40%/5mph derate warnings. Note speed limit if any.', estimated_time: '5 min' },
      { step: 3, title: 'Basic visual inspection', description: 'Check for loose wiring connections, damaged sensors, DEF level, and visible exhaust leaks at turbo/manifold.', estimated_time: '20 min' },
    ];
  } else if (promptLower.includes('dpf') || promptLower.includes('regen') || promptLower.includes('регенерац') || promptLower.includes('сажев')) {
    diagnosis = '⚠️ [Offline Mode] DPF/Regeneration issue.\n\nCommon causes:\n1. **DPF soot load too high** — needs forced regen (parked regen)\n2. **Failed DOC** — upstream catalyst not reaching temperature\n3. **7th injector / dosing valve clogged** — not injecting diesel for regen\n4. **DPF differential pressure sensor** — clogged lines or failed sensor giving false readings\n5. **Excessive idle time** — prevents passive regen, soot accumulates';
    urgency = 'medium';
    repairSteps = [
      { step: 1, title: 'Check soot load level', description: 'Use diagnostic scanner to read DPF soot percentage. Below 80% = may not need regen. Above 120% = may need manual cleaning.', estimated_time: '10 min' },
      { step: 2, title: 'Attempt parked regeneration', description: 'Park on flat surface away from buildings. Engine at operating temp. Use scanner to initiate parked/stationary regen. Takes 30-60 minutes. Do not interrupt.', estimated_time: '60 min' },
      { step: 3, title: 'Inspect differential pressure lines', description: 'Check the two rubber/silicone lines from DPF to delta-P sensor. Often clogged with soot. Blow out with compressed air or replace.', estimated_time: '20 min' },
    ];
  } else {
    // Generic but still helpful
    diagnosis = '🔧 [Offline Mode — AI temporarily unavailable] I\'m currently unable to connect to the AI diagnostic engine, but here\'s what I can suggest:\n\nTo help diagnose your issue, please provide:\n- **Truck make, model, year** and **engine** (e.g., 2019 Freightliner Cascadia, Detroit DD15)\n- **Specific symptoms**: what you see, hear, feel, smell\n- **Any error codes** from your dashboard or scanner\n- **When it happens**: cold start, under load, at idle, etc.\n\nOnce the AI service reconnects, I\'ll provide a detailed diagnosis with repair instructions and parts recommendations.';
    repairSteps = [
      { step: 1, title: 'Visual inspection', description: 'Walk around the truck and check for visible leaks (oil, coolant, fuel, air), loose connections, damaged components, or unusual smells.', estimated_time: '15 min' },
      { step: 2, title: 'Read fault codes', description: 'Connect a J1939 diagnostic scanner and read all active and inactive fault codes. Write down SPN (Suspect Parameter Number) and FMI (Failure Mode Identifier).', estimated_time: '15 min' },
      { step: 3, title: 'Check fluid levels', description: 'Check engine oil, coolant, transmission fluid, DEF level, and power steering fluid. Low fluids can cause multiple symptoms.', estimated_time: '10 min' },
    ];
  }

  if (schema) {
    return {
      response: diagnosis,
      clarifying_questions: [
        {
          question: 'What is your truck make, model, year, and engine?',
          quick_answers: ['Freightliner Cascadia', 'Peterbilt 579', 'Kenworth T680', 'Volvo VNL'],
          reasoning: 'Different trucks have different common failure points and part numbers.',
        },
        {
          question: 'Can you describe the symptom in more detail?',
          quick_answers: ['Strange noise', 'Loss of power', 'Warning light', 'Fluid leak'],
          reasoning: 'More detail helps narrow the diagnosis.',
        },
      ],
      repair_instructions: repairSteps,
      suggested_parts: parts,
      sources: [],
      follow_up_questions: ['Do you have a diagnostic scanner available?', 'Are you at a safe location to perform inspections?'],
    };
  }

  return { response: diagnosis };
}

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

  // Convert File objects to base64 (compress images to stay under Vercel 4.5MB body limit)
  const mediaPayload = await Promise.all(
    media.map(async ({ file }) => {
      const isImage = file.type.startsWith('image/');
      // Compress images client-side to avoid exceeding Vercel body size limit
      const processedFile = isImage ? await compressImage(file, 1200, 0.8) : file;
      const base64 = await fileToBase64(processedFile);
      return { data: base64, mimeType: processedFile.type || 'image/jpeg' };
    })
  );

  try {
    // Production: via server proxy
    if (hasSupabaseConfig && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return await callGeminiProxy(mediaPayload, prompt, truck_context, session.access_token);
      }
    }

    // Dev fallback: direct Gemini API call
    const devKey = env.GOOGLE_MAPS_API_KEY;
    if (devKey) {
      return await callGeminiDirect(mediaPayload, prompt, truck_context, devKey);
    }

    throw new Error('No Gemini API configuration available');
  } catch (error) {
    if (error.status === 429 || error.message?.includes('limit')) {
      throw error;
    }
    console.error('Gemini Vision invocation failed:', error.message);
    throw error;
  }
}

async function callGeminiProxy(media, prompt, truckContext, accessToken) {
  const response = await fetch('/api/gemini-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ media, prompt, truck_context: truckContext }),
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
    const error = new Error(bodyJson?.error || 'Daily AI request limit reached');
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
 * Compress an image file to reduce payload size.
 * Resizes to maxDimension and compresses to JPEG with given quality.
 * This is critical for Vercel Hobby plan which has a 4.5MB body limit.
 * A typical phone photo (5-12MB) becomes 6.8-16MB in base64 JSON — way over limit.
 * After compression: ~200-500KB → ~300-700KB in base64 → well within limit.
 */
function compressImage(file, maxDimension = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    // Skip compression for small files (< 2MB)
    if (file.size < 2 * 1024 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;

        // Scale down if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // fallback to original
              return;
            }
            const compressed = new File([blob], file.name, { type: 'image/jpeg' });
            console.log(`Image compressed: ${(file.size/1024).toFixed(0)}KB → ${(compressed.size/1024).toFixed(0)}KB`);
            resolve(compressed);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('Image compression failed, using original:', err);
        resolve(file);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load image for compression, using original');
      resolve(file);
    };
    img.src = URL.createObjectURL(file);
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
