/**
 * Snapshot Builder
 *
 * Assembles the current vehicle state from all normalized tables into a
 * single `vehicle_system_snapshots` row. This is the canonical "truck
 * computer state" that the Improbability Drive and ChatBridge consume.
 *
 * Called:
 *  - After webhook ingestion (fire-and-forget)
 *  - Before serving the truck-state-snapshot endpoint (if stale > 5 min)
 *  - After a manual syncNow()
 */
import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase config');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

const TIMELINE_WINDOW_HOURS = 72;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load the latest snapshot for a given user+vehicle.
 * Returns null if none exists.
 */
export async function loadLatestSnapshot(userId, vehicleProfileId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('vehicle_system_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('vehicle_profile_id', vehicleProfileId)
    .order('built_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('loadLatestSnapshot error:', error);
    return null;
  }
  return data;
}

/**
 * Check if a snapshot is stale (older than 5 min).
 */
export function isSnapshotStale(snapshot) {
  if (!snapshot) return true;
  const builtAt = new Date(snapshot.built_at).getTime();
  return Date.now() - builtAt > STALE_THRESHOLD_MS;
}

/**
 * Build a comprehensive snapshot from all normalized tables.
 */
export async function buildSnapshot(userId, vehicleProfileId) {
  const sb = getSupabase();
  const cutoff = new Date(Date.now() - TIMELINE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  // Parallel fetch all data sources
  const [faultsRes, signalsRes, opsRes, defectsRes, connRes] = await Promise.all([
    // Active + recent faults
    sb.from('fault_events_normalized')
      .select('*')
      .eq('user_id', userId)
      .gte('last_seen_at', cutoff)
      .order('last_seen_at', { ascending: false }),

    // Latest signal for each signal_name
    sb.from('vehicle_signal_events')
      .select('*')
      .eq('user_id', userId)
      .gte('observed_at', cutoff)
      .order('observed_at', { ascending: false }),

    // Operational events
    sb.from('vehicle_operational_events')
      .select('*')
      .eq('user_id', userId)
      .gte('observed_at', cutoff)
      .order('observed_at', { ascending: false })
      .limit(50),

    // Defects
    sb.from('vehicle_defect_events')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('reported_at', { ascending: false }),

    // Connection info
    sb.from('telematics_connections')
      .select('provider, status, last_sync_at, provider_vehicle_id')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  const faults = faultsRes.data || [];
  const allSignals = signalsRes.data || [];
  const ops = opsRes.data || [];
  const defects = defectsRes.data || [];
  const connections = connRes.data || [];

  // Deduplicate signals: keep latest per signal_name
  const signalMap = new Map();
  for (const s of allSignals) {
    if (!signalMap.has(s.signal_name)) {
      signalMap.set(s.signal_name, s);
    }
  }
  const latestSignals = Object.fromEntries(
    [...signalMap.entries()].map(([name, s]) => [name, {
      value: s.numeric_value ?? s.text_value ?? s.bool_value,
      unit: s.unit,
      observed_at: s.observed_at,
    }])
  );

  // Separate active vs cleared faults
  const activeFaults = faults.filter(f => f.status === 'active');
  const clearedFaults = faults.filter(f => f.status === 'cleared');

  // Detect recurrence: faults that appeared, were cleared, and reappeared
  const faultKeys = new Map();
  for (const f of faults) {
    const key = `${f.code_type}:${f.spn || ''}:${f.fmi || ''}:${f.dtc || ''}:${f.oem_code || ''}`;
    if (!faultKeys.has(key)) faultKeys.set(key, []);
    faultKeys.get(key).push(f);
  }
  const recurringFaults = [];
  for (const [key, instances] of faultKeys) {
    if (instances.length > 1) {
      const hasActive = instances.some(i => i.status === 'active');
      const hasCleared = instances.some(i => i.status === 'cleared');
      if (hasActive && hasCleared) {
        recurringFaults.push({
          key,
          occurrences: instances.length,
          fault: instances[0],
        });
      }
    }
  }

  // Compute summary status
  let summaryStatus = 'green';
  if (activeFaults.some(f => f.severity === 'warning')) summaryStatus = 'amber';
  if (activeFaults.some(f => f.severity === 'critical')) summaryStatus = 'red';
  if (defects.length > 0) summaryStatus = summaryStatus === 'green' ? 'amber' : summaryStatus;

  // Build timeline — last 72h of events
  const timeline = [
    ...activeFaults.map(f => ({
      type: 'fault',
      subtype: f.code_type,
      code: f.dtc || f.oem_code || `SPN${f.spn}/FMI${f.fmi}`,
      severity: f.severity,
      status: f.status,
      at: f.last_seen_at,
    })),
    ...ops.map(o => ({
      type: 'operational',
      subtype: o.event_type,
      at: o.observed_at,
    })),
    ...defects.map(d => ({
      type: 'defect',
      subtype: d.defect_type,
      severity: d.severity,
      at: d.reported_at,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 100);

  const snapshot = {
    summary_status: summaryStatus,
    active_faults: activeFaults.map(f => ({
      id: f.id,
      code_type: f.code_type,
      spn: f.spn,
      fmi: f.fmi,
      dtc: f.dtc,
      oem_code: f.oem_code,
      severity: f.severity,
      first_seen_at: f.first_seen_at,
      last_seen_at: f.last_seen_at,
    })),
    cleared_faults_72h: clearedFaults.map(f => ({
      code_type: f.code_type,
      spn: f.spn,
      fmi: f.fmi,
      dtc: f.dtc,
      severity: f.severity,
      first_seen_at: f.first_seen_at,
      last_seen_at: f.last_seen_at,
    })),
    recurring_faults: recurringFaults.map(r => ({
      key: r.key,
      occurrences: r.occurrences,
      code_type: r.fault.code_type,
      spn: r.fault.spn,
      fmi: r.fault.fmi,
      dtc: r.fault.dtc,
    })),
    current_signals: latestSignals,
    open_defects: defects.map(d => ({
      defect_type: d.defect_type,
      severity: d.severity,
      notes: d.notes,
      reported_at: d.reported_at,
    })),
    timeline,
    connections: connections.map(c => ({
      provider: c.provider,
      status: c.status,
      last_sync_at: c.last_sync_at,
      provider_vehicle_id: c.provider_vehicle_id,
    })),
    stats: {
      total_active_faults: activeFaults.length,
      total_cleared_72h: clearedFaults.length,
      total_recurring: recurringFaults.length,
      total_open_defects: defects.length,
      signal_count: signalMap.size,
    },
  };

  return snapshot;
}

/**
 * Build snapshot and persist to vehicle_system_snapshots table.
 */
export async function buildAndPersistSnapshot(userId, vehicleProfileId, connection) {
  const sb = getSupabase();
  const snapshot = await buildSnapshot(userId, vehicleProfileId);

  const row = {
    user_id: userId,
    vehicle_profile_id: vehicleProfileId,
    provider: connection?.provider || 'manual',
    provider_vehicle_id: connection?.provider_vehicle_id || null,
    summary_status: snapshot.summary_status,
    snapshot_json: snapshot,
    built_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from('vehicle_system_snapshots')
    .upsert(row, { onConflict: 'user_id,vehicle_profile_id,provider' })
    .select()
    .single();

  if (error) {
    console.error('Snapshot persist error:', error);
    throw error;
  }

  return data;
}
