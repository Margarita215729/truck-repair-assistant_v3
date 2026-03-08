/**
 * Parts Service — Production (Minimal DB Cache)
 * Stores only AI recommendation metadata in Supabase.
 * All pricing and vendor data is fetched live via vendorService.
 */
import { hasSupabaseConfig } from '@/api/supabaseClient';
import { entities } from './entityService';

// ─── Category inference ──────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  engine: ['engine', 'piston', 'cylinder', 'crankshaft', 'camshaft', 'turbo', 'turbocharger', 'injector', 'gasket', 'valve'],
  transmission: ['transmission', 'clutch', 'gearbox', 'torque converter', 'shift'],
  brakes: ['brake', 'caliper', 'rotor', 'pad', 'drum', 'abs'],
  electrical: ['battery', 'alternator', 'starter', 'wiring', 'fuse', 'relay', 'ecu', 'ecm', 'sensor module'],
  exhaust: ['exhaust', 'dpf', 'def', 'egr', 'scr', 'catalyst', 'muffler', 'aftertreatment', 'nox'],
  fuel_system: ['fuel', 'injector', 'pump', 'rail', 'tank', 'filter fuel', 'fuel filter'],
  cooling: ['coolant', 'radiator', 'thermostat', 'water pump', 'fan', 'heat exchanger', 'cooling'],
  suspension: ['suspension', 'shock', 'spring', 'leaf spring', 'air bag', 'bushings'],
  drivetrain: ['differential', 'axle', 'driveshaft', 'u-joint', 'wheel bearing', 'hub'],
  filters: ['filter', 'air filter', 'oil filter', 'cabin filter', 'hydraulic filter'],
  sensors: ['sensor', 'thermocouple', 'pressure sensor', 'speed sensor', 'temp sensor', 'o2 sensor', 'nox sensor'],
  body: ['mirror', 'light', 'headlight', 'tail light', 'bumper', 'hood', 'fender', 'door'],
};

function inferCategory(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return category;
  }
  return 'other';
}

// ─── Save AI-suggested parts as recommendations (no prices) ──────────

/**
 * Saves AI-recommended parts to the user's catalog.
 * Only metadata is stored — prices are always fetched live from vendors.
 */
export async function saveAIPartRecommendations(suggestedParts, truckContext = {}, errorCodes = []) {
  if (!suggestedParts?.length || !hasSupabaseConfig) return [];

  const results = [];

  for (const part of suggestedParts) {
    try {
      const partName = (part.name || '').trim();
      if (!partName) continue;

      const partNumber = (part.oem_part_number || part.part_number || '').trim().toUpperCase();

      // Check for duplicate by part_number (if we have one)
      if (partNumber) {
        const existing = await entities.Part.filter({ part_number: partNumber });
        if (existing?.length > 0) {
          // Merge error codes if new
          const current = existing[0];
          const currentCodes = current.related_error_codes || [];
          const newCodes = errorCodes.filter(c => !currentCodes.includes(c));
          if (newCodes.length > 0) {
            try {
              await entities.Part.update(current.id, {
                related_error_codes: [...currentCodes, ...newCodes].slice(0, 20),
              });
            } catch { /* RLS might block */ }
          }
          results.push(current);
          continue;
        }
      }

      const record = {
        name: partName,
        part_number: partNumber || `AI-${Date.now()}-${results.length}`,
        description: part.description || part.why_needed || '',
        category: inferCategory(partName, part.description || ''),
        why_needed: part.why_needed || '',
        importance: part.importance || 'recommended',
        installation_difficulty: part.installation_difficulty || 'moderate',
        installation_notes: part.installation_notes || '',
        compatible_makes: truckContext.make ? [truckContext.make] : [],
        truck_context: truckContext,
        related_error_codes: errorCodes.length > 0 ? errorCodes.slice(0, 10) : [],
        source: 'ai_diagnostic',
        // Decision fields (new)
        oem_part_number: (part.oem_part_number || '').trim().toUpperCase() || null,
        alt_part_numbers: part.alt_part_numbers || [],
        root_cause_confidence: part.root_cause_confidence || null,
        urgency: part.urgency || null,
        driveability: part.driveability || null,
        action_type: part.action_type || null,
        roadside_possible: part.roadside_possible ?? null,
        shop_required: part.shop_required ?? null,
        programming_required: part.programming_required ?? null,
        inspection_steps: part.inspection_steps || [],
        pair_with_parts: part.pair_with_parts || [],
        bundle_label: part.bundle_label || null,
        fitment_status: part.fitment_status || null,
      };

      const saved = await entities.Part.create(record);
      if (saved) results.push(saved);
    } catch (err) {
      console.warn('Failed to save part recommendation:', part.name, err);
    }
  }

  return results;
}

// ─── Get user's recommended parts ────────────────────────────────────

/**
 * Fetches the current user's AI-recommended parts from DB.
 * These are the minimal metadata records — no prices.
 */
export async function getMyRecommendedParts(filters = {}) {
  try {
    // Use entityService which auto-scopes by user_id via RLS
    let results = await entities.Part.list('-created_at', 100);

    if (filters.category && filters.category !== 'all') {
      results = results.filter(p => p.category === filters.category);
    }
    if (filters.importance && filters.importance !== 'all') {
      results = results.filter(p => p.importance === filters.importance);
    }
    if (filters.difficulty && filters.difficulty !== 'all') {
      results = results.filter(p => p.installation_difficulty === filters.difficulty);
    }
    if (filters.urgency && filters.urgency !== 'all') {
      results = results.filter(p => p.urgency === filters.urgency);
    }
    if (filters.driveability && filters.driveability !== 'all') {
      results = results.filter(p => p.driveability === filters.driveability);
    }
    if (filters.action_type && filters.action_type !== 'all') {
      results = results.filter(p => p.action_type === filters.action_type);
    }

    return results;
  } catch (error) {
    console.warn('Failed to fetch recommended parts:', error);
    return [];
  }
}

// ─── Delete a recommendation ─────────────────────────────────────────

export async function deleteRecommendation(id) {
  return entities.Part.delete(id);
}

// ─── Get stats for recommended parts ─────────────────────────────────

export async function getRecommendedStats() {
  try {
    // Use entityService which auto-scopes by user_id via RLS
    const data = await entities.Part.list('-created_at', 500);
    if (!data?.length) return { total: 0, categories: {} };

    const categories = {};
    for (const part of data) {
      categories[part.category] = (categories[part.category] || 0) + 1;
    }
    return { total: data.length, categories };
  } catch {
    return { total: 0, categories: {} };
  }
}

export default {
  saveAIPartRecommendations,
  getMyRecommendedParts,
  deleteRecommendation,
  getRecommendedStats,
};
