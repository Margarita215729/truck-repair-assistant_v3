/**
 * Forum Search Service — Thin wrapper around researchService
 *
 * Preserves the original API for backward compatibility while routing
 * through the shared Research/Retrieval layer (authenticated, normalized,
 * with trust metadata).
 *
 * MIGRATION: All new code should import from researchService.js directly.
 */

import {
  searchForums as researchSearchForums,
  formatForumContext as researchFormatForumContext,
} from './researchService';

/**
 * Search truck repair forums. Delegates to researchService.searchForums().
 * Backward-compatible: accepts old { truckMake, truckModel, truckYear } shape
 * and maps to the new { make, model, year } shape.
 */
export async function searchForums({
  truckMake, truckModel, truckYear,
  make, model, year,
  errorCodes, symptoms, freeText, num = 5,
} = {}) {
  return researchSearchForums({
    make: make || truckMake,
    model: model || truckModel,
    year: year || truckYear,
    errorCodes,
    symptoms,
    freeText,
  }, num);
}

/**
 * Format forum results into AI prompt context.
 * Delegates to researchService.formatForumContext().
 */
export function formatForumContext(results) {
  return researchFormatForumContext(results);
}
