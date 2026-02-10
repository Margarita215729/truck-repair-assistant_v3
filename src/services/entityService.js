/**
 * Entity Service — Production
 * Manages entities via Supabase with proper user_id, UUID PKs, and no localStorage fallback for auth-required tables.
 * localStorage is ONLY used as offline cache when Supabase is unreachable.
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const STORAGE_PREFIX = 'trv3_entity_';

// ─── LocalStorage Cache (offline fallback only) ──────────────────────

function getLocalCollection(entityName) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + entityName);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCollection(entityName, items) {
  try {
    localStorage.setItem(STORAGE_PREFIX + entityName, JSON.stringify(items));
  } catch {
    // storage full or unavailable
  }
}

// ─── Get current user ID ─────────────────────────────────────────────

async function getCurrentUserId() {
  if (!hasSupabaseConfig || !supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
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

// Tables where user_id should be auto-injected
const USER_SCOPED_TABLES = new Set([
  'trucks', 'conversations', 'diagnostic_reports', 'knowledge_base',
  'service_reviews', 'solution_votes', 'diagnostic_toolkits', 'repair_guide_ratings',
]);

// ─── Generic Entity CRUD ─────────────────────────────────────────────

function createEntityAPI(entityName) {
  const tableName = TABLE_MAP[entityName] || entityName.toLowerCase() + 's';
  const isUserScoped = USER_SCOPED_TABLES.has(tableName);

  return {
    /**
     * Create a new record — lets Supabase generate UUID
     */
    async create(data) {
      if (!hasSupabaseConfig || !supabase) {
        throw new Error('Database is not configured. Please try again later.');
      }

      const userId = await getCurrentUserId();
      if (isUserScoped && !userId) {
        throw new Error('You must be logged in to perform this action.');
      }

      // Strip client-generated IDs — let DB generate UUID
      const { id: _ignoreId, created_date, updated_date, ...cleanData } = data;

      const record = {
        ...cleanData,
        ...(isUserScoped ? { user_id: userId } : {}),
      };

      const { data: inserted, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error(`Insert to ${tableName} failed:`, error);
        throw new Error(error.message || 'Failed to save data.');
      }

      return inserted;
    },

    /**
     * List records with optional sorting
     */
    async list(sortField = '-created_at', limit = 50) {
      if (!hasSupabaseConfig || !supabase) {
        return getLocalCollection(entityName);
      }

      let query = supabase.from(tableName).select('*');

      if (sortField) {
        const desc = sortField.startsWith('-');
        const field = desc ? sortField.slice(1) : sortField;
        query = query.order(field, { ascending: !desc });
      }

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        console.warn(`List ${tableName} failed:`, error);
        return getLocalCollection(entityName);
      }

      // Cache for offline use
      saveLocalCollection(entityName, data);
      return data;
    },

    /**
     * Filter records by field values
     */
    async filter(filterObj) {
      if (!hasSupabaseConfig || !supabase) {
        const items = getLocalCollection(entityName);
        return items.filter((item) =>
          Object.entries(filterObj).every(([key, value]) => item[key] === value)
        );
      }

      let query = supabase.from(tableName).select('*');
      Object.entries(filterObj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;
      if (error) {
        console.warn(`Filter ${tableName} failed:`, error);
        return [];
      }
      return data;
    },

    /**
     * Get a single record by ID
     */
    async get(id) {
      if (!hasSupabaseConfig || !supabase) {
        const items = getLocalCollection(entityName);
        return items.find((item) => item.id === id) || null;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.warn(`Get ${tableName} failed:`, error);
        return null;
      }
      return data;
    },

    /**
     * Update a record
     */
    async update(id, updates) {
      if (!hasSupabaseConfig || !supabase) {
        throw new Error('Database is not configured.');
      }

      // Remove fields that shouldn't be updated directly
      const { id: _id, user_id: _uid, created_at, ...cleanUpdates } = updates;

      const { data, error } = await supabase
        .from(tableName)
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Update ${tableName} failed:`, error);
        throw new Error(error.message || 'Failed to update data.');
      }
      return data;
    },

    /**
     * Delete a record
     */
    async delete(id) {
      if (!hasSupabaseConfig || !supabase) {
        throw new Error('Database is not configured.');
      }

      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) {
        console.error(`Delete ${tableName} failed:`, error);
        throw new Error(error.message || 'Failed to delete data.');
      }
      return true;
    },

    /**
     * Count records (useful for limit checks)
     */
    async count(filterObj = {}) {
      if (!hasSupabaseConfig || !supabase) return 0;

      let query = supabase.from(tableName).select('id', { count: 'exact', head: true });
      Object.entries(filterObj).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query;
      if (error) return 0;
      return count || 0;
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
