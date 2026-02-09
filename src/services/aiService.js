/**
 * AI Service (LLM Integration)
 * Uses GitHub Models API (Grok-3) with local fallback
 */
import { env } from '@/config/env';

const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';
const DEFAULT_MODEL = 'xai/grok-3';

/**
 * Call the LLM API
 * @param {Object} options
 * @param {string} options.prompt - The prompt text
 * @param {boolean} options.add_context_from_internet - Hint for internet search
 * @param {Object} options.response_json_schema - Expected JSON schema for structured output
 * @returns {Object} Parsed response
 */
export async function invokeLLM({ prompt, response_json_schema, add_context_from_internet = false }) {
  const token = env.GITHUB_TOKEN;

  if (!token) {
    console.warn('No GitHub token configured, using local fallback');
    return generateFallbackResponse(prompt, response_json_schema);
  }

  try {
    const systemPrompt = buildSystemPrompt(response_json_schema, add_context_from_internet);

    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        model: DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 4000,
        ...(response_json_schema
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub Models API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    // Parse JSON response if schema was requested
    if (response_json_schema) {
      try {
        return JSON.parse(content);
      } catch {
        return { response: content };
      }
    }

    return { response: content };
  } catch (error) {
    console.error('LLM invocation failed:', error);
    return generateFallbackResponse(prompt, response_json_schema);
  }
}

function buildSystemPrompt(schema, useInternet) {
  let systemMsg = `You are Truck Repair Assistant AI, an expert truck mechanic with 20+ years of experience diagnosing and repairing heavy-duty commercial trucks. You specialize in all major US truck brands including Peterbilt, Kenworth, Freightliner, Volvo, Mack, International, and Western Star.`;

  if (useInternet) {
    systemMsg += `\n\nUse your training knowledge to provide the most current and accurate information possible, citing known forums like TruckersReport.com, TheTruckersPlace.com, and Reddit r/Truckers.`;
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
