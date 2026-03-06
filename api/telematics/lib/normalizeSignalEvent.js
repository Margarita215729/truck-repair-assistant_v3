/**
 * Signal Event Normalizer
 *
 * Takes a raw provider signal object (from adapter.normalizeWebhook)
 * and produces a row-ready object for `vehicle_signal_events`.
 *
 * Signal events from adapters already use canonical names thanks to
 * the per-provider mapping in each adapter. This normalizer does
 * validation and sanitization.
 */
import { CANONICAL_SIGNALS } from './providerCapabilityMatrix.js';

/**
 * Normalize a single signal event.
 * Returns null for signals with no usable value.
 */
export function normalizeSignalEvent(signal) {
  if (!signal || !signal.signal_name) return null;

  const hasValue =
    signal.numeric_value != null ||
    signal.text_value != null ||
    signal.bool_value != null;

  if (!hasValue) return null;

  const meta = CANONICAL_SIGNALS[signal.signal_name];

  return {
    provider: signal.provider,
    provider_vehicle_id: signal.provider_vehicle_id || null,
    signal_name: signal.signal_name,
    numeric_value: signal.numeric_value ?? null,
    text_value: signal.text_value ?? null,
    bool_value: signal.bool_value ?? null,
    unit: signal.unit || meta?.unit || null,
    observed_at: signal.observed_at || new Date().toISOString(),
  };
}

/**
 * Normalize a batch of signals. Drops signals with no value.
 */
export function normalizeSignalEvents(signals) {
  return (signals || []).map(normalizeSignalEvent).filter(Boolean);
}
