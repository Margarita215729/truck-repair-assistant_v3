/**
 * Parts Service — Production (Minimal DB Cache)
 * Stores only AI recommendation metadata in Supabase.
 * All pricing and vendor data is fetched live via vendorService.
 */
import { hasSupabaseConfig } from '@/api/supabaseClient';
import { supabase } from '@/api/supabaseClient';
import { entities } from './entityService';

// ─── Category inference ──────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  engine: ['engine', 'piston', 'cylinder', 'crankshaft', 'camshaft', 'turbo', 'turbocharger', 'gasket'],
  transmission: ['transmission', 'clutch', 'gearbox', 'torque converter', 'shift'],
  brakes: ['brake', 'caliper', 'rotor', 'pad', 'drum', 'abs'],
  electrical: ['battery', 'alternator', 'starter', 'wiring', 'fuse', 'relay', 'ecu', 'ecm', 'sensor module'],
  exhaust: ['exhaust', 'dpf filter', 'dpf', 'def', 'egr', 'scr', 'catalyst', 'muffler', 'aftertreatment', 'nox'],
  fuel_system: ['fuel injector', 'fuel filter', 'fuel pump', 'fuel rail', 'fuel tank', 'fuel', 'injector'],
  cooling: ['coolant', 'radiator', 'thermostat', 'water pump', 'fan', 'heat exchanger', 'cooling'],
  suspension: ['suspension', 'shock', 'spring', 'leaf spring', 'air bag', 'bushings'],
  drivetrain: ['differential', 'axle', 'driveshaft', 'u-joint', 'wheel bearing', 'hub'],
  filters: ['air filter', 'oil filter', 'cabin filter', 'hydraulic filter', 'filter'],
  sensors: ['nox sensor', 'o2 sensor', 'temp sensor', 'speed sensor', 'pressure sensor', 'thermocouple', 'sensor'],
  body: ['mirror', 'light', 'headlight', 'tail light', 'bumper', 'hood', 'fender', 'door'],
};

// Pre-build a flat list sorted longest-keyword-first so multi-word matches win
const _KEYWORD_INDEX = Object.entries(CATEGORY_KEYWORDS)
  .flatMap(([cat, kws]) => kws.map(kw => ({ kw, cat })))
  .sort((a, b) => b.kw.length - a.kw.length);

function inferCategory(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  for (const { kw, cat } of _KEYWORD_INDEX) {
    if (text.includes(kw)) return cat;
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
    // Build server-side filter for Supabase to avoid fetching all rows
    const dbFilter = {};
    if (filters.category && filters.category !== 'all') dbFilter.category = filters.category;
    if (filters.importance && filters.importance !== 'all') dbFilter.importance = filters.importance;
    if (filters.urgency && filters.urgency !== 'all') dbFilter.urgency = filters.urgency;
    if (filters.driveability && filters.driveability !== 'all') dbFilter.driveability = filters.driveability;
    if (filters.action_type && filters.action_type !== 'all') dbFilter.action_type = filters.action_type;

    // If we have filters, use filter() to push them to Supabase; otherwise list()
    let results;
    if (Object.keys(dbFilter).length > 0) {
      results = await entities.Part.filter(dbFilter);
    } else {
      results = await entities.Part.list('-created_at', 100);
    }

    // installation_difficulty isn't indexed; filter client-side only if needed
    if (filters.difficulty && filters.difficulty !== 'all') {
      results = results.filter(p => p.installation_difficulty === filters.difficulty);
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
    const total = await entities.Part.count();
    if (!total) return { total: 0, categories: {} };

    // Fetch only the category column for aggregation (not full rows)
    let data;
    if (hasSupabaseConfig && supabase) {
      const { data: rows, error } = await supabase
        .from('parts')
        .select('category')
        .limit(500);
      data = error ? [] : rows;
    } else {
      data = await entities.Part.list('-created_at', 500);
    }

    const categories = {};
    for (const part of (data || [])) {
      categories[part.category] = (categories[part.category] || 0) + 1;
    }
    return { total, categories };
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
