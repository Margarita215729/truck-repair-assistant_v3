/**
 * Improbability Drive — AI Interpretation Layer
 *
 * Feeds the full truck state snapshot through Gemini for
 * structured diagnostic interpretation. Named after HHGTTG
 * because predicting truck failures is almost as improbable
 * as a sperm whale materializing over Magrathea.
 *
 * Uses existing Gemini infrastructure. Returns structured
 * diagnostic response.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `You are a HEAVY-DUTY TRUCK diagnostic AI embedded in a fleet management system.

You will receive a JSON snapshot of a truck's current computer state including:
- Active fault codes (J1939 SPN/FMI, OBDII DTCs, OEM codes)
- Recently cleared fault codes (72h window)
- Recurring fault patterns
- Live vehicle signals (odometer, engine hours, coolant temp, oil pressure, etc.)
- Open inspection defects (from DVIR/pre-trip inspections)
- Event timeline

Your job:
1. INTERPRET the fault codes in context of each other (correlate related faults)
2. PRIORITIZE issues by safety and urgency
3. IDENTIFY probable root causes by cross-referencing signals with faults
4. FLAG patterns: recurring faults, signal anomalies, fault cascades
5. ASSESS whether the truck can safely continue driving
6. RECOMMEND specific next steps (not generic "see a mechanic")

IMPORTANT RULES:
- Reference specific SPN/FMI or DTC codes in your analysis
- If coolant temp is high AND there's a coolant-related fault, call that out
- If there are recurring faults (appeared, cleared, reappeared), treat as HIGH priority
- Consider signal values: coolant temp > 220°F, oil pressure < 20 PSI, DEF level < 10% are concerning
- Mention relevant TSBs or known failure patterns when applicable
- Be practical: a driver on the road needs to know "stop now" vs "safe to finish this load"
- Never invent URLs, phone numbers, or part numbers you're not sure about
- Answer in the same language as the user's message if provided

RESPOND in the JSON schema provided. Every field must be filled.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overall_assessment: {
      type: "OBJECT",
      properties: {
        severity: { type: "STRING", enum: ["critical", "warning", "monitor", "healthy"] },
        safe_to_drive: { type: "BOOLEAN" },
        summary: { type: "STRING" },
        immediate_actions: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
      },
      required: ["severity", "safe_to_drive", "summary", "immediate_actions"],
    },
    fault_analysis: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          code: { type: "STRING" },
          code_type: { type: "STRING" },
          severity: { type: "STRING" },
          system: { type: "STRING" },
          description: { type: "STRING" },
          probable_cause: { type: "STRING" },
          related_signals: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          related_faults: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          is_recurring: { type: "BOOLEAN" },
          recommended_action: { type: "STRING" },
          urgency: { type: "STRING", enum: ["immediate_stop", "service_within_24h", "service_soon", "monitor"] },
        },
        required: ["code", "code_type", "severity", "system", "description", "probable_cause", "recommended_action", "urgency"],
      },
    },
    signal_anomalies: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          signal_name: { type: "STRING" },
          current_value: { type: "STRING" },
          expected_range: { type: "STRING" },
          concern_level: { type: "STRING", enum: ["critical", "warning", "info"] },
          note: { type: "STRING" },
        },
        required: ["signal_name", "current_value", "concern_level", "note"],
      },
    },
    patterns_detected: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          pattern_type: { type: "STRING", enum: ["recurring_fault", "fault_cascade", "signal_correlation", "progressive_degradation"] },
          description: { type: "STRING" },
          affected_codes: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          risk_level: { type: "STRING", enum: ["high", "medium", "low"] },
        },
        required: ["pattern_type", "description", "risk_level"],
      },
    },
    maintenance_recommendations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          priority: { type: "INTEGER" },
          action: { type: "STRING" },
          reason: { type: "STRING" },
          estimated_urgency: { type: "STRING" },
        },
        required: ["priority", "action", "reason"],
      },
    },
  },
  required: ["overall_assessment", "fault_analysis", "signal_anomalies", "patterns_detected", "maintenance_recommendations"],
};

/**
 * Run the Improbability Drive: feed snapshot through Gemini
 * and return structured diagnostic interpretation.
 *
 * @param {Object} snapshot - Vehicle system snapshot from snapshotBuilder
 * @param {Object} [truckContext] - Optional truck make/model/year context
 * @param {string} [userLanguage] - Optional language hint (e.g. 'ru', 'en')
 * @returns {Object} Structured AI interpretation
 */
export async function interpret(snapshot, truckContext, userLanguage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Build the user prompt with all context
  const parts = [];

  if (truckContext) {
    parts.push(`TRUCK: ${truckContext.year || ''} ${truckContext.make || ''} ${truckContext.model || ''}`);
    if (truckContext.vin) parts.push(`VIN: ${truckContext.vin}`);
    if (truckContext.engine_type) parts.push(`Engine: ${truckContext.engine_type}`);
    if (truckContext.mileage) parts.push(`Mileage: ${truckContext.mileage}`);
  }

  if (userLanguage && userLanguage !== 'en') {
    parts.push(`\nPlease respond in language: ${userLanguage}`);
  }

  parts.push('\nVEHICLE STATE SNAPSHOT:');
  parts.push(JSON.stringify(snapshot, null, 2));

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: parts.join('\n') }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Improbability Drive Gemini error:', errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  try {
    return JSON.parse(text);
  } catch (parseErr) {
    console.error('Failed to parse Improbability Drive output:', text.substring(0, 500));
    throw new Error('Malformed AI response');
  }
}

/**
 * Lightweight version: just determine safe_to_drive without full analysis.
 * Used for quick status checks.
 */
export async function quickAssess(snapshot) {
  // Simple heuristic fallback if no API key
  if (!process.env.GEMINI_API_KEY) {
    const hasCritical = (snapshot.active_faults || []).some(f => f.severity === 'critical');
    const hasRecurring = (snapshot.recurring_faults || []).length > 0;
    return {
      safe_to_drive: !hasCritical,
      severity: hasCritical ? 'critical' : hasRecurring ? 'warning' : 'healthy',
      summary: hasCritical
        ? 'Critical fault codes detected — service recommended before driving.'
        : hasRecurring
          ? 'Recurring faults detected — monitor closely.'
          : 'No critical issues detected.',
    };
  }

  // Full AI assessment
  const result = await interpret(snapshot);
  return result.overall_assessment;
}
