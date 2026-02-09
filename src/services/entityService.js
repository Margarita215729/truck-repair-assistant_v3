/**
 * Entity Service
 * Manages entities: Truck, DiagnosticReport, Conversation, KnowledgeBase,
 * ServiceReview, SolutionVote, Part, DiagnosticToolkit, RepairGuideRating
 *
 * Storage strategy:
 *   - With Supabase: Uses Supabase tables
 *   - Without Supabase: Uses localStorage as a JSON store (dev mode)
 *
 * Each entity has: create, list, filter, get, update, delete
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const STORAGE_PREFIX = 'trv3_entity_';

// ─── LocalStorage Adapter ────────────────────────────────────────────

function getLocalCollection(entityName) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + entityName);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCollection(entityName, items) {
  localStorage.setItem(STORAGE_PREFIX + entityName, JSON.stringify(items));
}

function generateId() {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Supabase table name mapping ─────────────────────────────────────

const TABLE_MAP = {
  Truck: 'trucks',
  DiagnosticReport: 'diagnostic_reports',
  Conversation: 'conversations',
  KnowledgeBase: 'knowledge_base',
  ServiceReview: 'service_reviews',
  SolutionVote: 'solution_votes',
  Part: 'parts',
  DiagnosticToolkit: 'diagnostic_toolkits',
  RepairGuideRating: 'repair_guide_ratings',
};

// ─── Generic Entity CRUD ─────────────────────────────────────────────

function createEntityAPI(entityName) {
  const tableName = TABLE_MAP[entityName] || entityName.toLowerCase() + 's';

  return {
    /**
     * Create a new record
     */
    async create(data) {
      const record = {
        ...data,
        id: generateId(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      if (hasSupabaseConfig && supabase) {
        const { data: inserted, error } = await supabase
          .from(tableName)
          .insert(record)
          .select()
          .single();
        if (error) {
          console.warn(`Supabase insert to ${tableName} failed, using local:`, error);
        } else {
          return inserted;
        }
      }

      // Local storage fallback
      const collection = getLocalCollection(entityName);
      collection.unshift(record);
      saveLocalCollection(entityName, collection);
      return record;
    },

    /**
     * List records with optional sorting
     * @param {string} sortField - e.g. '-created_date' (prefix '-' for descending)
     * @param {number} limit
     */
    async list(sortField = '-created_date', limit = 50) {
      if (hasSupabaseConfig && supabase) {
        let query = supabase.from(tableName).select('*');

        if (sortField) {
          const desc = sortField.startsWith('-');
          const field = desc ? sortField.slice(1) : sortField;
          query = query.order(field, { ascending: !desc });
        }

        query = query.limit(limit);

        const { data, error } = await query;
        if (!error && data) return data;
        console.warn(`Supabase list ${tableName} failed, using local:`, error);
      }

      // Local
      let items = getLocalCollection(entityName);
      if (sortField) {
        const desc = sortField.startsWith('-');
        const field = desc ? sortField.slice(1) : sortField;
        items.sort((a, b) => {
          const va = a[field] || '';
          const vb = b[field] || '';
          return desc ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
        });
      }
      return items.slice(0, limit);
    },

    /**
     * Filter records by field values
     */
    async filter(filterObj) {
      if (hasSupabaseConfig && supabase) {
        let query = supabase.from(tableName).select('*');
        Object.entries(filterObj).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        const { data, error } = await query;
        if (!error && data) return data;
      }

      // Local
      const items = getLocalCollection(entityName);
      return items.filter((item) =>
        Object.entries(filterObj).every(([key, value]) => item[key] === value)
      );
    },

    /**
     * Get a single record by ID
     */
    async get(id) {
      if (hasSupabaseConfig && supabase) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data;
      }

      const items = getLocalCollection(entityName);
      return items.find((item) => item.id === id) || null;
    },

    /**
     * Update a record
     */
    async update(id, updates) {
      const patchData = { ...updates, updated_date: new Date().toISOString() };

      if (hasSupabaseConfig && supabase) {
        const { data, error } = await supabase
          .from(tableName)
          .update(patchData)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      }

      // Local
      const items = getLocalCollection(entityName);
      const index = items.findIndex((item) => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...patchData };
        saveLocalCollection(entityName, items);
        return items[index];
      }
      return null;
    },

    /**
     * Delete a record
     */
    async delete(id) {
      if (hasSupabaseConfig && supabase) {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (!error) return true;
      }

      const items = getLocalCollection(entityName);
      const filtered = items.filter((item) => item.id !== id);
      saveLocalCollection(entityName, filtered);
      return true;
    },
  };
}

// ─── Entity Instances ────────────────────────────────────────────────

export const Truck = createEntityAPI('Truck');
export const DiagnosticReport = createEntityAPI('DiagnosticReport');
export const Conversation = createEntityAPI('Conversation');
export const KnowledgeBase = createEntityAPI('KnowledgeBase');
export const ServiceReview = createEntityAPI('ServiceReview');
export const SolutionVote = createEntityAPI('SolutionVote');
export const Part = createEntityAPI('Part');
export const DiagnosticToolkit = createEntityAPI('DiagnosticToolkit');
export const RepairGuideRating = createEntityAPI('RepairGuideRating');

/**
 * Convenience object for entity access
 */
export const entities = {
  Truck,
  DiagnosticReport,
  Conversation,
  KnowledgeBase,
  ServiceReview,
  SolutionVote,
  Part,
  DiagnosticToolkit,
  RepairGuideRating,
};

export default entities;
