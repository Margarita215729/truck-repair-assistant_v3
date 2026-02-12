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
  TruckParking: 'truck_parking',
  WeighStation: 'weigh_stations',
  TruckRestriction: 'truck_restrictions',
};

// Tables where user_id should be auto-injected
const USER_SCOPED_TABLES = new Set([
  'trucks', 'conversations', 'diagnostic_reports', 'knowledge_base',
  'service_reviews', 'solution_votes', 'diagnostic_toolkits', 'repair_guide_ratings',
  'parts',
]);

// ─── Field mapping: app field name → DB column name ──────────────────
// The app uses `make` everywhere, but the DB column is `manufacturer`.
const FIELD_MAP = {
  trucks: { make: 'manufacturer' },
};

// ─── Composite transforms for complex field mappings ─────────────────
// Currently no composite transforms needed (parts pricing is now live from vendors)
const TRANSFORM_TO_DB = {};
const TRANSFORM_FROM_DB = {};

/** Convert app-side object → DB-side object (e.g. make → manufacturer) */
function toDbFields(tableName, data) {
  let converted = { ...data };
  // Apply composite transforms first
  if (TRANSFORM_TO_DB[tableName]) {
    converted = TRANSFORM_TO_DB[tableName](converted);
  }
  // Then simple 1:1 field renames
  const map = FIELD_MAP[tableName];
  if (map) {
    for (const [appField, dbField] of Object.entries(map)) {
      if (appField in converted) {
        converted[dbField] = converted[appField];
        delete converted[appField];
      }
    }
  }
  return converted;
}

/** Convert DB-side object → app-side object (e.g. manufacturer → make) */
function fromDbFields(tableName, row) {
  if (!row) return row;
  let converted = { ...row };
  // Simple 1:1 renames first
  const map = FIELD_MAP[tableName];
  if (map) {
    for (const [appField, dbField] of Object.entries(map)) {
      if (dbField in converted) {
        converted[appField] = converted[dbField];
        delete converted[dbField];
      }
    }
  }
  // Then composite transforms
  if (TRANSFORM_FROM_DB[tableName]) {
    converted = TRANSFORM_FROM_DB[tableName](converted);
  }
  return converted;
}

/** Convert an array of DB rows → app-side objects */
function fromDbFieldsArray(tableName, rows) {
  const map = FIELD_MAP[tableName];
  if (!map || !rows) return rows;
  return rows.map((row) => fromDbFields(tableName, row));
}

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

      const record = toDbFields(tableName, {
        ...cleanData,
        ...(isUserScoped ? { user_id: userId } : {}),
      });

      const { data: inserted, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error(`Insert to ${tableName} failed:`, error);
        throw new Error(error.message || 'Failed to save data.');
      }

      return fromDbFields(tableName, inserted);
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

      const mapped = fromDbFieldsArray(tableName, data);
      // Cache for offline use
      saveLocalCollection(entityName, mapped);
      return mapped;
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

      const dbFilter = toDbFields(tableName, filterObj);
      let query = supabase.from(tableName).select('*');
      Object.entries(dbFilter).forEach(([key, value]) => {
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
      return fromDbFieldsArray(tableName, data);
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
      return fromDbFields(tableName, data);
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

      const dbUpdates = toDbFields(tableName, cleanUpdates);
      const { data, error } = await supabase
        .from(tableName)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Update ${tableName} failed:`, error);
        throw new Error(error.message || 'Failed to update data.');
      }
      return fromDbFields(tableName, data);
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

      const dbFilter = toDbFields(tableName, filterObj);
      let query = supabase.from(tableName).select('id', { count: 'exact', head: true });
      Object.entries(dbFilter).forEach(([key, value]) => {
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
export const TruckParking = createEntityAPI('TruckParking');
export const WeighStation = createEntityAPI('WeighStation');
export const TruckRestriction = createEntityAPI('TruckRestriction');

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
  TruckParking,
  WeighStation,
  TruckRestriction,
};

export default entities;
