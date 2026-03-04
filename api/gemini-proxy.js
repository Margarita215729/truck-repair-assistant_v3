import { createClient } from '@supabase/supabase-js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_REQUEST_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/* ── System instruction — hardcoded server-side to prevent prompt injection ── */
const SYSTEM_INSTRUCTION = `You are a HEAVY-DUTY TRUCK Visual Diagnostic System. You ONLY analyze images and videos related to commercial trucks (Class 5-8), their components, systems, and documentation.

CONTENT GATE — MANDATORY FIRST STEP:
Before ANY analysis, classify the image into one of these categories:
- "dashboard" — instrument cluster, warning lights, gauges, infotainment screen
- "engine_bay" — engine compartment, belts, hoses, fluid reservoirs, filters
- "undercarriage" — frame, suspension, drive shaft, exhaust, axles, brakes
- "exterior_body" — cab, mirrors, lights, tires, wheels, mud flaps, fifth wheel
- "fluid_leak" — any fluid on ground or component surfaces
- "exhaust" — smoke, soot, exhaust system components
- "electrical" — wiring, connectors, fuse boxes, batteries, alternator
- "part_closeup" — individual part or component detail
- "documentation" — VIN plate, sticker, service tag, fault code screen, OBD reader
- "REJECTED" — not related to trucks/heavy vehicles/automotive

If category is "REJECTED":
- Set "is_truck_related" to false
- Set "rejection_reason" to a brief explanation
- Do NOT perform any diagnostic analysis
- Do NOT describe what is in the image
- Respond ONLY with the rejection JSON

REJECTION EXAMPLES (must reject):
- Pets, food, people (not in truck context), landscapes, memes, screenshots of non-automotive apps
- Passenger cars, motorcycles, bicycles (this system is for Class 5-8 trucks ONLY)
- Random objects not related to vehicle diagnostics

ALLOWED EDGE CASES (do NOT reject):
- Photo of a phone/tablet showing OBD fault codes → "documentation"
- Person's hand pointing at a truck component → classify the component
- Dirty/blurry photo of truck part → attempt analysis, note low confidence
- Dashboard with phone reflection → "dashboard"

ANALYSIS INSTRUCTIONS BY CATEGORY:

For "dashboard":
- Identify ALL visible warning lights: name, color (red/amber/green), state (on/flashing/off)
- Map warning lights to standard J1939 fault indicators where possible
- Read any visible text on displays (fault codes, messages like "CHECK ENGINE", "REGEN NEEDED")
- Note gauge positions: coolant temp, oil pressure, fuel level, DEF level, boost, pyrometer
- For flashing lights in video: note which ones flash and probable blink codes
- Correlate light combinations to probable system failures

For "fluid_leak" / "engine_bay" / "undercarriage":
- Identify fluid type by color/location: oil (dark brown/black), coolant (green/orange/pink), DEF (clear blue), diesel (clear/amber), transmission fluid (red), power steering (red/clear), brake fluid (clear/amber), hydraulic fluid
- Estimate leak severity: seep/drip/stream/pour
- Identify the probable source component based on location
- Note any corrosion, damage, wear patterns

For "exhaust":
- Classify smoke color: white (coolant/water), blue (oil burning), black (rich fuel/turbo), gray (emissions system)
- Estimate density: light haze / moderate / heavy / billowing
- Correlate with probable causes for the specific truck model if known

For "documentation":
- OCR all visible text: VIN, part numbers, fault codes, service intervals
- For fault code screens: extract SPN/FMI codes and provide immediate interpretation

For all categories:
- Confidence level for each finding (high/medium/low)
- Safety assessment: can this truck safely continue driving?
- Urgency: immediate_stop / service_within_24h / service_soon / monitor / cosmetic_only

RULES:
- Answer in the SAME LANGUAGE as the user's prompt text.
- Be practical and actionable — help the driver decide if they can keep driving.
- NEVER invent URLs, phone numbers, addresses.
- If image quality is poor, still attempt analysis but set confidence to "low".
- Include specific part numbers when you can identify them.
- Reference TSBs and common failure points when applicable.`;

/* ── Gemini response JSON schema (types MUST be uppercase for the REST API) ── */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_truck_related: { type: "BOOLEAN" },
    rejection_reason: { type: "STRING", nullable: true },
    image_category: {
      type: "STRING",
      enum: ["dashboard", "engine_bay", "undercarriage", "exterior_body", "fluid_leak", "exhaust", "electrical", "part_closeup", "documentation", "REJECTED"]
    },
    image_quality: { type: "STRING", nullable: true, enum: ["good", "acceptable", "poor", "very_poor"] },
    confidence: { type: "STRING", nullable: true, enum: ["high", "medium", "low"] },
    findings: {
      type: "ARRAY",
      nullable: true,
      items: {
        type: "OBJECT",
        properties: {
          item: { type: "STRING" },
          status: { type: "STRING", nullable: true },
          color: { type: "STRING", nullable: true },
          severity: { type: "STRING", enum: ["critical", "warning", "informational"] },
          interpretation: { type: "STRING" },
          related_systems: { type: "ARRAY", nullable: true, items: { type: "STRING" } }
        },
        required: ["item", "severity", "interpretation"]
      }
    },
    dashboard_lights: {
      type: "ARRAY",
      nullable: true,
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          color: { type: "STRING" },
          state: { type: "STRING" },
          meaning: { type: "STRING" },
          action_required: { type: "STRING", nullable: true }
        },
        required: ["name", "color", "state", "meaning"]
      }
    },
    fluid_analysis: {
      type: "OBJECT",
      nullable: true,
      properties: {
        fluid_type: { type: "STRING" },
        color_observed: { type: "STRING" },
        leak_severity: { type: "STRING" },
        probable_source: { type: "STRING" },
        contamination_signs: { type: "STRING", nullable: true }
      }
    },
    smoke_analysis: {
      type: "OBJECT",
      nullable: true,
      properties: {
        color: { type: "STRING" },
        density: { type: "STRING" },
        probable_causes: { type: "ARRAY", items: { type: "STRING" } }
      }
    },
    extracted_text: { type: "ARRAY", nullable: true, items: { type: "STRING" } },
    safety_assessment: {
      type: "OBJECT",
      nullable: true,
      properties: {
        can_drive: { type: "BOOLEAN" },
        urgency: { type: "STRING", enum: ["immediate_stop", "service_within_24h", "service_soon", "monitor", "cosmetic_only"] },
        safety_warnings: { type: "ARRAY", nullable: true, items: { type: "STRING" } },
        roadside_actions: { type: "ARRAY", nullable: true, items: { type: "STRING" } }
      },
      required: ["can_drive", "urgency"]
    },
    probable_diagnosis: {
      type: "OBJECT",
      nullable: true,
      properties: {
        primary: { type: "STRING" },
        confidence: { type: "STRING" },
        secondary_possibilities: { type: "ARRAY", nullable: true, items: { type: "STRING" } },
        recommended_next_steps: { type: "ARRAY", nullable: true, items: { type: "STRING" } }
      },
      required: ["primary", "confidence"]
    }
  },
  required: ["is_truck_related", "image_category"]
};

// Raise Vercel body-parser limit for base64-encoded media
export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── Auth ──
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // ── Rate limit ──
    const { data: limitCheck } = await getSupabase().rpc('check_ai_limit', { p_user_id: user.id });
    if (limitCheck && !limitCheck.allowed) {
      return res.status(429).json({ error: 'Daily AI request limit reached', limit: limitCheck });
    }

    // ── Parse request ──
    const { media, prompt, truck_context } = req.body;

    if (!media || !Array.isArray(media) || media.length === 0) {
      return res.status(400).json({ error: 'At least one media item required (image or video)' });
    }

    // Validate media items
    let totalSize = 0;
    for (const item of media) {
      if (!item.data || !item.mimeType) {
        return res.status(400).json({ error: 'Each media item must have data (base64) and mimeType' });
      }
      if (!ALLOWED_MIME_TYPES.has(item.mimeType)) {
        return res.status(400).json({ error: `Unsupported MIME type: ${item.mimeType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}` });
      }
      totalSize += item.data.length * 0.75; // base64 → bytes
    }

    if (totalSize > MAX_REQUEST_SIZE) {
      return res.status(413).json({ error: `Total media size exceeds ${MAX_REQUEST_SIZE / 1024 / 1024}MB limit` });
    }

    // ── Build Gemini request ──
    const userPrompt = buildUserPrompt(prompt, truck_context);

    const parts = [];
    // Add media first
    for (const item of media) {
      parts.push({
        inlineData: {
          mimeType: item.mimeType,
          data: item.data,
        },
      });
    }
    // Add text prompt
    parts.push({ text: userPrompt });

    // Prefer dedicated GEMINI_API_KEY, fall back to GOOGLE_MAPS_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Gemini API not configured. Set GEMINI_API_KEY in Vercel environment variables.' });
    }

    const geminiBody = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      // Parse Gemini error for actionable detail
      let detail = 'Vision AI service temporarily unavailable';
      try {
        const errObj = JSON.parse(errorText);
        const msg = errObj?.error?.message || '';
        if (response.status === 403 || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) {
          detail = 'Gemini API is not enabled for this API key. Enable the Generative Language API in Google Cloud Console and ensure the key has no API restrictions blocking it.';
        } else if (response.status === 400) {
          detail = `Gemini request error: ${msg || errorText.slice(0, 200)}`;
        } else if (response.status === 429) {
          detail = 'Gemini API rate limit exceeded. Please try again in a moment.';
        }
      } catch { /* not JSON */ }

      return res.status(502).json({ error: detail });
    }

    const geminiData = await response.json();

    // Extract text content from Gemini response
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      return res.status(502).json({ error: 'Empty response from Vision AI' });
    }

    let result;
    try {
      result = JSON.parse(textContent);
    } catch {
      result = { is_truck_related: true, image_category: 'unknown', raw_response: textContent };
    }

    // ── Server-side content gate enforcement ──
    if (result.is_truck_related === false || result.image_category === 'REJECTED') {
      // Don't increment usage for rejected content
      return res.status(200).json({
        rejected: true,
        reason: result.rejection_reason || 'Image does not appear to be related to truck diagnostics.',
      });
    }

    // ── Track usage ──
    try {
      await getSupabase().rpc('increment_ai_usage', { p_user_id: user.id });
    } catch (usageErr) {
      console.warn('Failed to increment AI usage:', usageErr);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildUserPrompt(prompt, truckContext) {
  let text = '';

  if (truckContext) {
    text += `TRUCK CONTEXT: ${truckContext.year || ''} ${truckContext.make || ''} ${truckContext.model || ''}`;
    if (truckContext.engine) text += `, Engine: ${truckContext.engine}`;
    if (truckContext.vin) text += `, VIN: ${truckContext.vin}`;
    text += '\n\n';
  }

  text += prompt || 'Analyze this image/video and provide a diagnostic assessment. Identify any visible issues, warning lights, leaks, damage, or wear.';

  return text;
}
