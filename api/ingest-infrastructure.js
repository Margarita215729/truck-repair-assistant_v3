/**
 * DOT/FMCSA Data Ingest API — Vercel Serverless Function
 * 
 * POST /api/ingest-infrastructure
 * 
 * Accepts truck parking, weigh station, and restriction data and upserts into Supabase.
 * Protected by INGEST_API_KEY header for ETL job authentication.
 * 
 * Expected body:
 * {
 *   "type": "truck_parking" | "weigh_stations" | "truck_restrictions",
 *   "records": [ ... ]
 * }
 * 
 * For parking records, also accepts:
 * {
 *   "type": "parking_occupancy_update",
 *   "updates": [{ "source_id": "...", "available_spaces": 5, "occupancy_pct": 80, "occupancy_status": "partial" }]
 * }
 */

import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

const VALID_TABLES = ['truck_parking', 'weigh_stations', 'truck_restrictions'];

// Allowed columns per table to prevent arbitrary field injection
const ALLOWED_COLUMNS = {
  truck_parking: new Set(['source_id', 'name', 'lat', 'lng', 'state', 'city', 'address', 'total_spaces', 'available_spaces', 'occupancy_pct', 'occupancy_status', 'amenities', 'source', 'source_url']),
  weigh_stations: new Set(['source_id', 'name', 'lat', 'lng', 'state', 'city', 'highway', 'direction', 'status', 'source', 'source_url']),
  truck_restrictions: new Set(['source_id', 'name', 'lat', 'lng', 'state', 'city', 'restriction_type', 'description', 'height_ft', 'weight_lbs', 'source', 'source_url']),
};

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const apiKey = req.headers['x-ingest-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey || apiKey !== process.env.INGEST_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, records, updates } = req.body;

  try {
    // Occupancy-only update (lightweight, frequent)
    if (type === 'parking_occupancy_update' && Array.isArray(updates)) {
      const results = await Promise.allSettled(
        updates.map(async (u) => {
          const { data, error } = await getSupabase()
            .from('truck_parking')
            .update({
              available_spaces: u.available_spaces,
              occupancy_pct: u.occupancy_pct,
              occupancy_status: u.occupancy_status,
              occupancy_updated_at: new Date().toISOString(),
            })
            .eq('source_id', u.source_id);
          if (error) throw error;
          return data;
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return res.status(200).json({ 
        message: `Occupancy updated: ${succeeded} succeeded, ${failed} failed`,
        total: updates.length,
      });
    }

    // Full upsert
    if (!VALID_TABLES.includes(type)) {
      return res.status(400).json({ error: `Invalid type: ${type}. Must be one of: ${VALID_TABLES.join(', ')}` });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records must be a non-empty array' });
    }

    // Upsert by source_id to avoid duplicates
    const allowedCols = ALLOWED_COLUMNS[type];
    const { data, error } = await getSupabase()
      .from(type)
      .upsert(
        records.map(r => {
          const sanitized = { updated_at: new Date().toISOString() };
          for (const [k, v] of Object.entries(r)) {
            if (allowedCols.has(k)) sanitized[k] = v;
          }
          return sanitized;
        }),
        { onConflict: 'source_id', ignoreDuplicates: false }
      );

    if (error) {
      console.error('Upsert error:', error);
      return res.status(500).json({ error: 'Database operation failed' });
    }

    return res.status(200).json({ 
      message: `Upserted ${records.length} records into ${type}`,
      count: records.length,
    });

  } catch (err) {
    console.error('Ingest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
